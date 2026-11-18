#!/usr/bin/env node
/* ==========================================================================
   手机端滚动性能探针（零依赖，只用 Node 内置模块 + 全局 WebSocket）

   为什么需要它：桌面 Chrome 的核显跑得动「全屏大层 + 逐帧重绘」，
   手机是「高 DPR + 弱 GPU + 弱单核」，同一份样式在手机上可能是灾难。
   桌面肉眼看不出来的问题，必须换成手机的渲染条件去量。

   做法：headless Chrome（无 GPU → SwiftShader 软件光栅化，相当于把
   GPU 填充率压到很弱）+ CDP 设备模拟（390×844 / DPR 3 / 触屏）
   + CPU 节流（默认 4x，模拟中低端手机单核），然后：

     ① idle   —— 静置 3s，只让常驻动画烧：量出「什么都不做」的底噪
     ② scroll —— 首屏行程 0→720→0 逐帧 scrollTo：量出「滚动时」的成本
                  （这一步会真实触发页面自己的 scroll → paint → 写 --p）

   指标取自 CDP Performance 域（累计值，前后相减）：
     RecalcStyleCount / LayoutCount   —— 样式重算与布局次数（DOM 写入的直接后果）
     RecalcStyleDuration / LayoutDuration / TaskDuration / ScriptDuration —— 主线程耗时
   帧间隔取自页面内 rAF 采样，给出 P50 / P90 / 最差帧。

   用法：node tools/mobile-perf-probe.mjs [项目根目录] [--label=xxx]
   ========================================================================== */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { stat, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2] : path.join(import.meta.dirname, '..'));
const LABEL = (process.argv.find(a => a.startsWith('--label=')) || '--label=run').slice(8);
/* 可选：--shot=<目录> 时在几个滚动位置各截一张，用来确认降级后的构图没坏 */
const SHOT = (process.argv.find(a => a.startsWith('--shot=')) || '').slice(7);
/* 只截图、不测量：改样式后快速看一眼构图，不必等完三个测量阶段 */
const SHOT_ONLY = process.argv.includes('--shot-only');
/* --geom：滚到卡片区，把卡堆的叠距 / 容器高 / 各槽位角色与落点导出来。
   截图看不出「下堆实际露了几像素」，这个才是判断遮挡的依据。 */
const GEOM = process.argv.includes('--geom');
/* --open：点开第一篇文章的阅读页再截图。手机上「卡片 → 全屏阅读页」是整个站子的
   核心路径，而它平时只有在真机点一下才看得到；这里直接点 .post__toggle。 */
const OPEN = process.argv.includes('--open');
/* --toc：配合 --open 用，进阅读页后再点标题栏那颗目录按钮，
   确认目录是「覆盖层滑出」而不是把正文挤窄。 */
const TOC = process.argv.includes('--toc');
/* --rects=a,b：输出这些选择器的实际盒子与关键计算样式。
   截图看不出「position:fixed 的包含块到底是不是视口」「目录还占不占 grid 列」
   这类事 —— 量 rect 才说得准。配合 --open（进阅读页）/ --toc（展开目录）使用。 */
const RECTS = (process.argv.find(a => a.startsWith('--rects=')) || '').slice('--rects='.length);
/* --resize-to=1440x900：进阅读页之后再改视口，模拟「手机档打开、再拉宽到桌面」。
   跨断点 resize 是这类坏掉的唯一复现路径 —— 启动时就给桌面参数测不出来。 */
const RESIZE_TO = (process.argv.find(a => a.startsWith('--resize-to=')) || '').slice('--resize-to='.length);
/* --day：切到日间主题再截图。日间那套令牌与夜间的开销结构不同
   （多一层 conic 光芒、云海另一套几何），要单独看一眼构图。 */
