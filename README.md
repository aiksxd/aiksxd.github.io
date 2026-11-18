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
| `css/index.css` | Style layers entry (source) |
| `css/base.css` | Coustome properties |
| `css/motion.css` | All cartoon |
| `assets/site.css` | Built single stylesheet |
| `assets/site.js` | Built single script |
| `tools/md2html.mjs` | md build to html |
| `tools/minify.mjs` | rebuild assets/site.css + site.js |
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
   npm install --no-save terser@5 clean-css@5   # 仅构建时需要
   node tools/minify.mjs    # css/ + js/ → assets/site.css / site.js
   node tools/build.mjs     # rewrite newcontent by ?v=
   ```

   首屏只下载 `assets/site.css`（gzip ~12KB）与 `assets/site.js`（gzip ~19KB）；
   `js/posts.data.js` / highlight 在首次打开文章时才加载。源码仍按层/按文件维护。

---

## Deep link

`?post=` 打开指定文章，支持四种写法：

- id：`?post=post-11`、`?post=11`
- 中文标题：`?post=这个博客的骨架`（也可只写 `?post=骨架`）
- 英文标题：`?post=P2P%20Live%20Web`
- 别名参数：`?article=`、`?p=`

标题匹配忽略大小写、空格与标点；写成多篇文章共有的词（例如「直播」）时不会瞎猜。
页面加载完会先播完开场，再自动滚到文章区与卡片堆（视差 / 流星线动画照常播放），最后全屏展开目标文章。
与 `#post-11` 的区别：锚点只滚到卡片，深链会连阅读页一起打开。

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
