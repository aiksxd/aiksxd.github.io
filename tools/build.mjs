#!/usr/bin/env node
/* build.mjs —— 把 index.html / index.css 里的 `?v=` 缓存戳换成内容哈希
   ============================================================
   为什么需要它：以前 13 个 `?v=` 是手写递增的数字（224 / 222 / 221 / 176 / 223…）。
   改了一个 css 却忘了递增它上游的 `?v=`，浏览器会继续吃旧的 index.css（里面还是旧
   @import），线上表现是「我改了却没生效」；漏改内层则只有某一层是旧版，样式莫名回落。
   这两种都不报错，是最难查的一类问题。现在戳由文件内容决定，忘了跑就交给 CI 红。

   算法（三遍，天然幂等）：
   ① 叶子：css 的六个层 + index.html 直引的 js/css，各自按原文算 8 位哈希；
   ② index.css：先把 @import 里的 v 注入成新值，再对「注入后的文本」取哈希 —— 级联因此成立；
   ③ index.html：所有引用的 v 一起写进去。
   源文件没变，哈希就不变，第二遍跑 `--check` 一定是 ✓。

   用法：
     node tools/build.mjs           # 刷新戳并写文件
     node tools/build.mjs --check   # 只校验（CI 用），过期则非零退出
*/

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'index.html');
const CSS_ENTRY = join(ROOT, 'css', 'index.css');

const hash = buf => createHash('sha256').update(buf).digest('hex').slice(0, 8);

/* index.css 里的六个层：在 index.css 文本中出现为 `base.css?v=` 这种相对写法 */
const LAYERS = [
  ['base.css', join(ROOT, 'css', 'base.css')],
  ['scene.css', join(ROOT, 'css', 'scene.css')],
  ['articles.css', join(ROOT, 'css', 'articles.css')],
  ['responsive.css', join(ROOT, 'css', 'responsive.css')],
  ['split.css', join(ROOT, 'css', 'split.css')],
  ['motion.css', join(ROOT, 'css', 'motion.css')],
];

/* index.html 直接引用的资源：把「在 html 里出现的引用键」和磁盘路径绑在一起 */
const ENTRY_ASSETS = [
  ['css/index.css', CSS_ENTRY, 'index.css'],
  ['css/reader.css', join(ROOT, 'css', 'reader.css')],
  ['js/apps.data.js', join(ROOT, 'js', 'apps.data.js')],
  ['js/posts.data.js', join(ROOT, 'js', 'posts.data.js')],
  ['js/reader.js', join(ROOT, 'js', 'reader.js')],
  ['js/blog.js', join(ROOT, 'js', 'blog.js')],
  ['js/scroll-rail.js', join(ROOT, 'js', 'scroll-rail.js')],
  ['js/vendor/highlight.min.js', join(ROOT, 'js', 'vendor', 'highlight.min.js')],
];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* 把文本里 `引用键?v=旧值` 换成新值，并返回命中数。
   命中数必须被调用方校验：正则没咬到是最典型的静默失效。 */
function stamp(text, key, v) {
  const re = new RegExp(`(${esc(key)}\\?v=)([^"'\\s)]+)`, 'g');
  let hits = 0;
  const out = text.replace(re, (_, p1) => { hits++; return p1 + v; });
  return { text: out, hits };
}

function read(p) {
  if (!existsSync(p)) {
    console.error(`找不到 ${p}`);
    process.exit(1);
  }
  return readFileSync(p, 'utf8');
}

function main() {
  const check = process.argv.slice(2).includes('--check');
  const problems = [];
  const changes = [];

  /* ① 叶子 */
  const leafV = new Map();
  for (const [key, path] of LAYERS) leafV.set(key, hash(read(path)));
  for (const [key, path] of ENTRY_ASSETS) {
    if (key === 'css/index.css') continue;      // ② 里算
    leafV.set(key, hash(read(path)));
  }

  /* ② index.css：先注入层，再对注入后的文本取哈希 */
  const cssOld = read(CSS_ENTRY);
  let cssNew = cssOld;
  for (const [key] of LAYERS) {
    const r = stamp(cssNew, key, leafV.get(key));
    if (!r.hits) problems.push(`index.css 里没有找到 ${key}?v= —— 结构变了，脚本要跟着改`);
    cssNew = r.text;
  }
  const indexCssV = hash(cssNew);
  leafV.set('css/index.css', indexCssV);

  /* ③ index.html */
  const htmlOld = read(HTML);
  let htmlNew = htmlOld;
  for (const [key] of ENTRY_ASSETS) {
    const r = stamp(htmlNew, key, leafV.get(key));
    if (!r.hits) problems.push(`index.html 里没有找到 ${key}?v= —— 引用被改名或删掉了`);
    htmlNew = r.text;
  }

  if (problems.length) {
    problems.forEach(p => console.error(`  ! ${p}`));
    process.exit(1);
  }

  /* 逐项比对，只报告真的变了的。
     LAYERS 的戳在 index.css 里，ENTRY_ASSETS 的戳在 index.html 里，别串了来源。 */
  const diff = (key, srcText) => {
    const oldM = new RegExp(`${esc(key)}\\?v=([^"'\\s)]+)`).exec(srcText);
    const old = oldM ? oldM[1] : '（无）';
    const now = leafV.get(key);
    if (old !== now) changes.push(`  ${key.padEnd(20)} ${old} → ${now}`);
  };
  for (const [key] of LAYERS) diff(key, cssOld);
  for (const [key] of ENTRY_ASSETS) diff(key, htmlOld);
  const cssChanged = cssOld !== cssNew;

  if (check) {
    if (!cssChanged && htmlNew === htmlOld) {
      console.log('✓ 缓存戳与内容一致');
      return;
    }
    console.error('✗ 缓存戳过期，跑 node tools/build.mjs');
    if (cssChanged) console.error('  css/index.css 需要重写（@import 的 v 有变化）');
    console.error(changes.join('\n'));
    process.exit(1);
  }

  if (cssChanged) writeFileSync(CSS_ENTRY, cssNew, 'utf8');
  if (htmlOld !== htmlNew) writeFileSync(HTML, htmlNew, 'utf8');
  if (changes.length) console.log('✓ 已刷新缓存戳\n' + changes.join('\n'));
  else console.log('✓ 缓存戳已是最新，没有改动');
}

main();
