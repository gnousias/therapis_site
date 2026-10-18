/* Renders the article cards on /blog/ from /blog/posts.json (newest first) */
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;
    const lang = () => localStorage.getItem('selectedLanguage') || 'en';
    // escape text for HTML; the data-* attributes get it twice because applyLanguage() writes them back with innerHTML
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = (d, l) => new Date(d).toLocaleDateString(l === 'el' ? 'el-GR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    let posts = [];
    try { posts = await (await fetch('/blog/posts.json')).json(); } catch (e) { console.error(e); }
    posts.sort((a, b) => b.date.localeCompare(a.date));

    if (!posts.length) {
        grid.innerHTML = '<p class="blog-empty" data-en="Our first articles are coming soon." data-el="Τα πρώτα μας άρθρα έρχονται σύντομα.">Our first articles are coming soon.</p>';
    } else {
        grid.innerHTML = posts.map(p => `
            <a class="blog-card" href="/blog/${esc(p.slug)}.html">
                <img src="${esc(p.image || '/blog/images/default.svg')}" alt="" loading="lazy">
                <div class="blog-card-body">
                    <span class="blog-meta" data-date="${p.date}">${fmt(p.date, lang())}</span>
                    <h3 data-en="${esc(esc(p.title_en))}" data-el="${esc(esc(p.title_el))}">${esc(p.title_en)}</h3>
                    <p data-en="${esc(esc(p.summary_en))}" data-el="${esc(esc(p.summary_el))}">${esc(p.summary_en)}</p>
                    <span class="blog-readmore" data-en="Read more →" data-el="Διαβάστε περισσότερα →">Read more →</span>
                </div>
            </a>`).join('');
    }
    if (typeof applyLanguage === 'function') applyLanguage(lang());
    // applyLanguage() does not touch dates, so re-format them on language toggle
    document.querySelector('.lang-toggle')?.addEventListener('click', () =>
        document.querySelectorAll('[data-date]').forEach(el => el.textContent = fmt(el.dataset.date, lang())));
});
