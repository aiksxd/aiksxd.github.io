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

    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await waitComplete(cdp);
    /* 开场序列（云海浮入 / 日月下落 / AX 描边）约 3s，等它跑完再量稳态 */
    await sleep(3600);
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

    /* ---------- 可选：降级后的构图截图（确认「关掉的只是动画与模糊，不是内容」） ---------- */
    if (SHOT) {
      await mkdir(SHOT, { recursive: true });
      for (const y of [0, 1200]) {
        await evaluate(cdp, `window.scrollTo(0, ${y})`);
        /* 卡片入场编舞 CHOREO_IN = 1.2s，加 0.8s 单张过渡 —— 等 2.2s 才是稳定态，
           否则截到的是「正在入场」的中间帧，不能拿来判断排版。 */
        await sleep(2200);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const file = path.join(SHOT, `y${String(y).padStart(4, '0')}.png`);
        await writeFile(file, Buffer.from(data, 'base64'));
        console.log('   截图 -> ' + file);
      }
      await evaluate(cdp, 'window.scrollTo(0, 0)');
    }

    const report = {
      label: LABEL,
      env: JSON.parse(env),
      view: VIEW, cpuThrottle: CPU_THROTTLE,
      idle, scroll, full,
      hoverListeners,
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