const DAY = process.argv.includes('--day');
/* --audit：切到英文模式，扫出所有仍然含中文的可见文本节点。
   「哪些文案还没英文化」用眼睛扫会漏（隐藏的、动态生成的、CSS attr() 通道都看不见），
   直接遍历文本节点最可靠。 */
const AUDIT = process.argv.includes('--audit');
/* --nego：语言协商验证。注入 navigator.language(s)=en-US 模拟英文浏览器，
   再分别跑「无存档（首次访问）」与「存档 cb:lang=zh（手动选过）」两条分支。 */
const NEGO = process.argv.includes('--nego');
/* --lang-hint=zh-CN / en-US：把 navigator.languages 覆盖成指定语言。
   两个用途：① 验证「按浏览器语言协商」；② 把性能测量钉在某个语言版本上 ——
   英文文案普遍长三成，卡片高度、页面总高都跟着变，两种语言的数据不能混着比。 */
const LANG_HINT = (process.argv.find(a => a.startsWith('--lang-hint=')) || '').split('=')[1] || '';
/* --page=相对路径：改成测 apps/ 下的子页面（默认首页）。
   子页面没有首页那套开场序列与卡片堆，性能三段和悬停检查对它没有意义，配 --shot-only 用。 */
const PAGE_PATH = (process.argv.find(a => a.startsWith('--page=')) || '').split('=')[1] || 'index.html';

/* 遍历文本节点而非元素：一个元素里可能中英混排，按节点报出更准。
   跳过 .post__text / .reader__doc —— 那是文章正文，没有英文版的篇目回退中文是设计如此。 */
const AUDIT_EXPR = `JSON.stringify((() => {
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const t = (n.textContent || '').trim();
      if (!t || !/[\\u4e00-\\u9fff]/.test(t)) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest('.post__text, .reader__doc, script, style')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  while ((n = walk.nextNode())) {
    const el = n.parentElement;
    const cls = typeof el.className === 'string' ? el.className : '';
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: cls.trim().slice(0, 48),
      zhv: el.getAttribute('data-zh') || '',
      env: el.getAttribute('data-en') || '',
      text: (n.textContent || '').trim().slice(0, 60),
      shown: !!(el.offsetParent || el.getClientRects().length),
    });
  }
  return out;
})())`;

const GEOM_EXPR = `JSON.stringify((() => {
  const stack = document.getElementById('cardStack');
  const cs = getComputedStyle(stack);
  const box = stack.getBoundingClientRect();
  return {
    boxH: Math.round(box.height),
    gap: cs.getPropertyValue('--stack-gap').trim(),
    outH: cs.getPropertyValue('--outH').trim(),
    clip: cs.clipPath,
    roles: [...stack.querySelectorAll('.card-slot')].map(s => {
      const r = s.getBoundingClientRect(), p = s.querySelector('.post');
      return {
        role: s.dataset.role || '-', hint: s.dataset.hint || '',
        topIn: Math.round(r.top - box.top), h: Math.round(r.height),
        peek: Math.round(box.bottom - r.top),
        op: getComputedStyle(s).opacity,
        cap: p ? (p.getAttribute('style') || '').replace(/.*--card-cap: ?([^;]+).*/, '$1') : '',
        postH: p ? Math.round(p.getBoundingClientRect().height) : 0,
      };
    })
  };
})())`;

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

/* 桌面对照：--desktop 时换成 1440×900、不模拟触屏、不节流 CPU。
   用途是验证「手机轻量档没有误伤桌面」—— 同一个探针、同一套检查，只换环境。 */
const DESKTOP = process.argv.includes('--desktop');

/* 手机视口：iPhone 14 级别 */
const VIEW = DESKTOP
  ? { width: 1440, height: 900, dpr: 1 }
  : { width: 390, height: 844, dpr: 3 };
