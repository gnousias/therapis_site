// POST /api/publish - password-protected. Creates a blog article and commits it to GitHub
// (article page, hero image, posts.json entry, sitemap.xml entry) in ONE commit; Vercel then redeploys.
//
// Environment variables (Vercel > Project > Settings > Environment Variables):
//   ADMIN_PASSWORD  password for the admin page
//   GITHUB_TOKEN    fine-grained token: this repo only, permission "Contents: Read and write"
//   GITHUB_REPO     e.g. "yourname/therapis"
//   GITHUB_BRANCH   optional, defaults to "main"
//   DRY_RUN         optional, "1" = validate and return the generated files without committing
const crypto = require('crypto');
const { renderArticle } = require('./_article');

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const fails = new Map(); // ip -> { n, until }  (best-effort, per server instance)

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const sameSecret = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const clean = (s, max) => String(s == null ? '' : s).replace(/\r/g, '').trim().slice(0, max);

function validate(body) {
    const a = {
        slug: clean(body.slug, 80).toLowerCase(),
        date: clean(body.date, 10),
        title_en: clean(body.title_en, 160), title_el: clean(body.title_el, 160),
        summary_en: clean(body.summary_en, 400), summary_el: clean(body.summary_el, 400),
        signature: ['marilena', 'chrysostomos'].includes(body.signature) ? body.signature : 'none',
        blocks: Array.isArray(body.blocks) ? body.blocks.slice(0, 80).map(b => ({
            type: ['p', 'h2', 'h3', 'list', 'tip'].includes(b.type) ? b.type : 'p',
            en: clean(b.en, 6000), el: clean(b.el, 6000)
        })).filter(b => b.en || b.el) : []
    };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) throw new Error('Slug must be lowercase letters, numbers and hyphens (e.g. back-pain-causes).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date) || isNaN(Date.parse(a.date))) throw new Error('Invalid date.');
    for (const k of ['title_en', 'title_el', 'summary_en', 'summary_el']) if (!a[k]) throw new Error('Missing field: ' + k);
    if (!a.blocks.length) throw new Error('The article has no content.');
    if (a.blocks.some(b => !b.en || !b.el)) throw new Error('Every content block needs both English and Greek text.');
    return a;
}

async function gh(path, opts) {
    opts = opts || {};
    const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPO + path, {
        ...opts,
        headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'therapis-admin' }
    });
    if (!r.ok) throw new Error('GitHub ' + r.status + ' on ' + path + ': ' + (await r.text()).slice(0, 200));
    return r.json();
}
const ghText = async (path, branch) => {
    const j = await gh('/contents/' + path + '?ref=' + branch);
    return Buffer.from(j.content, 'base64').toString('utf8');
};

const branchName = () => process.env.GITHUB_BRANCH || 'main';

// posts.json + sitemap.xml: from GitHub, or from the local files when DRY_RUN=1 (for testing)
async function loadState(branch, dry) {
    if (dry) {
        const fs = require('fs'), path = require('path');
        const root = path.join(__dirname, '..');
        return { posts: JSON.parse(fs.readFileSync(path.join(root, 'blog/posts.json'), 'utf8')), sitemap: fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') };
    }
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) throw new Error('GITHUB_TOKEN / GITHUB_REPO are not configured on the server.');
    return { posts: JSON.parse(await ghText('blog/posts.json', branch)), sitemap: await ghText('sitemap.xml', branch) };
}

const exists = async (path, branch) => { try { await gh('/contents/' + path + '?ref=' + branch); return true; } catch (e) { return false; } };

// one commit: write `files` ({path: {content, encoding}}) and remove `removals` (paths)
async function commitFiles(branch, files, removals, message) {
    const ref = await gh('/git/ref/heads/' + branch);
    const baseCommit = await gh('/git/commits/' + ref.object.sha);
    const tree = [];
    for (const path of Object.keys(files)) {
        const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify(files[path]) });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of removals) tree.push({ path, mode: '100644', type: 'blob', sha: null });
    const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }) });
    const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
    await gh('/git/refs/heads/' + branch, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    return commit.sha;
}

