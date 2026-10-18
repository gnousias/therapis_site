# Publishing a new article (about 10 minutes)

1. **Copy** `blog/_template.html` to `blog/<slug>.html`
   The slug is the URL: `back-pain-causes.html` -> `physiotherapis.gr/blog/back-pain-causes`
   (lowercase, hyphens, no accents).
2. **Images**: put the hero image in `blog/images/<slug>.jpg` (about 1600px wide, under 300 KB).
3. **Edit the article**: search for `EDIT` / `YOUR-SLUG` in the new file. Update the title, description,
   date, and write each paragraph twice (`data-en` and `data-el`).
4. **Add one entry** at the top of `blog/posts.json` (this creates the card on /blog/):
   ```json
   {
     "slug": "back-pain-causes",
     "date": "2026-12-15",
     "image": "/blog/images/back-pain-causes.jpg",
     "title_en": "...", "title_el": "...",
     "summary_en": "One or two sentences.", "summary_el": "..."
   }
   ```
   Entries are separated by commas; the list is sorted by date automatically.
5. **Add to `sitemap.xml`**:
   ```xml
   <url><loc>https://www.physiotherapis.gr/blog/back-pain-causes</loc><lastmod>2026-12-15</lastmod><priority>0.6</priority></url>
   ```
6. **Preview locally**, then publish:
   `npx serve .` (open /blog/), then `git add . && git commit -m "New article: ..." && git push`.
   Vercel deploys automatically after the push.

Tip: don't use double quotes inside `data-en` / `data-el` text; use single quotes or typographic quotes.

---

# Online admin (recommended way to publish)

Open `https://www.physiotherapis.gr/admin`, log in, fill the form, click **Publish**.
It commits the article page, image, `posts.json` entry and `sitemap.xml` entry to GitHub in one commit; Vercel redeploys automatically.

## One-time setup
1. GitHub > Settings > Developer settings > Fine-grained tokens > Generate new token.
   Repository access: **only this repo**. Permissions: **Contents = Read and write**. Copy the token.
2. Vercel > your project > Settings > Environment Variables (Production), add:
   - `ADMIN_PASSWORD` - a long, unique password
   - `GITHUB_TOKEN` - the token from step 1
   - `GITHUB_REPO` - `your-github-user/your-repo-name`
   - `GITHUB_BRANCH` - only if your branch is not `main`
3. Redeploy (Deployments > ... > Redeploy) so the variables take effect.

## Notes
- Do not commit the token or password to the repo; they live only in Vercel.
- To undo a published article: GitHub > Commits > the "New blog article" commit > Revert.
- The admin builds pages from `api/_article.js`, which holds a copy of the site header, footer and signature.
  If you change the header/footer of the site, update those constants there too.
- Editing an existing article is done by hand (the file in `blog/` and its `posts.json` entry).