const CPU_THROTTLE = DESKTOP ? 1 : 4;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.pdf': 'application/pdf',
};

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.join(ROOT, urlPath);
      if (!path.resolve(file).startsWith(path.resolve(ROOT))) { res.writeHead(403).end('forbidden'); return; }
      let s;
      try { s = await stat(file); } catch { res.writeHead(404).end('not found'); return; }
      if (s.isDirectory()) file = path.join(file, 'index.html');
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'content-type': MIME[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      createReadStream(file).pipe(res);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

async function startChrome() {
  const exe = CHROME_CANDIDATES.find(p => {
    try { return Boolean(p) && statSync(p).isFile(); } catch { return false; }
  });
  if (!exe) throw new Error('找不到 Chrome / Edge');

  const userDataDir = await mkdtemp(path.join(tmpdir(), 'cbprobe-'));
  const debugPort = 9333 + Math.floor(Math.random() * 200);
  const args = [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-sync', '--disable-default-apps',
    /* 关掉后台/遮挡节流，否则 headless 的 rAF 会被降频，测出来的帧间隔没有意义 */
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--window-size=390,844',
    'about:blank',
  ];
  const proc = spawn(exe, args, { stdio: 'ignore', windowsHide: true });

  let version = null;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      version = await r.json();
      break;
    } catch { await sleep(120); }
  }
  if (!version) { proc.kill(); throw new Error('Chrome 调试端口未就绪'); }

  let target = null;
  for (let i = 0; i < 60; i++) {
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    target = list.find(t => t.type === 'page');
    if (target) break;
    await sleep(120);
  }
  if (!target) { proc.kill(); throw new Error('没有可用的 page target'); }

  return { proc, userDataDir, wsUrl: target.webSocketDebuggerUrl };
}

