# Cloudiest Blog

AIKSXD 的个人站：一个**零框架、零依赖、克隆下来双击就能跑**的单页博客。
没有 npm install、没有打包器、没有 CDN、没有 Web 字体——`index.html` 里的每一条 `src` 都指向本仓库自己的文件。

在线地址：<https://aiksxd.github.io/Cloudiest-Blog/>

---

## 目录结构

| 路径 | 是什么 | 能不能手改 |
|---|---|---|
| `index.html` | 首页骨架 + 18 个内联 svg symbol + **10 张文章卡片**（卡片就是文章的数据源） | 改卡片当然要手改 |
| `posts/*.md` | 文章正文与元信息，`post-N.en.md` 是可选英文版 | 文章内容只改这里 |
| `js/posts.data.js` | md 的编译产物（`html` / `htmlEn`） | **不能手改**，跑编译器 |
| `js/blog.js` | 交互主脚本：视差、卡片全屏、时间线、卡片堆分页、开场序列 | 改 |
| `js/reader.js` | 阅读页：注入正文、从 DOM 反推目录、目录跳转与跟随高亮 | 改 |
| `js/scroll-rail.js` | 视口右缘的自绘滚动条 | 改 |
| `css/index.css` | 样式入口，只做 `@import`，顺序即层叠顺序 | 改（新增层要同步 `tools/build.mjs`） |
| `css/base.css` | 设计令牌（48 个自定义属性）+ 基础排版 | 改 |
| `css/motion.css` | 全部常驻动画的唯一出口（含 `steps()` 降采样档位） | 改 |
| `tools/md2html.mjs` | 零依赖 Markdown 编译器 | 改 |
| `tools/build.mjs` | 把 `?v=` 缓存戳写成内容哈希 | 改（一般不用动） |
| `apps/<id>/index.html` | 作品集，各自独立的旧站页面 | 隔离，不影响主站 |
| `others/` | 备份 / legacy 素材 / 试验品，**会被 Pages 一并发布** | 建议别放新东西进来 |
| `docs/` | 设计文档：动效规范、性能排查、阅读页与 md 编译 | 改 |

---

## 发一篇新文章

1. 写 `posts/post-N.md`，开头是 frontmatter：

   ```markdown
   ---
   title: 标题
   date: 2026-11-14
   tags: [CSS, 视差]
   summary: 一句话摘要
   ---
   ```

2. 需要英文版就在同目录放 `post-N.en.md`（`title` 换成英文）。**不要**另起一个 `post-M`，中英两版共用一张卡片。

3. 在 `index.html` 的 `#cardStack` 里加一张卡片。**三个 id 必须一致**：

   - `posts/post-N.md` 的文件名
   - 卡片的 `id="post-N"`
   - `window.AX_POSTS` 的键（编译器生成，自动一致）

   卡片的 `data-tags` 是**检索用关键词表**（可以比可见标签多几个同义词），`data-date` / `data-accent` / 缩略图 / 摘要都要填。

4. 跑编译器与缓存戳，**顺序不能反**：

   ```bash
   node tools/md2html.mjs   # md → js/posts.data.js
   node tools/build.mjs     # 按新内容重写 ?v=
   ```

5. 双击 `index.html` 验证。`file://` 直开必须可用——这是硬需求，任何依赖 fetch 或 ES module 的写法都会在这里失败。

---

## 校验

```bash
node tools/md2html.mjs --check          # 产物是否落后于 md
node tools/md2html.mjs --check-cards    # 卡片的日期/标题/时长是否与 md 一致
node tools/build.mjs --check            # 缓存戳是否与内容一致
node tools/md2html.mjs --dump post-1        # 单篇 html 打到 stdout
node tools/md2html.mjs --dump post-1 --en   # 英文版
```

三条 `--check` 都接在 `.github/workflows/check.yml` 里（推到 GitHub 后生效；本地仓库当前无 remote）。

`--check-cards` 是防漂移的：卡片的 `title` / `data-date` / `time[datetime]` / `N min` 与 `posts.data.js` 逐一比对，还会抓到「有 md 没卡片」「有卡片没 md」两种缺漏。摘要不参与比对——卡片摘要和 frontmatter 的 `summary` 本来就是两段不同的话。

---

## 不可违反的约定

这几条不是风格偏好，是踩过坑之后定下来的，改动前先读 `docs/` 对应章节：

1. **动画常驻，不做系统降级。** 禁止 `@media (prefers-reduced-motion)`、禁止 `animation: none / paused`、禁止 JS 里 `matchMedia('(prefers-reduced-motion...)')`。开发机本身开了"减少动画"，一旦加降级，星点/云海/银河/日月会整片消失。见 `docs/性能排查-常驻动画与GPU占用.md`。
2. **滚动条位置由自己插值，不用 `scroll-behavior: smooth`。** 原生平滑在 reduce 下会被降级成逐档瞬跳。见 `docs/动效规范.md`。
3. **新增任何 60fps 常驻动画都会吃光省下的 GPU。** 常驻成本是全有全无的；新动画必须写进 `motion.css` 并带 `steps()` 降采样。
4. **卡片是唯一文案源。** 时间线、悬停预览、翻页都从卡片 DOM 现取，所以卡片写错一个属性，右侧那一栏跟着错。
5. **md 正文里不写 HTML。** 编译器一律转义；需要新语法就去 `md2html.mjs` 里加，不要在 md 里塞 `<script>`。
6. **新增静态资源要登记进 `tools/build.mjs`**，否则它没有缓存戳，改了不生效。

---

## 性能基线

静止 59.7~60.3 fps / 滚动 52.9~53.6 fps（底部 GPU 19.7%、顶部 22.5%、日间首屏 13.1%）。
手段与回滚点见 `docs/性能排查-常驻动画与GPU占用.md` 与 `MEMORY.md`。
