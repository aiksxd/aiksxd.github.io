#!/usr/bin/env node
/* md2html.mjs —— 零依赖的小型 Markdown 编译器
   ==========================================
   为什么自己写一个，而不是引 marked：
   ① 这个博客是「克隆下来就能跑」的单页站，正文只需要标题/段落/列表/代码/引用/表格/图片这几样，
      marked 那份 39KB 的解析器里有一大半能力（HTML 透传、脚注、自动链接）反而是要主动关掉的；
   ② 我们要输出的不是通用 html，而是**直接接进 .post 卡片的片段** ——
      图片要包成项目自己的 <figure class="post__figure">、标题要带可直接当锚点的 id，
      这些钩子写在自家编译器里比去改别人的 renderer 更短；
   ③ 没有运行时解析：md 在本地编译成 js/posts.data.js，浏览器只读结果，
      阅读页首帧不用等解析、file:// 下也不用 fetch（fetch 本地文件会被 CORS 拦掉）。

   用法：
     node tools/md2html.mjs              # 编译 posts/*.md → js/posts.data.js
     node tools/md2html.mjs --check      # 只校验，不写文件（产物是否落后）
     node tools/md2html.mjs --dump post-1  # 把单篇的 html 打到 stdout，便于肉眼比对
     node tools/md2html.mjs --dump post-1 --en   # 打英文版（该篇有 post-1.en.md 时）

   双语：posts/post-N.md 旁边放 post-N.en.md，就会编译成同一个条目里的
   titleEn / summaryEn / tagsEn / minutesEn / htmlEn。读侧按 html[data-lang] 选版本，
   没配对的篇目自动退回中文（`htmlEn || html`）。

   支持的语法（够用即可，缺的语法就明说缺，不偷偷降级）：
     frontmatter（顶层 key: value，值可以是 [a, b] 或下面几行 - item）
     # ~ ###### 标题            （带 id 锚点，重复标题自动加序号）
     段落（空行分段，段内换行合并成一个空格 —— 中文里手写的折行不该变成硬换行）
     **粗** *斜* ~~删~~ `行内码`
     [文字](链接 "标题")      ![图片](地址 "说明")（独占一行的图片升级成 figure）
     有序 / 无序列表 + 缩进嵌套 + 任务列表 - [ ] / - [x]
     > 引用（可多段、可嵌套其它块）；列表内部的 > 按「层数」当缩进，见 quoteIndent()
     ```lang 围栏代码块（编译期只写 data-lang、内部原样转义；
             上色交给阅读页的 vendor/highlight.min.js，见下方说明）
     GFM 管道表（支持 :-- / :-: / --: 三种对齐）
     --- 分隔线
   不支持（故意）：行内 HTML 透传（一律转义，md 里写 <script> 只会被显示出来）、
   数学公式、脚注、目录指令 —— 需要时再单独加，不在这里塞半成品。
*/

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'posts');
const OUT_FILE = join(ROOT, 'js', 'posts.data.js');   // 索引（只有元数据）
const POST_DIR = join(ROOT, 'js', 'posts');           // 一篇一个 <id>.js，只装 html