class CDP {
  #ws; #id = 0; #pending = new Map();
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    return new CDP(ws);
  }
  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id == null) return;
      const p = this.#pending.get(m.id);
      if (!p) return;
      this.#pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message || JSON.stringify(m.error))) : p.res(m.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.#id;
    this.#ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.#pending.set(id, { res, rej }));
  }
  close() { try { this.#ws.close(); } catch { } }
}

const METRICS_OF_INTEREST = [
  'RecalcStyleCount', 'RecalcStyleDuration',
  'LayoutCount', 'LayoutDuration',
  'ScriptDuration', 'TaskDuration',
  'LayoutObjects', 'Nodes',
];

async function metrics(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const out = {};
  for (const m of metrics) out[m.name] = m.value;
  return out;
}

function delta(a, b, keys) {
  const out = {};
  for (const k of keys) out[k] = (b[k] ?? 0) - (a[k] ?? 0);
  return out;
}

 /* 单轮采样在这个页面上波动很大（同一份代码跑三次可以差一倍），
    原因主要是「同帧内的样式失效被批处理成多大的一个 recalc」本身不稳定，
    外加 SwiftShader 软件光栅的调度抖动。所以每个阶段在**同一会话内**重复跑，
    取中位数 —— 跨进程/跨次启动的差值不进结论。 */
const median = arr => {
  const s = [...arr].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

async function measure(cdp, script, times, keys) {
  const runs = [];
  for (let i = 0; i < times; i++) {
    await evaluate(cdp, 'window.scrollTo(0, 0)');
    await sleep(200);
    const a = await metrics(cdp);
    const frames = await evaluate(cdp, script, true);
    const b = await metrics(cdp);
    runs.push({ frames: frameStats(frames), ...delta(a, b, keys) });
  }
  const pick = fn => median(runs.map(fn));
  return {
    runs: runs.length,
    samples: runs.map(r => +r.frames.avg.toFixed(2)),
    frames: {
      n: Math.round(pick(r => r.frames.n)),
      avg: pick(r => r.frames.avg),
      p50: pick(r => r.frames.p50),
      p90: pick(r => r.frames.p90),
      max: pick(r => r.frames.max),
      fps: +(1000 / pick(r => r.frames.avg)).toFixed(1),
      janky: Math.round(pick(r => r.frames.janky)),
    },
    RecalcStyleCount: Math.round(pick(r => r.RecalcStyleCount)),
    RecalcStyleDuration: pick(r => r.RecalcStyleDuration),
    LayoutCount: Math.round(pick(r => r.LayoutCount)),
    LayoutDuration: pick(r => r.LayoutDuration),
    ScriptDuration: pick(r => r.ScriptDuration),
    TaskDuration: pick(r => r.TaskDuration),
  };
}

function frameStats(frames) {
  if (!frames.length) return { n: 0 };
  const sorted = [...frames].sort((x, y) => x - y);
  const q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const sum = frames.reduce((s, v) => s + v, 0);
  return {
    n: frames.length,
    avg: +(sum / frames.length).toFixed(2),
    p50: +q(0.5).toFixed(2),
    p90: +q(0.9).toFixed(2),
    max: +sorted[sorted.length - 1].toFixed(2),
    fps: +(1000 / (sum / frames.length)).toFixed(1),
    janky: frames.filter(f => f > 33.4).length,   // 掉到 30fps 以下的帧数
  };
}

/* 页面内采样器：只记录 rAF 间隔；不碰页面自己的状态 */
const SAMPLER_BOOT = `(() => {
  const S = window.__cbPerf = { frames: [], on: false, last: 0 };
  const tick = t => {
    if (!S.on) return;
    S.frames.push(t - S.last); S.last = t;
    requestAnimationFrame(tick);
  };
  S.start = () => { S.frames = []; S.on = true; S.last = performance.now(); requestAnimationFrame(tick); };
  S.stop = () => { S.on = false; return S.frames; };
})();`;

const IDLE_RUN = `(async () => {
  const S = window.__cbPerf;
  S.start();
  await new Promise(r => setTimeout(r, 3000));
  return S.stop();
})()`;

const SCROLL_RUN = `(async () => {
  const S = window.__cbPerf;
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const RANGE = 720, STEP = 6;
  /* 预热：让开场序列与首次排版落定，别把首帧的一次性成本算进稳态 */
  for (let i = 0; i < 20; i++) await frame();
  window.scrollTo(0, 0);
  for (let i = 0; i < 5; i++) await frame();
  S.start();
  for (let y = 0; y <= RANGE; y += STEP) { window.scrollTo(0, y); await frame(); }
  for (let y = RANGE; y >= 0; y -= STEP) { window.scrollTo(0, y); await frame(); }
  return S.stop();
})()`;

const FULL_RUN = `(async () => {
  const S = window.__cbPerf;
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const max = document.documentElement.scrollHeight - innerHeight;
  window.scrollTo(0, 0);
  for (let i = 0; i < 10; i++) await frame();
  const STEP = 10;   /* 中速滑动：约 10px/帧，接得近手指慢扫的手感 */
  S.start();
  for (let y = 0; y <= max; y += STEP) { window.scrollTo(0, y); await frame(); }
  for (let y = max; y >= 0; y -= STEP) { window.scrollTo(0, y); await frame(); }
  return S.stop();
})()`;

async function evaluate(cdp, expression, awaitPromise = false) {
  const r = await cdp.send('Runtime.evaluate', {
    expression, awaitPromise, returnByValue: true, timeout: 120000,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result?.value;
}

async function waitComplete(cdp, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(cdp, 'document.readyState') === 'complete') return;
    await sleep(100);
  }
  throw new Error('页面加载超时');
}

/* 查某个元素上实际注册的事件监听类型（CDP 的 DOMDebugger）。
   只掏一层（depth:0）—— 卡片的四条 hover 监听就挂在容器自己身上，不在子节点。
   用它做「hover 是否真的被禁用」的判据：画面在无头环境里没有指针，看不出差别。 */
async function checkHover(cdp) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: 'document.getElementById("cardStack")',
    objectGroup: 'hovercheck',
  });
  const objectId = r && r.result && r.result.objectId;
  if (!objectId) return null;
  let types;
  try {
    const res = await cdp.send('DOMDebugger.getEventListeners', { objectId, depth: 0 });
    types = ((res && res.listeners) || []).map(l => l.type).sort();
  } finally {
    cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'hovercheck' }).catch(() => { });
  }
  return types;
}

