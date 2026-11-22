#!/usr/bin/env node
/* book.mjs —— 「一个目录 = 一本书」→ 一页一文件的静态 html
   ==========================================================
   要解决的不是「md 转 html」（那是 md2html.mjs 的活，这里直接复用它的 compile），
   而是**书籍形态不统一时怎么把顺序定下来**：
     · 廖雪峰那套：book.yml + 编号目录 + 每节目录里一个 README.md
     · 平铺式：一个目录下 01.md / 02.md，没有子目录
     · 单文件式：一个 book.md 里靠 # / ## 切章
     · 完全不编号：intro.md / setup.md / deploy.md，靠字母序

   通用方案：**能表达顺序的信号按优先级降级，降到最后也一定有个确定结果**
     ① book.yml 里的 chapters: [...]   —— 显式清单，作者说了算（目录或文件名均可，顺序照抄）
     ② 名字里的数字段（10-x / 100-y / 01.md）—— 按**数值**比，不是字典序
     ③ 自然序（chapter2 < chapter10）   —— 名字里没数字时的兜底
   同一层套同一个 key，所以「章」和「节」各自排自己的序；层级由目录深度决定，不靠命名约定。

   页的归属：
     · dir/README.md（或 index.md） = 这一层的「头页」（章导言，标题取它自己的 h1）
     · dir/*.md（README 之外）      = 这一层的页，排在子目录之前
     · dir/sub/                     = 下一层
     · 根 README.md                 = 书的前言（并进目录页，不单独成页）
     · 根 BEFORE.md                 = 前置要求；内容若是一行相对路径，就去读那份（读不到就跳过）

   体积与阅读方式：
     · books/<slug>/<id>.html —— 一页一个静态文件，可单独分享（目录页 + 上下节翻页）
     · js/bookpages/<slug>/<id>.js —— 同一份正文的片段，给首页那张书卡用
     · js/books.data.js —— 书的元信息 + **扫描器算好的目录结构**（toc）+ 首节正文

   首页阅读页把整本书当「一篇可流式加载的长文」：侧栏直接用 toc 建（不再从正文猜标题），
   正文先注入首节，滚到接近底部才拉下一节。一本 315 节的书打开只多下这一节。

   用法：
     node tools/book.mjs                 # 编译 posts/ 下所有带 book.yml 的书
     node tools/book.mjs --book=java     # 只编一本
     node tools/book.mjs --list          # 只打印扫描出的页序（校对排序就是干这个的）
     node tools/book.mjs --check         # 产物是否落后于源
*/

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './md2html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'posts');     // 书源：posts/<slug>/book.yml
const OUT = join(ROOT, 'books');     // 产物：books/<slug>/index.html + 每页
const CSS_BASE = '../../css/base.css';
const CSS_BOOK = '../book.css';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stripTags = s => String(s).replace(/<[^>]*>/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();

const sha8 = s => createHash('sha1').update(String(s)).digest('hex').slice(0, 8);

/* buildPage 的 rebase 是相对 books/<slug>/ 算的（../../posts/...），
   而分节片段要注入**站点根**的阅读页，前缀得退回根：posts/... */
const toRoot = html => String(html).replace(/="\.\.\/\.\.\/posts\//g, '="posts/');

/* ---------- 顺序：三种信号 ---------- */

/* 名字里的序号：取第一段数字，按数值比。
   为什么不用字典序：10-introduction / 100-datetime / 20-quick-start 按字典序会排成
   10 < 100 < 20，章序整段错位。博客那批 post-5 / post-7 / post-10 也是同一个坑。 */
function orderOf(name) {
  const m = /^[^\d]*(\d+)/.exec(name);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

/* 同层排序：先比序号，平手（都没有序号或序号相同）用自然序 */
function byOrder(a, b) {
  const oa = orderOf(a), ob = orderOf(b);
  if (oa !== ob) return oa < ob ? -1 : 1;
  return a.localeCompare(b, undefined, { numeric: true });
}

/* 目录名 / 文件名 → 人读标题：剥序号前缀，连字符换空格，首字母大写 */
function prettify(name) {
  const s = name.replace(/\.md$/i, '')
    .replace(/^\s*\d+\s*[-_.·、\s]*/, '')
    .replace(/[-_]+/g, ' ').trim();
  if (!s) return name;
  return /[a-z]/.test(s[0]) ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------- book.yml ----------
   只认顶层 key: value 和 chapters: 这种列表 —— 和 md2html.mjs 的 frontmatter 同一套极简语法。 */
function readBookMeta(dir) {
  const file = join(dir, 'book.yml');
  const meta = {};
  if (!existsSync(file)) return meta;
  let lastKey = null;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && lastKey) {
      if (!Array.isArray(meta[lastKey])) meta[lastKey] = [];
      meta[lastKey].push(item[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    lastKey = kv[1];
    const v = kv[2].trim().replace(/^["']|["']$/g, '');
    meta[lastKey] = v || [];
  }
  return meta;
}

/* ---------- 扫描 ---------- */
const SKIP_DIR = /^(img|images|assets|static|vendor|node_modules|dist|build)$/i;

function listDir(dir) {
  return readdirSync(dir, { withFileTypes: true }).filter(d => !d.name.startsWith('.'));
}

/* 页 id 也是产物文件名：10-introduction/README.md → 10-introduction
   根 README.md → preface（并进目录页，不单独出文件） */
function pageId(rel) {
  const p = rel.replace(/\.md$/i, '')
    .replace(/(^|\/)(readme|index)$/i, '');
  return (p || 'preface').replace(/[\/\\]+/g, '-').toLowerCase();
}

function specOf(dir, name, rel, depth) {
  return {
    file: join(dir, name),
    rel,
    depth,
    id: pageId(rel),
    lead: /^(readme|index)\.md$/i.test(name),
  };
}

/* 一个目录 → 一个 group：pages（本层页）+ children（子层） */
function scanGroup(dir, rel, depth, meta) {
  const items = listDir(dir);
  const dirs = items.filter(d => d.isDirectory() && !SKIP_DIR.test(d.name)).map(d => d.name);
  const mds = items.filter(d => d.isFile() && /\.md$/i.test(d.name)).map(d => d.name);

  const group = { title: prettify(basename(dir)), depth, pages: [], children: [] };

  /* ① 显式清单：顶层且 book.yml 给了 chapters 时，只收清单里的，顺序完全照抄 */
  if (depth === 0 && Array.isArray(meta.chapters) && meta.chapters.length) {
    const norm = s => String(s).replace(/^\.\//, '').replace(/\.md$/i, '');
    for (const raw of meta.chapters) {
      const k = norm(raw);
      const d = dirs.find(x => x === k);
      if (d) { group.children.push(scanGroup(join(dir, d), rel + d + '/', depth + 1, meta)); continue; }
      const m = mds.find(x => x.replace(/\.md$/i, '') === k);
      if (m) group.pages.push(specOf(dir, m, rel + m, depth));
    }
    return group;
  }

  /* ②③ 默认：本层 README 当头页，散页按序号排，子目录各自递归 */
  const readme = mds.find(f => /^(readme|index)\.md$/i.test(f));
  if (readme) group.pages.push(specOf(dir, readme, rel + readme, depth));
  for (const f of mds.filter(f => f !== readme).sort(byOrder)) {
    group.pages.push(specOf(dir, f, rel + f, depth));
  }
  if (depth === 0) group.pages = group.pages.filter(p => p.rel !== 'BEFORE.md');
  for (const d of dirs.slice().sort(byOrder)) {
    group.children.push(scanGroup(join(dir, d), rel + d + '/', depth + 1, meta));
  }
  return group;
}

/* ---------- 编译 ---------- */

/* 相对资源改写成「从 books/<slug>/ 出发能找到的路径」。
   md 里的图片是相对当前页所在目录写的（win.jpg），产物在 books/<slug>/ 下，
   所以前缀要补上 posts/<slug>/<页目录>/。外链、锚点、绝对路径不动。 */
function rebase(html, rel, slug) {
  const pageDir = rel.replace(/[^/]*$/, '');
  const prefix = `../../posts/${slug}/${pageDir}`;
  return html.replace(/(src|href)="([^"]*)"/g, (m, attr, url) => {
    if (!url || /^(https?:|mailto:|tel:|#|\/|data:)/i.test(url)) return m;
    return `${attr}="${prefix}${url}"`;
  });
}

function buildPage(spec, slug) {
  const out = compile(readFileSync(spec.file, 'utf8'), {
    title: prettify(basename(spec.file, '.md')),
  });
  let title = out.title;
  let html = out.html;

  /* 首个 h1 提出来当页标题，正文从 h2 开始 —— 否则目录里的「Java简介」
     和正文里那个 h1 会重复一次。 */
  const h1 = /^<h1[^>]*>([\s\S]*?)<\/h1>\s*/.exec(html);
  if (h1) {
    title = stripTags(h1[1]) || title;
    html = html.slice(h1[0].length);
  }

  return { ...spec, title, html: rebase(html, spec.rel, slug), minutes: out.minutes };
}

/* 根 BEFORE.md：前置要求。内容若是一行相对路径（廖雪峰那套是 ../git/BEFORE.md），
   就去读目标；目标不在本仓库时跳过，不把一行路径渲染成正文。 */
function readBefore(dir, slug) {
  const file = join(dir, 'BEFORE.md');
  if (!existsSync(file)) return null;
  let raw = readFileSync(file, 'utf8');
  const one = raw.trim();
  if (one && !/\n/.test(one) && /(^\.{0,2}\/|\/).*\.md$/i.test(one)) {
    const target = resolve(dir, one);
    if (!existsSync(target)) return null;
    raw = readFileSync(target, 'utf8');
  }
  const out = compile(raw, { title: '前置要求' });
  return { title: out.title, html: rebase(out.html, 'BEFORE.md', slug) };
}

/* 深搜成扁平页序（翻页要用），同时把根 README 摘出来当前言 */
function flatten(node, flat, book) {
  for (const p of node.pages) {
    if (p.rel === 'README.md' && p.depth === 0) { book.preface = p; continue; }
    flat.push(p);
  }
  for (const c of node.children) flatten(c, flat, book);
  return flat;
}

/* ---------- 渲染 ----------
   主题跟着站点走：站点把选择存在 localStorage 的 cb:theme，这里在 head 里同步读一次，
   避免先画夜间再跳日间那一下闪白。 */
const THEME_BOOT = `<script>
try { if (localStorage.getItem('cb:theme') === 'day') document.documentElement.dataset.theme = 'day'; } catch (e) {}
</script>`;

function doc(title, body) {
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${THEME_BOOT}
<link rel="stylesheet" href="${CSS_BASE}">
<link rel="stylesheet" href="${CSS_BOOK}">
</head>
<body class="bk">
${body}
</body>
</html>
`;
}

/* 目录树 → <li> 串。
   组的标题优先用该目录头页（README）的 h1（「第 1 章 …」），没有才退回目录名；
   这时组标题本身就是通往该章导言页的链接，一举两得，不会和子项里的同名条目重复。 */
function tocList(node) {
  const parts = [];
  for (const p of node.pages) {
    if (p.rel === 'README.md' && p.depth === 0) continue;   // 根前言并进目录页
    parts.push(`<li><a href="${p.id}.html">${esc(p.title)}</a></li>`);
  }
  for (const c of node.children) {
    const lead = c.pages.find(p => p.lead);
    const head = lead
      ? `<a href="${lead.id}.html">${esc(lead.title)}</a>`
      : `<span>${esc(c.title)}</span>`;
    const inner = [];
    for (const p of c.pages) {
      if (p === lead) continue;
      inner.push(`<li><a href="${p.id}.html">${esc(p.title)}</a></li>`);
    }
    for (const g of c.children) {
      const sub = tocList({ pages: [], children: [g] });   // 借壳递归，拿到 <li> 直接拼
      if (sub) inner.push(sub);
    }
    parts.push(`<li class="bk-grp">${head}<ul>${inner.join('')}</ul></li>`);
  }
  return parts.join('');
}

function renderIndex(book) {
  const cover = `<header class="bk-cover">
<h1>${esc(book.meta.title || book.slug)}</h1>
${book.meta.description ? `<p class="bk-desc">${esc(book.meta.description)}</p>` : ''}
${book.meta.author ? `<p class="bk-author">${esc(book.meta.author)}</p>` : ''}
</header>`;
  const before = book.before
    ? `<section class="bk-sec md"><h2>${esc(book.before.title)}</h2>${book.before.html}</section>` : '';
  const preface = book.prefaceHtml
    ? `<section class="bk-sec md">${book.prefaceHtml}</section>` : '';
  const toc = `<nav class="bk-toc"><h2>目录</h2><ul>${tocList(book.tree)}</ul></nav>`;
  return doc(`${book.meta.title || book.slug} · 目录`, cover + before + preface + toc);
}

function renderPage(book, i) {
  const p = book.flat[i];
  const prev = book.flat[i - 1];
  const next = book.flat[i + 1];
  const pager = `<nav class="bk-pager">
${prev ? `<a href="${prev.id}.html" rel="prev">← ${esc(prev.title)}</a>` : '<span></span>'}
<a href="index.html" class="bk-pager__home">目录</a>
${next ? `<a href="${next.id}.html" rel="next">${esc(next.title)} →</a>` : '<span></span>'}
</nav>`;
  return doc(`${p.title} · ${book.meta.title || book.slug}`, `<article class="bk-article md">
<h1>${esc(p.title)}</h1>
${p.html}
</article>
${pager}`);
}

/* ---------- 首页卡片读的「书目录页」 ----------
   注入到 .post__body 的是**站点阅读页**那套结构（.md 里的 h2 / ul / a），
   不是书籍页的 .bk-* —— 后者只有 books/book.css 认识，注入进来不生效。

   链接写 books/<slug>/<id>.html（相对站点根）：首页与深链都在根上，路径成立。 */
/* 目录 → 扁平条目（顺序与 flat 一致：阅读页侧栏和「加载到第几节」都靠它对位）。
   level 只表达嵌套深度，编号与树形在 reader.js 里算。
   id 为 null 的是「组标题」——这一章没有 lead 页，侧栏里渲染成不可点的标签。
   v = 该节正文的哈希，reader.js 拼成 js/bookpages/<slug>/<id>.js?v= 走缓存。 */
function tocFlat(node, list, level) {
  for (const p of node.pages) {
    if (p.rel === 'README.md' && p.depth === 0) continue;   // 根前言单独一条
    list.push({ id: p.id, title: p.title, level, v: p.v });
  }
  for (const c of node.children) {
    const lead = c.pages.find(p => p.lead);
    list.push({
      id: lead ? lead.id : null,
      title: lead ? lead.title : c.title,
      level,
      ...(lead ? { v: lead.v } : {}),
    });
    for (const p of c.pages) {
      if (p === lead) continue;
      list.push({ id: p.id, title: p.title, level: level + 1, v: p.v });
    }
    for (const g of c.children) tocFlat({ pages: [], children: [g] }, list, level + 1);
  }
  return list;
}

/* 首页卡片条目 —— 阅读页把整本书当**一篇可流式加载的长文**：
   toc 给出侧栏与顺序，html 只内联第一节，其余按需拉 js/bookpages/<slug>/<id>.js。
   一本 315 节的书打开只多下这一节，不是 2 MB。 */
function bookEntry(book) {
  const toc = [];
  if (book.prefaceHtml) toc.push({ id: 'preface', title: '前言', level: 1, v: book.prefaceV });
  tocFlat(book.tree, toc, 1);
  const first = toc[0];
  const firstHtml = first.id === 'preface'
    ? `<h2 id="preface">前言</h2>\n${toRoot(book.prefaceHtml)}`
    : `<h2 id="${first.id}">${esc(first.title)}</h2>\n${toRoot(book.flat[0].htmlRoot)}`;
  return {
    slug: book.slug,
    title: book.meta.title || book.slug,
    /* 书没有「发布日期」这个概念。没写 date 就按最早的 2000-01-01 排到时间线末尾——
       卡片堆是新的在前，这样书不会挤掉第一页的文章。要在别的位置就写 date: */
    date: book.meta.date || '2000-01-01',
    tags: ['书籍'],
    summary: book.meta.description || '',
    minutes: null,
    toc,
    first: first.id,
    html: firstHtml,
  };
}

/* 单节片段 → js/bookpages/<slug>/<id>.js。
   为什么不直接 fetch books/<slug>/<id>.html：file:// 下 fetch 被 CORS 挡死
   （这个站点明确要支持双击 index.html 打开），所以和文章一样走 <script> 注入。 */
function pageScript(book, id, title, html) {
  const payload = { title, html };
  return '/* 由 tools/book.mjs 自动生成 —— 改内容请改 md 后重跑，别手改。 */\n'
    + `(window.AX_BP = window.AX_BP || {})[${JSON.stringify(book.slug + '/' + id)}] = `
    + JSON.stringify(payload).replace(/<\/script/gi, '<\\/script') + ';\n';
}

/* ---------- CLI ---------- */
function findBooks(only) {
  return readdirSync(SRC, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)
    .filter(name => (!only || name === only) && existsSync(join(SRC, name, 'book.yml')))
    .sort();
}

function prepare(slug) {
  const dir = join(SRC, slug);
  const meta = readBookMeta(dir);
  const tree = scanGroup(dir, '', 0, meta);
  const book = { slug, dir, meta, tree, flat: [], before: null, preface: null, prefaceHtml: '' };

  flatten(tree, book.flat, book);
  for (const p of book.flat) {
    Object.assign(p, buildPage(p, slug));
    /* 两个派生量：注入站点阅读页的根路径版，以及给它打 ?v= 的内容哈希。
       原 html 仍留给 books/<slug>/<id>.html 那份独立页（那里要 ../../posts/）。 */
    p.htmlRoot = toRoot(p.html);
    p.v = sha8(p.htmlRoot);
  }
  if (book.preface) {
    book.prefaceHtml = buildPage(book.preface, slug).html;
    book.prefaceV = sha8(toRoot(book.prefaceHtml));
  }
  book.before = readBefore(dir, slug);
  return book;
}

function main() {
  const argv = process.argv.slice(2);
  const only = (argv.find(a => a.startsWith('--book=')) || '').slice('--book='.length);
  const LIST = argv.includes('--list');
  const CHECK = argv.includes('--check');

  if (!existsSync(SRC)) {
    console.error(`找不到 ${SRC}`);
    process.exit(1);
  }
  const books = findBooks(only);
  if (!books.length) {
    console.error(only ? `没有这本书：posts/${only}/book.yml` : 'posts/ 下没有带 book.yml 的书');
    process.exit(1);
  }

  const files = [];   // [路径, 内容]，写盘与 --check 共用
  const built = [];
  const postsIndex = {};   // 首页卡片要读的书条目（window.AX_BOOKS）
  for (const slug of books) {
    const book = prepare(slug);
    built.push(book);
    if (LIST) {
      console.log(`【${book.meta.title || slug}】${book.flat.length} 页 · ${book.meta.author || ''}`);
      for (const p of book.flat) {
        console.log(`  ${'  '.repeat(p.depth)}${p.id}  ${p.title}${p.minutes ? `（${p.minutes} min）` : ''}`);
      }
      continue;
    }
    postsIndex[`book-${slug}`] = bookEntry(book);
    files.push([join(OUT, slug, 'index.html'), renderIndex(book)]);
    for (let i = 0; i < book.flat.length; i++) {
      const p = book.flat[i];
      files.push([join(OUT, slug, p.id + '.html'), renderPage(book, i)]);
      /* 分节片段：首页阅读页流式加载时按需拉。和独立页同一份正文，只是路径退回根。 */
      files.push([join(ROOT, 'js', 'bookpages', slug, p.id + '.js'),
        pageScript(book, p.id, p.title, p.htmlRoot)]);
    }
  }
  if (LIST) return;

  /* 书目录 + 首页卡片正文 → js/books.data.js。
     为什么不并进 js/posts.data.js：那个由 md2html.mjs 独占写，两个编译器写同一份
     只会互相覆盖。这里另开一个命名空间 AX_BOOKS，reader.js 两边都查。 */
  files.push([join(ROOT, 'js', 'books.data.js'),
    '/* 由 tools/book.mjs 自动生成 —— 改内容请改 posts/<书>/ 下的 md 与 book.yml 后重跑，别手改。 */\n'
    + `window.AX_BOOKS = ${JSON.stringify(postsIndex, null, 2).replace(/<\/script/gi, '<\\/script')};\n`]);

  if (CHECK) {
    const stale = files.filter(([f, text]) => !existsSync(f) || readFileSync(f, 'utf8') !== text);
    if (stale.length) {
      console.error(`✗ ${stale.length} 个产物落后于源，重跑 node tools/book.mjs`);
      stale.slice(0, 8).forEach(([f]) => console.error('  ' + f.slice(ROOT.length + 1)));
      process.exit(1);
    }
    console.log(`✓ ${books.length} 本书的产物与源同步（共 ${files.length} 个文件）`);
    return;
  }

  for (const [file, text] of files) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text, 'utf8');
  }

  /* 旧产物不主动删（和 md2html 的孤儿策略一致）：只报出来，确认要清时手动删。 */
  console.log(`✓ 编译 ${built.length} 本书 → books/（${files.length} 个 html，`
    + `${(files.reduce((n, [, t]) => n + t.length, 0) / 1024).toFixed(0)} KB）`);
  for (const b of built) {
    console.log(`  ${b.slug}: ${b.meta.title || b.slug}（${b.flat.length} 页）`);
  }
}

main();