/* ---------- 转义 ---------- */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = s => String(s).replace(/[&<>"]/g, c => ESC_MAP[c]);

/* ---------- frontmatter ----------
   只认「顶层 key: value」。值写成 [a, b] 是数组，写成下面几行 "- item" 也是数组。
   不引 YAML 库：博客只需要 title / date / tags / summary 这几个键。 */
function splitFrontmatter(raw) {
  const src = String(raw).replace(/^\uFEFF/, '');
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { meta: {}, body: src };

  const meta = {};
  const lines = m[1].split(/\r?\n/);
  let lastKey = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && lastKey) {
      if (!Array.isArray(meta[lastKey])) meta[lastKey] = meta[lastKey] ? [meta[lastKey]] : [];
      meta[lastKey].push(unquote(item[1]));
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    lastKey = kv[1];
    const v = kv[2].trim();
    if (!v) { meta[lastKey] = []; continue; }
    meta[lastKey] = v.startsWith('[')
      ? v.replace(/^\[|\]$/g, '').split(',').map(s => unquote(s.trim())).filter(Boolean)
      : unquote(v);
  }
  return { meta, body: src.slice(m[0].length) };
}
function unquote(s) {
  return String(s).trim().replace(/^["']|["']$/g, '');
}

/* ---------- 锚点 ----------
   标题里可能有 **粗体**、`代码`、[链接]()，先剥成纯文本再定锚点。
   中文不转拼音：id 里直接留中文，`#把云朵画进-css` 在浏览器里是合法的，
   而且比 `#post-1-h-3` 更能在地址栏里读出来。 */
function plainText(s) {
  return String(s)
    .replace(/\u0000(\d+)\u0000/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
}
const usedIds = new Map();
function slugify(text) {
  let base = plainText(text)
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')          // 空格 → 连字符（中文标题里通常是「CSS 之类」这种断点）
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')   // 去掉标点：? ! , ： 《》 等
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!base) base = 'section';
  const n = usedIds.get(base) || 0;
  usedIds.set(base, n + 1);
  return n ? `${base}-${n + 1}` : base;
}

/* ---------- 行内 ----------
   先把行内代码抽成占位符，否则 `a*b` 里的星号会被当成强调，
   `[x](y)` 里的方括号也会被链接规则吃掉。占位符用 \u0000N\u0000，
   正常文本里不会出现 NUL，回填时不会误伤。 */
function inline(src) {
  const codes = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = esc(s);

  /* 标签属性也要抽成占位符。外链会带上 target="_blank"，而 _blank 里的下划线
     正好能被下面的 _em_ 规则配对 —— 同一段里出现两个外链时，两个 _blank 会
     互相当成一对斜体，输出 target="<em>blank"。属性里还可能藏着 URL 的下划线，
     靠加排除字符堵不住，只有「先抽出来、回填」才干净。 */
  const attrs = [];
  const keepAttr = html => {
    attrs.push(html);
    return `\u0001${attrs.length - 1}\u0001`;
  };

  // 图片先于链接：两者都以 [ 开头，顺序反了会把 ![a](b) 拆成 "!" + 链接
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
    (_, alt, href, title) => {
      const t = title ? ` title="${esc(title)}"` : '';
      return keepAttr(`<img src="${esc(href)}" alt="${esc(alt)}" loading="lazy"${t}>`);
    });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (_, text, href, title) => {
    const t = title ? ` title="${esc(title)}"` : '';
    const ext = /^https?:|^mailto:/.test(href);
    const rel = ext ? ' rel="noopener"' : '';
    const tgt = ext ? ' target="_blank"' : '';
    return `<a ${keepAttr(`href="${esc(href)}"${tgt}${rel}${t}`)}>${text}</a>`;
  });

  // 三个星号先于两个：***x*** 否则会被拆成 ** *x* **
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => attrs[Number(i)]);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
  return s;
}