async function main() {
  const { server, port } = await startServer();
  const { proc, userDataDir, wsUrl } = await startChrome();
  const cdp = await CDP.connect(wsUrl);

  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });

    /* 设备模拟：视口 / DPR / 触屏。开触屏才会让 (pointer: coarse) 变成 true ——
       这是「手机轻量档」媒体查询的判定依据，两侧条件必须一致。
       --desktop 时三样全部关掉，让页面按真正的桌面条件走（pointer: fine）。 */
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: VIEW.width, height: VIEW.height,
      deviceScaleFactor: VIEW.dpr, mobile: !DESKTOP,
      screenWidth: VIEW.width, screenHeight: VIEW.height,
    });
    if (!DESKTOP) {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });

    /* 语言注入必须在 navigate 之前注册：addScriptToEvaluateOnNewDocument 对这次导航即生效，
       页面脚本（含 index.html 那段 <head> 协商脚本）读到的就是这里覆盖的值。 */
    if (LANG_HINT) {
      const tag = LANG_HINT;
      const head = tag.toLowerCase().split('-')[0];
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: 'try{'
          + `Object.defineProperty(navigator,'language',{get:function(){return '${tag}';},configurable:true});`
          + `Object.defineProperty(navigator,'languages',{get:function(){return ['${tag}','${head}'];},configurable:true});`
          + '}catch(e){}'
      });
    }

    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/${PAGE_PATH}` });
    await waitComplete(cdp);
    /* 开场序列（云海浮入 / 日月下落 / AX 描边）约 3s，等它跑完再量稳态。
       子页面（apps/）没有开场，但要留时间给 MathJax 这类异步排版跑完。 */
    await sleep(PAGE_PATH === 'index.html' ? 3600 : 7000);
    await evaluate(cdp, SAMPLER_BOOT);

    const env = await evaluate(cdp, `JSON.stringify({
      coarse: matchMedia('(pointer: coarse)').matches,
      wide: innerWidth, h: innerHeight, dpr: devicePixelRatio,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      scrollH: document.documentElement.scrollHeight
    })`);

    /* ---------- 三个场景，每个在同会话内重复取样取中位 ----------
       ① 静置：只让常驻动画烧，量出「什么都不做」的底噪
       ② 首屏行程 0→720→0：场景层最密集的一段
       ③ 整页：文章卡片 / 时间线 / 侧栏一起过 */
    const idle = SHOT_ONLY ? null : await measure(cdp, IDLE_RUN, 3, METRICS_OF_INTEREST);
    const scroll = SHOT_ONLY ? null : await measure(cdp, SCROLL_RUN, 3, METRICS_OF_INTEREST);
    const full = SHOT_ONLY ? null : await measure(cdp, FULL_RUN, 2, METRICS_OF_INTEREST);

    /* ---------- 悬停监听的确定性检查 ----------
       截图证明不了这件事：无头环境里根本没有指针，无论监听挂没挂，画面都一样。
       所以直接问 CDP 卡片容器上到底挂了哪些事件监听 —— 手机上应当一个 pointer 监听都没有。
       （桌面档用来做对照，那里应当数到 pointermove / pointerover / pointerleave 三条。） */
    const hoverListeners = await checkHover(cdp);

    /* ---------- 语言审计：切英文后，还有哪些文本是中文 ---------- */
    if (AUDIT) {
      /* 先记下点击前的状态：初始语言、一个典型双语元素的属性值 ——
         若 data-en 本身就是中文，或 textContent 与 data-en 不一致，问题就在这里。 */
      console.log('   初始 data-lang = ' + await evaluate(cdp, `document.documentElement.dataset.lang`));
      console.log('   skip-link 探针 = ' + await evaluate(cdp, `(() => {
        const a = document.querySelector('.skip-link');
        if (!a) return 'none';
        return 'text=' + JSON.stringify(a.textContent.trim())
             + ' zh=' + JSON.stringify(a.getAttribute('data-zh'))
             + ' en=' + JSON.stringify(a.getAttribute('data-en'));
      })()`));
      const switched = await evaluate(cdp, `(() => {
        const b = document.querySelector('[data-lang-choice="en"]');
        if (b) { b.click(); return true; }
        return false;
      })()`);
      console.log('   切到英文: ' + (switched ? 'ok' : '没找到语言按钮'));
      await sleep(1500);   // 等卡片叠距重算 + 目录重建
      console.log('   点击后 skip-link 探针 = ' + await evaluate(cdp, `(() => {
        const a = document.querySelector('.skip-link');
        return a ? 'text=' + JSON.stringify(a.textContent.trim()) : 'none';
      })()`));
      const raw = await evaluate(cdp, AUDIT_EXPR);
      const list = JSON.parse(raw || '[]');
      const shown = list.filter(x => x.shown);
      const hidden = list.filter(x => !x.shown);
      console.log(`   仍含中文的文本节点: ${list.length}（可见 ${shown.length} / 隐藏 ${hidden.length}）`);
      console.log('   html[data-lang] = ' + await evaluate(cdp, `document.documentElement.dataset.lang`));
      for (const x of shown) {
        const pair = x.zhv || x.env ? ` [zh=${x.zhv} | en=${x.env}]` : '';
        console.log(`     <${x.tag}.${x.cls}>${pair} ${x.text}`);
      }
      for (const x of hidden) {
        const pair = x.zhv || x.env ? ` [zh=${x.zhv} | en=${x.env}]` : '';
        console.log(`     (隐藏) <${x.tag}.${x.cls}>${pair} ${x.text}`);
      }
    }

    /* ---------- 语言协商：英文浏览器下，首次访问 / 手动选过 两条分支 ---------- */
    if (NEGO) {
      /* 覆盖 navigator.language(s)：addScriptToEvaluateOnNewDocument 在文档创建后、
         页面脚本执行前注入，所以页面读到的就是目标语言。
         已经在导航前用 --lang-hint 注过就不重复注册。 */
      if (!LANG_HINT) {
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: "try{"
            + "Object.defineProperty(navigator,'language',{get:function(){return 'en-US';},configurable:true});"
            + "Object.defineProperty(navigator,'languages',{get:function(){return ['en-US','en'];},configurable:true});"
            + "}catch(e){}"
        });
      }
      const readLang = () => evaluate(cdp, `JSON.stringify({
        dataLang: document.documentElement.dataset.lang,
        htmlLang: document.documentElement.lang,
        saved: (() => { try { return localStorage.getItem('cb:lang'); } catch (e) { return 'ERR'; } })(),
        navLangs: (navigator.languages || []).join(','),
        bodyText: (document.querySelector('.skip-link') || {}).textContent || '',
      })`);

      await evaluate(cdp, `(() => { try { localStorage.removeItem('cb:lang'); } catch (e) { } return true; })()`);
      await cdp.send('Page.reload');
      await sleep(1800);
      console.log('   ① 首次访问（英文浏览器，无存档）:\n     ' + await readLang());

      await evaluate(cdp, `(() => { try { localStorage.setItem('cb:lang', 'zh'); } catch (e) { } return true; })()`);
      await cdp.send('Page.reload');
      await sleep(1800);
      console.log('   ② 手动选过中文（存档 cb:lang=zh）:\n     ' + await readLang());
    }

    let geom = null;
    if (GEOM) {
      await evaluate(cdp, 'window.scrollTo(0, 1200)');
      await sleep(1400);   // 等编舞与下堆落位
      geom = await evaluate(cdp, GEOM_EXPR);
      console.log('   几何: ' + geom);
      await evaluate(cdp, 'window.scrollTo(0, 0)');
    }

    /* ---------- 可选：跨断点 resize（--resize-to=1440x900） ----------
       列表态（不 --open）在导航后立刻改；阅读页（--open）在点开之后改 ——
       要测的是「手机档已经打开/已经落位之后被拉宽」，不是「桌面上重新打开」。 */
    const applyResizeTo = async () => {
      const m = RESIZE_TO.match(/^(\d+)x(\d+)$/);
      if (!m) { console.log('   --resize-to 格式应为 1440x900'); return; }
      const w = +m[1], h = +m[2];
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: 1, mobile: false,
        screenWidth: w, screenHeight: h,
      });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      /* 700ms：够 resize 回调（reader.js 的目录形态有 120ms 防抖）跑完 */
      await sleep(700);
      console.log('   改视口: ' + w + '×' + h);
    };

    /* ---------- 可选：降级后的构图截图（确认「关掉的只是动画与模糊，不是内容」） ---------- */
    if (SHOT) {
      await mkdir(SHOT, { recursive: true });
      if (DAY) await evaluate(cdp, `document.documentElement.dataset.theme = 'day'`);
      if (RESIZE_TO && !OPEN) await applyResizeTo();
      if (OPEN) {
        /* 点开第一张卡。阅读页由 blog.js 派发 post:open 后 reader.js 注入正文，
           FLIGHT 飞行 + 正文淡入大约 2.4s，等够再截。 */
        const clicked = await evaluate(cdp, `(() => {
          const btn = document.querySelector('.post .post__toggle');
          if (!btn) return false;
          btn.click();
          return true;
        })()`);
        console.log('   点开阅读页: ' + (clicked ? 'ok' : '没找到 .post__toggle'));
        await sleep(2800);
        if (TOC) {
          const tocClicked = await evaluate(cdp, `(() => {
            const b = document.querySelector('.post.is-full .post__toc');
            if (!b) return false;
            b.click();
            return true;
          })()`);
          console.log('   点开目录: ' + (tocClicked ? 'ok' : '没找到 .post__toc'));
          await sleep(600);
        }
        if (OPEN && RESIZE_TO) await applyResizeTo();
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const file = path.join(SHOT, (DAY ? 'day-' : '') + (TOC ? 'open-toc.png' : 'open.png'));
        await writeFile(file, Buffer.from(data, 'base64'));
        console.log('   截图 -> ' + file);
      } else {
        for (const y of [0, 1200, 2200]) {
          await evaluate(cdp, `window.scrollTo(0, ${y})`);
          /* 卡片入场编舞 CHOREO_IN = 1.2s，加 0.8s 单张过渡 —— 等 2.2s 才是稳定态，
             否则截到的是「正在入场」的中间帧，不能拿来判断排版。 */
          await sleep(2200);
          const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
          const file = path.join(SHOT, (DAY ? 'day-' : '') + `y${String(y).padStart(4, '0')}.png`);
          await writeFile(file, Buffer.from(data, 'base64'));
          console.log('   截图 -> ' + file);
        }
      }
      /* 量测放在两个截图分支都跑完之后：列表态与阅读页共用同一段，
         免得同一套代码在两个分支里各写一遍 */
      if (RECTS) {
        const list = RECTS.split(',').map(s => JSON.stringify(s.trim())).join(',');
        const code = '(() => { const sels = [' + list + '];' +
          'return sels.map(function (s) {' +
          '  const el = document.querySelector(s);' +
          '  if (!el) return s + " -> 未找到";' +
          '  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);' +
          '  return s + " -> x=" + Math.round(r.x) + " y=" + Math.round(r.y) +' +
          '    " w=" + Math.round(r.width) + " h=" + Math.round(r.height) +' +
          '    " pos=" + cs.position + " cols=" + cs.gridTemplateColumns +' +
          '    " op=" + cs.opacity + " cls=" + (el.className || "") +' +
          '    " overflow=" + cs.overflow + " tf=" + (cs.transform === "none" ? "none" : "有") +' +
          '    " tier=" + (el.dataset && el.dataset.tier ? el.dataset.tier : "-");' +
          '}).join("\\n"); })()';
        console.log('   量测:\n' + (await evaluate(cdp, code)));
      }
      await evaluate(cdp, 'window.scrollTo(0, 0)');
    }

    const report = {
      label: LABEL,
      env: JSON.parse(env),
      view: VIEW, cpuThrottle: CPU_THROTTLE,
      idle, scroll, full,
      hoverListeners,
      geom,
    };

    print(report);
    console.log('JSON ' + JSON.stringify(report));
  } finally {
    cdp.close();
    try { proc.kill(); } catch { }
    server.close();
    await sleep(400);
    try { await rm(userDataDir, { recursive: true, force: true }); } catch { }
  }
}

function print(r) {
  const pct = v => v == null ? '-' : Math.round(v * 100) + '%';
  const ms = v => (v == null ? '-' : (v * 1000).toFixed(1) + 'ms');
  const f = s => `${s.frames.n} 帧 · 平均 ${s.frames.avg}ms · P50 ${s.frames.p50}ms · P90 ${s.frames.p90}ms · 最差 ${s.frames.max}ms · ${s.frames.fps}fps · 掉帧 ${s.frames.janky}（单轮 ${s.samples.join('/')}）`;
  console.log('');
  console.log(`【${r.label}】${r.view.width}×${r.view.height} @${r.view.dpr}x · CPU ${r.cpuThrottle}x 节流 · ${r.env.coarse ? '触屏模拟' : '桌面（无触屏）'}`);
  console.log(`   环境: ${JSON.stringify(r.env)}`);
  console.log('   #cardStack 监听: ' + (r.hoverListeners == null
    ? '未取到'
    : (r.hoverListeners.length ? r.hoverListeners.join(', ') : '（无）')));
  if (!r.idle) { console.log('   （只截图模式，未测量）'); console.log(''); return; }
  console.log('   ── ① 静置 3s（常驻动画底噪）');
  console.log('      帧: ' + f(r.idle));
  console.log(`      重算样式 ${r.idle.RecalcStyleCount} 次 ${ms(r.idle.RecalcStyleDuration)} · 布局 ${r.idle.LayoutCount} 次 ${ms(r.idle.LayoutDuration)}`);
  console.log(`      主线程 ${ms(r.idle.TaskDuration)}（脚本 ${ms(r.idle.ScriptDuration)}）`);
  console.log('   ── ② 首屏行程滚动 0→720→0');
  console.log('      帧: ' + f(r.scroll));
  console.log(`      重算样式 ${r.scroll.RecalcStyleCount} 次 ${ms(r.scroll.RecalcStyleDuration)} · 布局 ${r.scroll.LayoutCount} 次 ${ms(r.scroll.LayoutDuration)}`);
  console.log(`      主线程 ${ms(r.scroll.TaskDuration)}（脚本 ${ms(r.scroll.ScriptDuration)}）`);
  console.log('   ── ③ 整页滚动（含文章卡片 / 时间线）');
  console.log('      帧: ' + f(r.full));
  console.log(`      重算样式 ${r.full.RecalcStyleCount} 次 ${ms(r.full.RecalcStyleDuration)} · 布局 ${r.full.LayoutCount} 次 ${ms(r.full.LayoutDuration)}`);
  console.log(`      主线程 ${ms(r.full.TaskDuration)}（脚本 ${ms(r.full.ScriptDuration)}）`);
  console.log('');
}

main().catch(e => { console.error('探针失败:', e); process.exit(1); });
