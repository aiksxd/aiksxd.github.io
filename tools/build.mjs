#!/usr/bin/env node
/* build.mjs —— 给 index.html 里线上引用的资源打内容哈希
   ============================================================
   为什么需要它：以前 ?v= 是手写递增数字，改了 CSS 忘了递增上游的戳，
   浏览器继续吃旧缓存，线上表现是「我改了却没生效」且没有任何报错。
   现在戳 = 文件内容哈希，忘了跑就交给 CI 红。

   现在的引用分两类：
     ① assets/site.css / assets/site.js —— 由 tools/minify.mjs 从源码生成，
        戳取产物自身的内容哈希；manifest 记录生成时的源码哈希，源码变了而产物没重建会直接报错。
     ② css/reader.css / js/posts.data.js / highlight.min.js —— 源文件直引，戳取自身内容哈希。
   开场内联脚本不引用外部资源，不参与打戳。

   算法幂等：文件内容不变 → 哈希不变 → 第二遍 --check 一定是 ✓。

   用法：
     node tools/minify.mjs      # 源码改了先重建压缩产物
     node tools/build.mjs       # 刷新戳并写 index.html
     node tools/build.mjs --check  # 只校验（CI 用），过期则非零退出
*/

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'index.html');
const MANIFEST = join(ROOT, 'assets', 'manifest.json');

const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 8);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function read(p) {
  if (!existsSync(p)) {
    console.error(`找不到 ${p}`);
    process.exit(1);
  }
  return readFileSync(p, 'utf8');
}

/* 把文本里 `引用键?v=旧值` 换成新值，并返回命中数。
   命中数必须被调用方校验：正则没咬到是这类脚本最典型的静默失效。 */
function stamp(text, key, v) {
  const re = new RegExp(`(${esc(key)}\\?v=)([^"'\\s)]+)`, 'g');
  let hits = 0;
  const out = text.replace(re, (_, p1) => { hits++; return p1 + v; });
  return { text: out, hits };
}

function main() {
  const check = process.argv.slice(2).includes('--check');
  const problems = [];
  const changes = [];

  if (!existsSync(MANIFEST)) {
    console.error('✗ 缺少 assets/manifest.json —— 先跑 node tools/minify.mjs');
    process.exit(1);
  }
  let manifest;
  try { manifest = JSON.parse(read(MANIFEST)); }
  catch (e) { console.error('✗ assets/manifest.json 不是合法 JSON：' + e.message); process.exit(1); }

  /* ① 源码 → 产物的一致性：源码动了却没重建，绝不能靠旧产物蒙混过关 */
  for (const [asset, srcs] of Object.entries(manifest.sources || {})) {
    for (const [p, old] of Object.entries(srcs)) {
      const now = hash(read(join(ROOT, p)));
      if (now !== old) problems.push(`${p} 已改动，但 ${asset} 还没重建 → node tools/minify.mjs`);
    }
  }
  if (problems.length) {
    problems.forEach(p => console.error('  ! ' + p));
    process.exit(1);
  }

  /* ② 收集全部要打戳的资源：产物按自身内容，直引资源也按自身内容 */
  const V = new Map();
  for (const [asset, old] of Object.entries(manifest.assets || {})) {
    const body = read(join(ROOT, asset));
    const now = hash(body);
    if (now !== old) problems.push(`${asset} 与 manifest 不符 → node tools/minify.mjs`);
    V.set(asset, now);
  }
  for (const key of ['css/reader.css', 'js/posts.data.js', 'js/books.data.js', 'js/vendor/highlight.min.js']) {
    /* books.data.js 由 book.mjs 生成；仓库里还没有书时它不存在，跳过即可
       （V 里没有这个 key，第 ③ 步就不会去 stamp 它）。 */
    if (!existsSync(join(ROOT, key))) {
      if (key !== 'js/books.data.js') problems.push(`${key} 不存在`);
      else console.log(`  - ${key} 尚未生成，跳过（先跑 node tools/book.mjs）`);
      continue;
    }
    V.set(key, hash(read(join(ROOT, key))));
  }
  if (problems.length) {
    problems.forEach(p => console.error('  ! ' + p));
    process.exit(1);
  }

  /* ③ 写回 index.html。CB_ASSETS 里的两条按需地址同样被覆盖到。 */
  const htmlOld = read(HTML);
  let htmlNew = htmlOld;
  for (const [key, v] of V) {
    const r = stamp(htmlNew, key, v);
    if (!r.hits) problems.push(`index.html 里没有找到 ${key}?v= —— 引用被改名或删掉了`);
    htmlNew = r.text;
  }
  if (problems.length) {
    problems.forEach(p => console.error('  ! ' + p));
    process.exit(1);
  }

  for (const [key, v] of V) {
    const m = new RegExp(`${esc(key)}\\?v=([^"'\\s)]+)`).exec(htmlOld);
    const old = m ? m[1] : '（无）';
    if (old !== v) changes.push(`  ${key.padEnd(32)} ${old} → ${v}`);
  }

  if (check) {
    if (htmlNew === htmlOld) {
      console.log('✓ 缓存戳与内容一致');
      return;
    }
    console.error('✗ 缓存戳过期，依次跑 node tools/minify.mjs && node tools/build.mjs');
    console.error(changes.join('\n'));
    process.exit(1);
  }

  if (htmlOld !== htmlNew) writeFileSync(HTML, htmlNew, 'utf8');
  if (changes.length) console.log('✓ 已刷新缓存戳\n' + changes.join('\n'));
  else console.log('✓ 缓存戳已是最新，没有改动');
}

main();
