Online web：<https://aiksxd.github.io/>
---

## Project structure

| Path | Role |
|---|---|---|
| `index.html` | Index |
| `posts/*.md` | Passage，`post-N.en.md`(en) |
| `js/posts.data.js` | md2html target |
| `js/blog.js` | Intract |
| `js/reader.js` | Passage reader |
| `js/scroll-rail.js` | Scorll bar |
| `css/index.css` | Style |
| `css/base.css` | Coustome properties |
| `css/motion.css` | All cartoon |
| `tools/md2html.mjs` | md build to html |
| `tools/build.mjs` | build cache to hash |
| `apps/<id>/index.html` | Web app projects |

---

## Post new one

1. `posts/post-N.md`, frontmatter at first：

   ```markdown
   ---
   title: Hello World
   date: 2026-11-14
   tags: [CSS]
   summary: Welcome to my blog
   ---
   ```

2. Other Language like `post-N.en.md`(add shortcut of language)

3. add a new card in`#cardStack` in `index.html`

   - `posts/post-N.md`
   - `id="post-N"`
   - key of`window.AX_POSTS`

4. build：

   ```bash
   node tools/md2html.mjs   # md → js/posts.data.js
   node tools/build.mjs     # rewrite newcontent by ?v=
   ```

---

## check

```bash
node tools/md2html.mjs --check          # is outdate
node tools/md2html.mjs --check-cards    # is data/title/time same
node tools/build.mjs --check            # is hash of cache same
node tools/md2html.mjs --dump post-1        # single html to stdout
node tools/md2html.mjs --dump post-1 --en   # en
```
---