/* ---------- 块级 ---------- */
const RE_FENCE = /^(```|~~~)\s*([\w+#.-]*)\s*$/;
const RE_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const RE_HR = /^(?:\*\s*){3,}$|^(?:-\s*){3,}$|^(?:_\s*){3,}$/;
const RE_QUOTE = /^>\s?/;
const RE_LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
/* 这套稿子里有序项常写成「1.正文」（点后面不空格），单列一条：
   只有有序标记允许紧跟正文，无序标记仍要求空格 —— 否则 **粗体** / *斜体* 开头的行会被当成列表项。 */
const RE_LIST_TIGHT = /^(\s*)(\d+[.)])(?![\d \t])(.*)$/;
function listItem(line) {
  const a = RE_LIST.exec(line);
  if (a) return a;
  const b = RE_LIST_TIGHT.exec(line);
  return b ? [b[0], b[1], b[2], b[3]] : null;
}
const RE_IMAGE_ONLY = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function blocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // 围栏代码块：内部原样保留，只转义，编译期不上色。
    // 语言标记写成 data-lang 交给读侧：阅读页 js/reader.js 注入正文后用本地
    // vendor/highlight.min.js 现场上色。为什么不在这里预生成高亮 html ——
    // 产物要能切语言、要能离线打开，编译器不该知道配色；而且同一段代码
    // 换主题时只要改 CSS，不用重编译 73KB 的产物。
    const fence = RE_FENCE.exec(line.trim());
    if (fence) {
      const mark = fence[1];
      const lang = fence[2];
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(mark)) { body.push(lines[i]); i++; }
      i++; // 吃掉闭合行
      const cls = lang ? ` data-lang="${esc(lang)}"` : '';
      out.push(`<pre class="md-code"${cls}><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    const h = RE_HEADING.exec(line);
    if (h) {
      const lv = h[1].length;
      const id = slugify(h[2]);
      out.push(`<h${lv} id="${id}">${inline(h[2])}</h${lv}>`);
      i++;
      continue;
    }

    if (RE_HR.test(line.trim())) { out.push('<hr class="md-hr">'); i++; continue; }

    // 独占一行的图片 → 项目自己的 figure（复用 .post__figure 的圆角/描边）
    const img = RE_IMAGE_ONLY.exec(line.trim());
    if (img) {
      const cap = img[3] || img[1];
      out.push(
        `<figure class="post__figure md-figure"><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy">`
        + (cap ? `<figcaption>${esc(cap)}</figcaption>` : '')
        + '</figure>'
      );
      i++;
      continue;
    }

    // 引用：连续的 > 行剥掉前缀后递归，所以引用里还能放列表和代码
    if (RE_QUOTE.test(line)) {
      const body = [];
      // 懒续行只接「普通文字」。原来这里没有任何边界，只要上一行非空就继续吃，
      // post-8 的 `## 总结` 连同后面整章都被吞进同一个引用块里。
      const opensBlock = l => RE_FENCE.test(l.trim()) || RE_HEADING.test(l) || RE_HR.test(l.trim())
        || listItem(l) || RE_IMAGE_ONLY.test(l.trim());
      while (i < lines.length) {
        if (RE_QUOTE.test(lines[i])) { body.push(lines[i].replace(/^>\s?/, '')); i++; continue; }
        if (lines[i].trim() && body.length && lines[i - 1].trim() && !opensBlock(lines[i])) {
          body.push(lines[i]); i++; continue;
        }
        break;
      }
      const inner = blocks(body).join('\n');
      if (!inner) continue;      // 光秃秃的 > 行不产出一个空引用盒
      out.push(`<blockquote class="md-quote">${inner}</blockquote>`);
      continue;
    }

    // 表格：当前行有竖线，且下一行是 |---|---|
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      const head = cells(line);
      const aligns = cells(lines[i + 1]).map(c => {
        const l = c.startsWith(':'), r = c.endsWith(':');
        return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
      });
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(cells(lines[i]));
        i++;
      }
      const al = k => (aligns[k] ? ` style="text-align:${aligns[k]}"` : '');
      const thead = `<thead><tr>${head.map((c, k) => `<th${al(k)}>${inline(c)}</th>`).join('')}</tr></thead>`;
      const tbody = rows.length
        ? `<tbody>${rows.map(r => `<tr>${head.map((_, k) => `<td${al(k)}>${inline(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody>`
        : '';
      out.push(`<div class="md-table"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    // 列表：交给专门的缩进栈实现
    if (listItem(line)) {
      const r = listBlocks(lines, i);
      out.push(r.html);
      i = r.next;
      continue;
    }

    // 段落：吃到空行或下一个块标记为止；段内换行合并成空格
    const para = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (RE_FENCE.test(l.trim()) || RE_HEADING.test(l) || RE_HR.test(l.trim()) ||
          RE_QUOTE.test(l) || listItem(l) || RE_IMAGE_ONLY.test(l.trim())) break;
      para.push(l.trim());
      i++;
    }
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    else i++;   // 防御：不认识的行也不能让外层死循环
  }

  return out;
}

/* 表格一行拆格：去掉首尾竖线，允许单元格里写 \| 转义 */
function cells(line) {
  return line.trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map(c => c.trim().replace(/\\\|/g, '|'));
}

/* 「> 的层数 = 缩进层级」—— post-7 / post-8 这批长文的写法：
      + 父项
      > + 子项            一层
      > > 1. 孙项          两层（> 之间有没有空格、>> 连写都一样）
      >   说明文字          挂在上一项下面
   只在**列表内部**这么认：列表外的 > 还是引用块（blocks() 那段负责）。
   为什么要在编译器里认这套写法而不是去改 md：md 是作者的原稿，改动量以千行计，
   而且 > 前缀在这套稿子里本来就是「缩进」的意思，不是「引用」的意思。 */
const RE_QUOTE_MARK = /^[ \t]*((?:>[ \t]*)+)(.*)$/;
function quoteIndent(line) {
  const m = RE_QUOTE_MARK.exec(line);
  if (!m) return null;
  return { depth: (m[1].match(/>/g) || []).length, text: m[2] };
}

/* 列表：把连续列表项按缩进建树。
   为什么用栈而不是正则递归：md 的嵌套是靠「缩进深度」表达的，
   2 空格 / 4 空格混着写都得认，栈是最短的正确写法。 */
function listBlocks(lines, start) {
  const items = [];
  let i = start;

  while (i < lines.length) {
    const raw = lines[i];

    // 空行：这套写法里「> 子项」常和父项被空行隔开（父项后空一行再 > + …），
    // 所以要先看接下来第一行非空行是不是 > 标记，是就当同一块列表继续。
    if (!raw.trim()) {
      let k = i;
      while (k < lines.length && !lines[k].trim()) k++;
      if (k < lines.length && quoteIndent(lines[k])) { i = k; continue; }
      break;
    }

    // > 标记改写成缩进：> 一层 → 2 空格，> > 两层 → 4 空格，交给下面的缩进栈
    const qi = quoteIndent(raw);
    let line = raw;
    if (qi) {
      if (!qi.text.trim()) { i++; continue; }        // 光秃秃的 > / > > 在这套写法里就是空行
      line = '  '.repeat(qi.depth) + qi.text.trim();
    }

    const m = listItem(line);
    if (!m) {
      // 懒续行：紧跟在列表项后面、缩进更深的普通文本，接到上一项。
      // 「上一项」按缩进挑，不是永远挑最后一项：> 两层挂着的说明文字，
      // 不该钻到更深一层的孙项里（post-8 的「其中，80端口…」原来就接错了）。
      if (items.length && line.trim() && !RE_FENCE.test(line.trim()) && !RE_HEADING.test(line)) {
        const ind = (/^[ \t]*/.exec(line)[0].replace(/\t/g, '    ')).length;
        let k = items.length - 1;
        while (k > 0 && items[k].indent > ind) k--;
        items[k].text += ' ' + line.trim();
        i++;
        continue;
      }
      break;
    }
    items.push({
      indent: m[1].replace(/\t/g, '    ').length,
      ordered: /\d/.test(m[2]),
      num: /^\d/.test(m[2]) ? parseInt(m[2], 10) : null,
      text: m[3],
    });
    i++;
  }

  if (!items.length) return { html: '', next: i };

  // 栈里存 {indent, node}，node.children 是子项
  const root = { children: [] };
  const stack = [{ indent: items[0].indent - 1, node: root }];

  for (const it of items) {
    while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    const node = { text: it.text, ordered: it.ordered, num: it.num, indent: it.indent, children: [] };
    parent.children.push(node);
    stack.push({ indent: it.indent, node });
  }

  const render = (nodes, ordered) => {
    const tag = ordered ? 'ol' : 'ul';
    // 有序列表从第几项开始也要带出来，否则 2./3. 会顶成 1./2.
    const start = ordered && nodes[0] && nodes[0].num && nodes[0].num !== 1 ? ` start="${nodes[0].num}"` : '';
    return `<${tag} class="md-list"${start}>${nodes.map(n => {
      // 任务列表：- [ ] / - [x] 直接换成禁用勾选框，阅读态只是「标记」不是可操作项
      const task = /^\[([ xX])\]\s+/.exec(n.text);
      const body = task
        ? `<label class="md-task"><input type="checkbox" disabled${task[1].toLowerCase() === 'x' ? ' checked' : ''}><span>${inline(n.text.replace(/^\[([ xX])\]\s+/, ''))}</span></label>`
        : inline(n.text);
      const sub = n.children.length ? render(n.children, n.children[0].ordered) : '';
      return `<li${task ? ' class="is-task"' : ''}>${body}${sub}</li>`;
    }).join('')}</${tag}>`;
  };

  return { html: render(root.children, root.children[0].ordered), next: i };
}

/* ---------- 对外：编译一篇 ---------- */
export function compile(raw, fallback = {}) {
  usedIds.clear();
  const { meta, body } = splitFrontmatter(raw);
  const html = blocks(body.replace(/\r\n?/g, '\n').split('\n')).join('\n');
  const words = plainText(body).replace(/\s+/g, '').length;
  return {
    title: meta.title || fallback.title || '',
    date: meta.date || fallback.date || '',
    tags: Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : (fallback.tags || []),
    summary: meta.summary || fallback.summary || '',
    // 中文按字算：350 字/分钟是偏快的阅读速度，宁短勿长
    minutes: meta.minutes ? Number(meta.minutes) : Math.max(1, Math.round(words / 350)),
    html,
  };
}

/* ---------- 卡片一致性（--check-cards） ----------
   为什么要单独一个子命令：卡片是文案的唯一运行时来源（blog.js 的时间线、悬停预览、
   翻页都从卡片 DOM 现取），但 title / date / minutes 在 md frontmatter 里也写了一遍。
   `--check` 只证明 md → posts.data.js 同步，证明不了 posts.data.js → 卡片一致；
   而两边漂移没有任何运行时信号 —— 产物里那几个字段读侧压根不读。
   这里只比「可确定的三项」：日期、标题、时长。摘要两边本来就不是同一段话，不比。
   返回不一致描述数组，空数组即通过。 */
function unescapeHtml(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function checkCards(data) {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const cards = new Map();
  /* 卡片的 id 不再限定成 post-N：编译链本来就只认「文件名 = id」，
     post-N 只是早期那批文件恰好这么起名。新文章可以用语义 slug（never-need-npm），
     老文件不改名 —— 两侧靠同一份 id 对齐，谁都没必要迁就谁。 */
  const RE_CARD = /<article class="post" id="([^"]+)"([^>]*)>([\s\S]*?)<\/article>/g;
  let m;
  while ((m = RE_CARD.exec(html))) {
    const id = m[1], attrs = m[2], body = m[3];
    const dateAttr = (/\bdata-date="([^"]*)"/.exec(attrs) || [])[1] || '';

    const h3Seg = (/<h3>[\s\S]*?<\/h3>/.exec(body) || [''])[0];
    const titleZh = (/data-zh="([^"]*)"/.exec(h3Seg) || [])[1];
    const title = titleZh !== undefined
      ? unescapeHtml(titleZh)
      : unescapeHtml(h3Seg.replace(/<[^>]*>/g, '')).trim();

    // 「N min」只在 .post__meta 里找，正文里出现同样字样不该误判
    const metaSeg = (/<p class="post__meta">[\s\S]*?<\/p>/.exec(body) || [''])[0];
    const timeAttr = (/<time datetime="([^"]*)"/.exec(metaSeg) || [])[1] || '';
    const minZh = (/data-zh="([0-9]+)\s*min"/.exec(metaSeg) || [])[1];
    const minAny = (/([0-9]+)\s*min/.exec(metaSeg) || [])[1];
    const minutes = minZh !== undefined ? Number(minZh) : minAny !== undefined ? Number(minAny) : NaN;

    cards.set(id, { dateAttr, timeAttr, title, minutes });
  }

  const bad = [];
  for (const [id, c] of cards) {
    const d = data[id];
    if (!d) { bad.push(`${id}: 有卡片，但没有 posts/${id}.md`); continue; }
    if (c.dateAttr !== d.date) bad.push(`${id}: 日期　卡片 ${c.dateAttr || '（缺）'} / md ${d.date}`);
    if (c.timeAttr && c.timeAttr !== d.date) bad.push(`${id}: time[datetime]　卡片 ${c.timeAttr} / md ${d.date}`);
    if (c.title !== d.title) bad.push(`${id}: 标题　卡片「${c.title}」/ md「${d.title}」`);
    if (!Number.isFinite(c.minutes)) bad.push(`${id}: 卡片里找不到 "N min"`);
    else if (c.minutes !== d.minutes) bad.push(`${id}: 时长　卡片 ${c.minutes} / md ${d.minutes}`);
  }
  for (const id of Object.keys(data)) {
    if (!cards.has(id)) bad.push(`${id}: 有 md，但没有卡片（分页等不到这张，5s 后走超时兜底）`);
  }
  return bad;
}

/* ---------- CLI ---------- */
function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const cardsCheck = argv.includes('--check-cards');
  const dumpIdx = argv.indexOf('--dump');

  if (!existsSync(POSTS_DIR)) {
    console.error(`找不到 ${POSTS_DIR} —— 先在 posts/ 下放 *.md`);
    process.exit(1);
  }

  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort();
  if (!files.length) {
    console.error('posts/ 里没有 .md');
    process.exit(1);
  }

  const data = {};
  for (const f of files) {
    if (f.endsWith('.en.md')) continue;        // 英文件在主件之后合并，单独成一篇文章会重复
    const key = basename(f, '.md');            // 文件名即文章 id（post-1.md → post-1）
    const raw = readFileSync(join(POSTS_DIR, f), 'utf8');
    const out = compile(raw, { title: key });
    if (!out.title) out.title = key;
    data[key] = out;
  }

  /* 英文版配对：posts/post-N.md 旁边放 post-N.en.md，编译时把两版都打进同一个条目。
     为什么不拆成两个 js 按语言加载：静态站点要「切换语言零延迟」就得两份都先在手边，
     多出来的只有 html 字符串（实测一篇一两万字符），换来切语言不用重新请求、不用重建页面。
     字段名统一带 En 后缀，读侧 `data.htmlEn || data.html` 即可优雅退化。 */
  for (const f of files) {
    if (!f.endsWith('.en.md')) continue;
    const key = f.slice(0, -'.en.md'.length);
    const main = data[key];
    if (!main) {
      console.warn(`  ! ${f} 没有对应的 ${key}.md，已忽略`);
      continue;
    }
    const raw = readFileSync(join(POSTS_DIR, f), 'utf8');
    const en = compile(raw, { title: key });
    main.titleEn = en.title || main.title;
    main.summaryEn = en.summary || '';
    main.tagsEn = en.tags || [];
    main.minutesEn = en.minutes;
    main.htmlEn = en.html;
  }

  if (dumpIdx >= 0) {
    const key = argv[dumpIdx + 1];
    if (!data[key]) { console.error(`没有 ${key}`); process.exit(1); }
    const wantEn = argv.includes('--en');
    const html = wantEn && data[key].htmlEn ? data[key].htmlEn : data[key].html;
    process.stdout.write(html + '\n');
    return;
  }

  if (cardsCheck) {
    const bad = checkCards(data);
    if (bad.length) {
      console.error(`✗ 卡片与 md 有 ${bad.length} 处不一致`);
      bad.forEach(b => console.error('  ' + b));
      process.exit(1);
    }
    console.log(`✓ ${Object.keys(data).length} 篇的日期 / 标题 / 时长与卡片一致`);
    return;
  }

  /* ---------- 产物：一份索引 + 一篇一个文件 ----------
     为什么要拆：整站一份 posts.data.js 是 112KB，点开第 1 篇就把 7 篇全下完。
     索引只留元数据（几十字节/篇），正文各自成文件，读侧按目标 id 现拉（见 js/reader.js）。
     每篇的 ?v= 写在索引条目里：单篇文件名固定、内容会变，没法在 HTML 里挂静态版本号。 */
  if (!existsSync(POST_DIR)) mkdirSync(POST_DIR, { recursive: true });

  const banner = '/* 由 tools/md2html.mjs 自动生成 —— 改内容请改 posts/*.md 后重跑，别手改这个文件。 */\n';
  const sha8 = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
  // 两件事：JSON 合法 + 不能提前关掉 <script>
  const jsStr = s => JSON.stringify(s).replace(/<\/script/gi, '<\\/script');
  const postPath = id => join(POST_DIR, id + '.js');

  /* 单篇：给索引里那一条补上 html。
     包一层 IIFE —— 用顶层 const 会在加载第二篇时撞 "already declared"。
     取不到条目就新建，不假设索引已先加载。 */
  function postScript(id, entry) {
    const key = jsStr(id);
    const lines = [
      banner,
      `(function (d) {\n`,
      `  d.html = ${jsStr(entry.html)};\n`,
    ];
    if (entry.htmlEn) lines.push(`  d.htmlEn = ${jsStr(entry.htmlEn)};\n`);
    lines.push(`})((window.AX_POSTS = window.AX_POSTS || {})[${key}] = window.AX_POSTS[${key}] || {});\n`);
    return lines.join('');
  }

  const index = {};
  const writes = [];
  for (const [id, v] of Object.entries(data)) {
    const script = postScript(id, v);
    writes.push([postPath(id), script]);
    index[id] = {
      title: v.title, date: v.date, tags: v.tags,
      summary: v.summary, minutes: v.minutes,
      v: sha8(script),
    };
  }
  const indexText = `${banner}window.AX_POSTS = ${JSON.stringify(index, null, 2).replace(/<\/script/gi, '<\\/script')};\n`;

  if (check) {
    let same = (existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : '') === indexText;
    if (same) {
      for (const [file, text] of writes) {
        if (!existsSync(file) || readFileSync(file, 'utf8') !== text) { same = false; break; }
      }
    }
    if (same) {
      const keep = new Set(writes.map(([f]) => f));
      for (const f of readdirSync(POST_DIR)) {
        if (f.endsWith('.js') && !keep.has(join(POST_DIR, f))) { same = false; break; }
      }
    }
    console.log(same ? '✓ 产物与 md 源同步' : '✗ 产物落后于 md 源，重跑 node tools/md2html.mjs');
    process.exit(same ? 0 : 1);
  }

  writeFileSync(OUT_FILE, indexText, 'utf8');
  for (const [file, text] of writes) writeFileSync(file, text, 'utf8');

  // md 删了但产物还留着的单篇要清掉，否则越积越多（只动这个目录、只动 .js）
  const keep = new Set(writes.map(([f]) => f));
  for (const f of readdirSync(POST_DIR)) {
    if (f.endsWith('.js') && !keep.has(join(POST_DIR, f))) {
      unlinkSync(join(POST_DIR, f));
      console.log(`  - 清理孤儿产物 js/posts/${f}`);
    }
  }

  const keys = Object.keys(data);
  const total = keys.reduce((n, k) => n + data[k].html.length + (data[k].htmlEn ? data[k].htmlEn.length : 0), 0);
  const paired = keys.filter(k => data[k].htmlEn).length;
  console.log(`✓ 编译 ${keys.length} 篇 → 索引 js/posts.data.js（${(indexText.length / 1024).toFixed(1)} KB）`
    + ` + 单篇 js/posts/*.js（html 合计 ${(total / 1024).toFixed(1)} KB${paired ? `，其中 ${paired} 篇带英文版` : ''}）`);
  for (const [k, v] of Object.entries(data)) {
    console.log(`  ${k}: ${v.title}（${v.html.length} 字符，${v.minutes} min）`);
  }
}

main();