// removes an article: its page, its own image, the posts.json entry and the sitemap entry (one commit)
async function deleteArticle(slug) {
    if (!/^[a-z0-9_]+([-_][a-z0-9]+)*$/.test(slug) || slug.startsWith('_') || slug === 'index') throw new Error('Invalid article.');
    const branch = branchName(), dry = process.env.DRY_RUN === '1';
    const { posts, sitemap } = await loadState(branch, dry);
    const entry = posts.find(p => p.slug === slug);
    if (!entry) throw new Error('Article "' + slug + '" is not in the list.');

    const removals = ['blog/' + slug + '.html'];
    const own = 'blog/images/' + slug + '.jpg';
    if (entry.image && entry.image.replace(/^\//, '') === own) removals.push(own); // never touch shared images
    const present = dry ? removals : (await Promise.all(removals.map(async p => (await exists(p, branch)) ? p : null))).filter(Boolean);

    const loc = 'https://www.physiotherapis.gr/blog/' + slug + '.html';
    const newSitemap = sitemap.replace(new RegExp('[ \\t]*<url>\\s*<loc>' + loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</loc>[\\s\\S]*?</url>\\s*', 'g'), '');
    const files = {
        'blog/posts.json': { content: JSON.stringify(posts.filter(p => p.slug !== slug), null, 2) + '\n', encoding: 'utf-8' },
        'sitemap.xml': { content: newSitemap, encoding: 'utf-8' }
    };
    if (dry) return { ok: true, dryRun: true, removed: present, remaining: posts.length - 1, sitemapChanged: newSitemap !== sitemap };
    await commitFiles(branch, files, present, 'Remove blog article: ' + entry.title_en);
    return { ok: true, removed: present };
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
    const f = fails.get(ip);
    if (f && f.n >= 5 && Date.now() < f.until) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
    if (!sameSecret(req.headers['x-admin-password'] || '', process.env.ADMIN_PASSWORD)) {
        fails.set(ip, { n: (f && Date.now() < f.until ? f.n : 0) + 1, until: Date.now() + 15 * 60 * 1000 });
        await new Promise(r => setTimeout(r, 800));
        return res.status(401).json({ error: 'Wrong password.' });
    }
    fails.delete(ip);

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        if (body.check) return res.status(200).json({ ok: true }); // login check only
        if (body.action === 'delete') return res.status(200).json(await deleteArticle(clean(body.slug, 80)));
        const a = validate(body);

        // the image is optional; without one the article uses the plain green hero and a default card picture
        let imgBuf = null;
        if (body.image) {
            const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.image);
            if (!m) throw new Error('The image must be a JPEG.');
            imgBuf = Buffer.from(m[1], 'base64');
            if (imgBuf.length > MAX_IMAGE_BYTES) throw new Error('Image is too large (max 3 MB).');
        }
        a.hasImage = !!imgBuf;

        const branch = process.env.GITHUB_BRANCH || 'main';
        const dry = process.env.DRY_RUN === '1';
        const { posts, sitemap: sm } = await loadState(branch, dry);
        let sitemap = sm;
        if (posts.some(p => p.slug === a.slug)) throw new Error('An article with slug "' + a.slug + '" already exists. Choose a different slug.');

        posts.unshift({ slug: a.slug, date: a.date, image: imgBuf ? '/blog/images/' + a.slug + '.jpg' : '', title_en: a.title_en, title_el: a.title_el, summary_en: a.summary_en, summary_el: a.summary_el });
        const loc = 'https://www.physiotherapis.gr/blog/' + a.slug + '.html';
        if (!sitemap.includes('<loc>' + loc + '</loc>')) {
            sitemap = sitemap.replace('</urlset>', '  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + a.date + '</lastmod>\n    <priority>0.6</priority>\n  </url>\n\n</urlset>');
        }
        const html = renderArticle(a);
        const files = {};
        files['blog/' + a.slug + '.html'] = { content: html, encoding: 'utf-8' };
        if (imgBuf) files['blog/images/' + a.slug + '.jpg'] = { content: imgBuf.toString('base64'), encoding: 'base64' };
        files['blog/posts.json'] = { content: JSON.stringify(posts, null, 2) + '\n', encoding: 'utf-8' };
        files['sitemap.xml'] = { content: sitemap, encoding: 'utf-8' };
        if (dry) return res.status(200).json({ ok: true, dryRun: true, files: Object.keys(files), html, posts });

        const commit = await commitFiles(branch, files, [], 'New blog article: ' + a.title_en);
        return res.status(200).json({ ok: true, url: '/blog/' + a.slug, commit });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
};
