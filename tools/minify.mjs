#!/usr/bin/env node
/* minify.mjs —— 从源码重建首屏的压缩产物
   ============================================================
   线上只发两个合并压缩文件：
     assets/site.css = css/{base,scene,articles,responsive,split,motion,mobile-lite}.css
                       逐层压缩后按原层叠顺序拼接（逐层压，避免 clean-css 重排规则）
     assets/site.js  = js/{apps.data,reader,blog,scroll-rail}.js 合并后 terser 压缩
   源码仍留在 css/ 与 js/ 下可直接维护；改完源码跑一次本脚本再跑 build.mjs。

   依赖：terser@5、clean-css@5（只在构建时需要，线上不下载）：
     npm install --no-save terser@5 clean-css@5
     node tools/minify.mjs
     node tools/build.mjs

   本脚本同时写 assets/manifest.json，记录每份产物对应哪些源码的哈希。
   build.mjs --check 靠它发现「源码改了但产物没重建」——否则浏览器会拿到旧代码。
*/

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 8);
const read = p => readFileSync(join(ROOT, p), 'utf8');

const CSS_LAYERS = [
  'css/base.css', 'css/scene.css', 'css/articles.css', 'css/responsive.css',
  'css/split.css', 'css/motion.css', 'css/mobile-lite.css',
];
const JS_SOURCES = ['js/apps.data.js', 'js/reader.js', 'js/blog.js', 'js/scroll-rail.js'];

let terser, CleanCSS;
try { ({ minify: terser } = await import('terser')); }
catch { console.error('缺少 terser：先在仓库根目录跑 npm install --no-save terser@5 clean-css@5'); process.exit(1); }
try { ({ default: CleanCSS } = await import('clean-css')); }
catch { console.error('缺少 clean-css：先在仓库根目录跑 npm install --no-save terser@5 clean-css@5'); process.exit(1); }

/* 逐层压缩再拼：整份一起压会让 clean-css 跨层合并规则，改掉层叠语义 */
const css = CSS_LAYERS.map(p => {
  const r = new CleanCSS({ level: 1 }).minify(read(p));
  if (r.errors.length) throw new Error(`${p}: ${r.errors.join('; ')}`);
  return r.styles;
}).join('\n');
writeFileSync(join(ROOT, 'assets/site.css'), css, 'utf8');

/* 四个 defer 脚本本来就是按这个顺序执行的；中间的分号防止上一文件尾注释吃掉下一行 */
const together = JS_SOURCES.map(p => read(p)).join('\n;\n');
const out = await terser(together, { compress: true, mangle: true });
if (out.error) throw out.error;
writeFileSync(join(ROOT, 'assets/site.js'), out.code, 'utf8');

const manifest = {
  sources: {
    'assets/site.css': Object.fromEntries(CSS_LAYERS.map(p => [p, hash(read(p))])),
    'assets/site.js': Object.fromEntries(JS_SOURCES.map(p => [p, hash(read(p))])),
  },
  assets: {
    'assets/site.css': hash(css),
    'assets/site.js': hash(out.code),
  },
};
writeFileSync(join(ROOT, 'assets/manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

for (const p of ['assets/site.css', 'assets/site.js']) {
  console.log(`${p.padEnd(18)} ${String(Buffer.byteLength(read(p))).padStart(7)} B  v=${manifest.assets[p]}`);
}
console.log('✓ 产物已重建；接着跑 node tools/build.mjs 刷新缓存戳');
