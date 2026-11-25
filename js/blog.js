/* ==========================================================================
   Cloudiest Blog — 交互脚本
   修复旧版致命错误：
   1. createTextNode 返回文本节点，没有 classList（原 dom.classList.add(stars)）
   2. stars / style 都是未定义变量，脚本在绑定后抛 ReferenceError 中断
   3. clouds[0] / clouds[1] 未判空，缺少图片时继续报错
   4. 内联 onclick 依赖全局函数，改用事件委托
   动画常驻播放，不读取系统「减少动态效果」设置。
   ========================================================================== */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const html = document.documentElement;

  /* ---------- 手机轻量档判定 ----------
     这条判定必须与 css/mobile-lite.css 的媒体查询**逐字一致**，
     否则会出现「样式降级了、脚本还在按桌面规格造层」或者反过来。
     触屏窄屏走轻量档；桌面（pointer: fine）无论窗口多窄都保持完整效果。
     判一次就够：转屏 / 改变窗口宽度属于罕见的重排场景，不值得挂 listener。 */
  const LITE = !!(window.matchMedia && (
    window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches ||
    window.matchMedia('(max-width: 600px)').matches
  ));

  /* ---------- 设备档位（tier）：手机档内再分三档 ----------
     轻量档原来是一刀切（触屏窄屏全部按最省跑）。但同一套「最省」放在旗舰机上
     明显浪费 —— 那些机器能跑更多星点、更细的云海色阶。这里用三个信号估一次：
       · navigator.hardwareConcurrency — 全平台都有，反映大核规模（低端 4 / 中端 6~8 / 旗舰 8+）
       · navigator.deviceMemory        — 只有 Chrome 系有（iOS Safari 读不到，按未知处理）
       · innerWidth × innerHeight × DPR² — 真正要填充的设备像素，DPR3 的 390 屏就是 296 万
     判据只用于**下调**动效规模（云海色阶 / 星点数量 / --p 精度），不改结构、不改交互。
     桌面一律 full：桌面那套降级由 motion.css 的 steps() 阶梯负责，不该被手机规则牵连。
     结果挂到 html[data-tier]，CSS 侧要按档位收紧时可以直接用。 */
  const TIER_FORCED = (function () {
    const m = /[?&]tier=(lite|mid|full)\b/.exec(location.search);
    return m ? m[1] : '';
  })();
  const TIER = TIER_FORCED || (!LITE ? 'full'
    : ((navigator.hardwareConcurrency || 4) <= 4
       || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2)
       || (window.innerWidth * window.innerHeight * Math.pow(window.devicePixelRatio || 1, 2)) > 3.6e6)
      ? 'lite'
    : ((navigator.hardwareConcurrency || 4) <= 6
       || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 3))
      ? 'mid'
    : 'full');
  html.dataset.tier = TIER;

  // 由 initParallax 注入：程序化滚动（锚点按钮 / 回顶部）与滚轮共用同一条插值通道
  let smoothScrollTo = null;
  // 由 initSplit 注入：?post=post-N 深链把目标卡挪进当前页并锁定，返回那张卡
  let revealPost = null;
  // 由 initSplit 注入：时间线标题是从卡片里抄来的快照，切语言后要重建
  let refreshSplitLine = null;
  // 由 initSplit 注入：搜索框的命中结果决定左侧该露哪几张卡，过滤完要让叠层重新排一遍
  let refreshSplitCards = () => {};
  // 由 initSplit 注入：搜索也筛作品集，命中与否决定「要不要滚到那一块」
  let applyAppsFilter = () => false;
  // 当前搜索词。作品集那一块重建（切语言）时要把行按它重新筛一遍，否则重建即丢过滤
  let searchNeedle = '';

  /* ---------- 进出场的唯一事实依据：流星线此刻是否「在场」 ----------
     initSplit 的 paintFlow 每帧算「线画了多长」，状态一变就在这里落一个布尔量
       （入场 = 线长 > 2px，出场 = 线彻底退回 0，两个阈值分开防抖）。
     卡片堆只认这一个信号（setCardFlow 由 initPosts 注入），
     不再各自监听 scroll、各自判卡片在视口里的位置 —— 那就是「两块逻辑各播一遍」的来源。 */
  let flowState = false;
  let setCardFlow = () => {};

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('cb:' + key); return v === null ? fallback : v; }
      catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('cb:' + key, value); } catch (_) { /* 隐私模式忽略 */ }
    }
  };

  /* ---------- 云海着色：白阶基础色 ↔ 主题色板，按滚动进度 p 线性插值后直填 SVG stop。
     SVG stop 的 color-mix(含 var 比例/min/calc) 在本环境解析不可靠，改由 JS 算好纯色写入。 */
  const CLOUD_WHITE = {
    far: ['#d6d8e4', '#bcbecf'], mid: ['#eceef4', '#d3d5e0'], near: ['#ffffff', '#e4e5ec'],
    fog: ['#dcdee8', '#c4c6d4'], shelf: ['#d6d8e4', '#bcbecf']
  };
  const CLOUD_BOARD = {
    night: {
      far: ['#4a4a86', '#2b2f60'], mid: ['#827cbd', '#40407b'], near: ['#c0b6ee', '#6a61a8'],
      fog: ['#8880c4', '#333063'], shelf: ['#4a4a86', '#2b2f60']
    },
    day: {
      far: ['#ffe1c6', '#f0aa92'], mid: ['#ffc296', '#dd7a78'], near: ['#fff0d2', '#eb8d76'],
      fog: ['#ffc79c', '#c86670'], shelf: ['#ffe1c6', '#f0aa92']
    }
  };
  let currentP = 0;
  /* 云海上色的量化游标：见 paintClouds 里的说明 */
  let cloudT = -1, cloudTheme = '';

  function hexRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mixHex(a, b, t) {
    const A = hexRgb(a), B = hexRgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function paintClouds(p) {
    currentP = p;
    const theme = html.dataset.theme === 'day' ? 'day' : 'night';
    /* 云海变色按 1/128 量化：p*2 在 0.5 处就满色，所以整段滚动最多写 128 次，
       不再是「每个滚动变化帧都重写 ~30 个 <stop>」。每次改 stop-color 都会让
       那两张 50vw 的云海 SVG 重新光栅化，这是滚动路径上最大的一笔冤枉开销；
       1/128 的色阶在 8-bit 色彩下不足 1 个色值，肉眼无差。
       主题切换时 theme 变化会强制重刷一次，不受量化影响。

       手机轻量档再降到 1/32：每改一次 stop-color，那两张 50vw 的云海 SVG
       都要重新光栅化（DPR 3 下各约 82 万设备像素）。32 级在手机上仍然平滑
       （云海从白到紫的过渡本身铺在几百像素上），但重绘次数是原来的 1/4。 */
    const STEPS = TIER === 'lite' ? 24 : TIER === 'mid' ? 40 : LITE ? 56 : 128;
    const t = Math.round(Math.min(1, Math.max(0, p * 2)) * STEPS) / STEPS;
    if (t === cloudT && theme === cloudTheme) return;
    cloudT = t; cloudTheme = theme;
    const board = CLOUD_BOARD[theme], white = CLOUD_WHITE;
    ['far', 'mid', 'near', 'fog', 'shelf'].forEach(k => {
      ['cn', 'cd'].forEach(pre => {
        const g = $(`#${pre}-${k}`);
        if (!g) return;
        g.querySelectorAll('stop').forEach((st, i) => {
          st.style.stopColor = mixHex(white[k][i], board[k][i], t);
        });
      });
    });
  }

  /* ---------- 星空：分组承载闪烁动画 ----------
     旧版 222 个星点各自运行 opacity 动画，每帧 222 次样式/合成更新。
     改为 4 个分组容器的 opacity 动画：星点保持静态亮度 --o，
     组动画 .35→1 与之相乘，亮度区间不变，相位按 4 组错开。 */
  const STAR_GROUPS = 4;

  function makeStarGroups(box) {
    const groups = [];
    const frags = [];
    for (let g = 0; g < STAR_GROUPS; g++) {
      const group = document.createElement('div');
      group.className = 'star-group';
      group.style.setProperty('--d', (1.9 + g * 0.8).toFixed(1) + 's');
      group.style.setProperty('--delay', (-g * 0.7).toFixed(1) + 's');
      frags.push(document.createDocumentFragment());
      box.appendChild(group);
      groups.push(group);
    }
    return { groups, frags };
  }

  function commitStarGroups(groups, frags) {
    groups.forEach((g, i) => g.appendChild(frags[i]));
  }

  function buildStars() {
    const box = $('#stars');
    if (!box) return;
    const { groups, frags } = makeStarGroups(box);
    /* 手机轻量档：72 → 24。星点数量不只是绘制成本 —— .scene 子树里每多一个元素，
       滚动时 --p 每次变化都要多遍历、重算一次样式（实测这一项是手机端最大的一笔）。
       取 24 = 4 组各 6 颗，组间相位错开，视觉上仍是「一片星空」而不是几颗孤星。 */
    const total = TIER === 'lite' ? 20 : TIER === 'mid' ? 32 : LITE ? 44 : 72;
    for (let i = 0; i < total; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.style.left = (Math.random() * 100).toFixed(2) + '%';
      star.style.top  = (Math.random() * 88).toFixed(2) + '%';
      star.style.setProperty('--s', (1 + Math.random() * 2.2).toFixed(1) + 'px');
      star.style.setProperty('--o', (0.25 + Math.random() * 0.6).toFixed(2));
      // 保留这颗星原本的随机调用（--d 由组级动画接管），维持随机序列不变
      star.style.setProperty('--d', (1.6 + Math.random() * 3).toFixed(1) + 's');
      frags[i % STAR_GROUPS].appendChild(star);
    }
    commitStarGroups(groups, frags);
  }

  /* 银河星尘：沿一条斜带撒点，夜间随滚动逐渐显现 */
  function buildGalaxyStars() {
    const box = $('#galaxyStars');
    if (!box) return;
    const { groups, frags } = makeStarGroups(box);
    /* 手机轻量档：150 → 44。银河星尘本来就只有 1~2px，小屏上密度差一半看不出来，
       但省下的是一整层 150 个元素的重算与合成。 */
    const total = TIER === 'lite' ? 36 : TIER === 'mid' ? 64 : LITE ? 100 : 150;
    for (let i = 0; i < total; i++) {
      const t = Math.random();
      // 近似正态的带宽扰动，让星尘中间密、两侧疏；
      // 基线从左下 (8%,74%) 斜向右上 (92%,44%)，与 .galaxy 的 -19deg 亮带重合
      const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 11;
      const star = document.createElement('span');
      star.className = 'galaxy-star';
      star.style.left = (8 + t * 84 + spread * .55).toFixed(2) + '%';
      star.style.top  = (74 - t * 30 + spread).toFixed(2) + '%';
      star.style.setProperty('--s', (0.8 + Math.random() * 1.9).toFixed(1) + 'px');
      star.style.setProperty('--o', (0.28 + Math.random() * 0.66).toFixed(2));
      star.style.setProperty('--d', (1.4 + Math.random() * 3.2).toFixed(1) + 's');
      const tint = ['#e7dcff', '#bcd2ff', '#ffd2ee', '#ffffff'][i % 4];
      star.style.background = tint;
      frags[i % STAR_GROUPS].appendChild(star);
    }
    commitStarGroups(groups, frags);
  }

  /* ---------- 主题（夜间 / 日间）/ 语言 / 排版偏好 ---------- */

  // 在 <html> 上切 data-theme，组件样式全部走 CSS 令牌，无需逐条改。
  // 云海 night/day 两套几何由 CSS 按 data-theme 显隐，颜色走 --cloud-* 令牌。
  function applyTheme(mode) {
    html.dataset.theme = mode === 'day' ? 'day' : 'night';
    store.set('theme', html.dataset.theme);
    $$('[data-theme-choice]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.themeChoice === html.dataset.theme));
    paintClouds(currentP); // 切换主题后按当前进度重绘云海配色
  }

  const SUPPORTED_LANG = ['zh', 'en'];

  /* 首访语言：手动选择 > 浏览器语言 > 中文。
     手动选过的（localStorage cb:lang 有值）直接用 —— 用户点过按钮就是明确意图，
     不该被浏览器偏好拉回去。
     没选过的，协商结果由 index.html <head> 里那段同步脚本写好（它比这份 defer 脚本早得多），
     这里只负责沿用，避免两处各长一套规则；读不到就回退中文（站点主体是中文）。 */
  function pickLang() {
    const saved = store.get('lang', null);
    if (SUPPORTED_LANG.includes(saved)) return saved;
    return html.dataset.lang === 'en' ? 'en' : 'zh';
  }

  /* persist=false 用于首访协商：协商结果**不写** localStorage。
     否则第一次进站就把那一刻的浏览器语言固化成「手动选择」，用户之后改了浏览器语言也不会跟随。
     点按钮 / 快捷键那条路径走默认值 true，一律持久化。 */
  function applyLang(lang, persist = true) {
    html.dataset.lang = lang === 'en' ? 'en' : 'zh';
    html.lang = html.dataset.lang === 'en' ? 'en' : 'zh-CN';
    if (persist) store.set('lang', html.dataset.lang);
    const key = html.dataset.lang;
    $$('[data-zh][data-en]').forEach(el => { el.textContent = el.dataset[key]; });
    $$('[data-zh-ph][data-en-ph]').forEach(el => {
      el.placeholder = key === 'en' ? el.dataset.enPh : el.dataset.zhPh;
    });
    /* 带图标的按钮不能写 data-zh/data-en —— 那条通道是 textContent，会把里面的 <svg> 抹掉。
       所以 aria-label 单独走一条 data-zh-aria / data-en-aria。 */
    $$('[data-zh-aria][data-en-aria]').forEach(el => {
      el.setAttribute('aria-label', key === 'en' ? el.dataset.enAria : el.dataset.zhAria);
    });
    // 语言分段按钮同步高亮（原工具栏的 EN 按钮已随导航栏删除）
    $$('[data-lang-choice]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.langChoice === key));
    // 右半时间线抄的是卡片标题的快照，语言变了要重建一遍
    if (refreshSplitLine) refreshSplitLine();
    /* 摘要的中英文长短差得多（英文普遍长三成以上），卡片高度跟着变，
       叠距、是否溢出到滚动、卡片的视觉框都得重算 —— 但 layout 定义在 initSplit 里
       （它是闭包，不能从这里直呼），所以交给 initSplit 内部那个 langchange 监听。
       阅读页里那份正文是编译期拼好的字符串，它自己监听这个事件整块重建
       （中文版读 data.html、英文版读 data.htmlEn） */
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: key } }));
  }

  /* ---------- 侧栏抽屉 ---------- */
  function toggleSidebar(force, anchor) {
    const sidebar = $('#sidebar');
    const scrim = $('#scrim');
    if (!sidebar || !scrim) return;
    const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');

    sidebar.classList.toggle('is-open', open);
    sidebar.setAttribute('aria-hidden', String(!open));
    sidebar.inert = !open; // 关闭时移出 Tab 顺序
    $$('[data-action="settings"]').forEach(b => b.setAttribute('aria-expanded', String(open)));

    if (open) {
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('is-open'));
      if (anchor) {
        const target = $(anchor);
        if (target) setTimeout(() => target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
      }
    } else {
      scrim.classList.remove('is-open');
      setTimeout(() => { if (!sidebar.classList.contains('is-open')) scrim.hidden = true; }, 380);
    }
  }

  /* 搜索栏随滚动的透明度：抛物线，谷底（最透）提前到 p=.35。
     线性淡出到「滚到文章标题上」时还留着六七成不透明，正好挡住正文；
     先快速掉到 10%，再缓慢回升到 55%（钉在屏顶时就是半透明的一片玻璃）。
     分段二次：前半 t² 起手陡、后半 1-(1-t)² 收尾缓。改档位只动这三个常量。 */
  const DOCK_GAP = 0.35;   // 谷底所在进度
  const DOCK_LOW = 0.10;   // 谷底透明度（最透明）
  const DOCK_END = 0.55;   // 终点透明度（钉在屏顶时）
  function dockOpacity(p) {
    if (p <= DOCK_GAP) {
      const t = p / DOCK_GAP;
      return 1 - (1 - DOCK_LOW) * t * t;
    }
    const t = (p - DOCK_GAP) / (1 - DOCK_GAP);
    return DOCK_LOW + (DOCK_END - DOCK_LOW) * (1 - (1 - t) * (1 - t));
  }

  /* ---------- 滚动：滚动条自身线性插值，动画直接读同一个 y ----------
     · 系统关闭动画效果时，浏览器原生滚轮平滑也会被一起关掉，wheel 变成逐档瞬跳，
       依赖 scrollY 的视差（辉光 / 银河 / 余晖 / 月亮 / 云海）便「一段一段」。
       因此被插值的是「滚动条位置」本身：wheel 只累加目标 targetY，rAF 每帧把真实
       scrollY 朝目标做线性插值并 scrollTo，整页内容随同一个连续值移动。
     · paint() 与 scrollTo 在同一帧执行，且读回真实 scrollY 计算，元素位置不做任何
       单独插值 —— 避免动画值落后于滚动条（连续滚动下的滞留）。
     · 插值按帧时间归一化（dt/16.67），60/120/144Hz 手感一致；不读取系统动画偏好，
       不受 OS「减少动态效果」开关影响。
     · 性能保护沿用上一轮：--p 局部在 #scene（contain: layout paint）、只在值变化时
       写 DOM、随动属性全是 transform / opacity、无大面积 blur、滚过 RANGE 后零写入。 */
  /* 标题组的滚动透明度（--heroFade）只由三个东西决定，没有别的分支：
     · 一条绝对公式：`1 - 当前行程比例`（行程 = SCENE_RANGE），下滚变淡、上滚变浓；
     · 一个冻结标记 heroFaded：真的淡到 0 之后置位，此后恒 0（上滚也不回升）；
     · 一次重播：heroFaded 置位的状态下回到顶部区（HERO_REPLAY_AT 以内）时，
       playHeroRise() 解锁 + 挂 is-hero-rise，由 css 的 heroFadeIn + riseIn 把它整体淡入。
     用绝对位置而不是「相对重播点」的原因是：相对基准会让重播之后的淡出起点飘走
     （实测重播过的页面在 y=300 就不再变淡，而首屏是同一位置就该淡到 .58），
     而这条绝对公式在任何时刻都给出同一个答案。 */
  let heroFadeLast = -1;    // 上次写进 --heroFade 的值，只用来避免重复写
  let heroFaded = false;    // 已完全淡出（冻结，等回顶重播解锁）

  /* 场景行程（--p 走完 0→1 的滚动距离），也是标题组淡完的距离 */
  const SCENE_RANGE = 720;
  /* 标题组重播阈值：比 AX 的 400 更靠顶 —— 字都看不见了才值得重新长出来，
     阈值放宽会让「刚上滚一点就又播一遍」，反而更乱。 */
  const HERO_REPLAY_AT = 200;

  function initParallax() {
    const scene = $('#scene');
    const banks = $$('.cloud-bank');
    const stars = $('#stars');
    const dock = $('#searchDock');
    if (!banks.length || !scene) return;

    const RANGE  = SCENE_RANGE;   // 辉光 / 银河 / 余晖 / 月亮完成行程
    const SMOOTH = 0.18;   // 每 16.67ms 的插值比例（lerp）
    const EPS    = 0.4;    // 收敛阈值，避免无限尾帧

    let lastP = -1;
    let lastClamped = -1;

    /* 手机轻量档：把 --p 再切成 48 级（720px 行程 → 每级 15px）。
       每写一次 --p，.scene 整棵子树（云海 SVG 的每个 stop、几十颗星、日月各层）
       都要重新计算样式 —— 实测这是手机滚动时最大的一笔主线程开销。
       场景层的位移只有行程的 0.06~0.17 倍，15px 一级约等于 1~2px 的图层位移，
       在整屏都在滚动的画面上不可辨；桌面仍按像素全精度走。 */
    const P_LEVELS = LITE ? (TIER === 'lite' ? 48 : 72) : 0;

    function paint(y) {
      const clamped = Math.max(0, Math.min(y, RANGE));
      const p = P_LEVELS
        ? Math.round(clamped / RANGE * P_LEVELS) / P_LEVELS
        : clamped / RANGE;

      // 只在值变化时写：滚过 RANGE 后场景静止，不再产生任何 DOM 写入
      if (p !== lastP) {
        scene.style.setProperty('--p', p.toFixed(4));
        /* 标题组的透明度：一条绝对公式 + 一个冻结标记（见模块级那段的说明）。
           冻结的意义：字已经完全看不见之后再上滚，不该再「渐显一半」——
           那会和回顶重播的整组淡入撞在一起，看起来像播了两次。 */
        let fade = Math.max(0, 1 - p);
        if (heroFaded) {
          fade = 0;
        } else if (fade <= 0.001) {
          // 真的淡到 0（不是「接近 0」）才冻结：切换点落在看不见的地方，不会有台阶
          heroFaded = true;
        }
        if (fade !== heroFadeLast) {
          heroFadeLast = fade;
          scene.style.setProperty('--heroFade', fade.toFixed(3));
        }
        // 搜索栏挂在 .scene 外面（要钉在屏顶、又不能被 .feed 盖住），继承不到 --p，
        // 所以单独给它写一份：位移读 --p，透明度读 --dockOp（抛物线，见 dockOpacity）
        if (dock) {
          if (LITE && dockTopPx) {
            /* 手机轻量档：直写具体属性，不写自定义属性。
               --p / --dockOp 都挂在 .search-dock 上，而自定义属性是可继承的 ——
               写一次就把整棵 dock 子树标记成「样式失效」重新计算，哪怕真正用到它们的
               只有 .search-dock 自己的 transform 和 .search--hero 的 opacity，
               输入框、kbd、图标全都陪着重算一遍。
               实测：只去掉 --dockOp 那一次写入，整页重算就从 1480ms 掉到 961ms。
               这里改成直接写 transform / opacity —— 具体属性只作用于各自的元素，
               而且两者都在合成层上（.search-dock 有 will-change:transform，
               .search--hero 在轻量档补了 will-change:opacity），变化只走合成器。
               位移公式与 css 里的 calc(var(--p) * (24px - var(--dockTop))) 逐字等价，
               所以手机与桌面的观感完全一致（照样从标题组末尾滑到屏顶、透明度照样走抛物线）。
               桌面路径保持原样（写变量），一行未动。 */
            dock.style.transform =
              `translate3d(0, ${(p * (24 - dockTopPx)).toFixed(2)}px, 0)`;
            /* 不写 opacity。手机上这一条几乎横跨整屏（390px 里占 358px），
               半透明会让背后的正文透出来、与输入框的占位文字叠成两层 ——
               滚到任何位置都在叠字，非常难读。保持不透明，它就是一整块压在内容上的
               搜索条（遮挡，而不是重叠）。底色本就是 92% 不透明，观感上像一条工具栏。
               桌面仍按抛物线淡到 .55：那边它只占屏宽 30%，且多落在卡片留白处。 */
          } else {
            dock.style.setProperty('--p', p.toFixed(4));
            dock.style.setProperty('--dockOp', dockOpacity(p).toFixed(3));
          }
        }
        paintClouds(p);
        lastP = p;
      }
      /* 云海的滑出走逐像素的 clamped，不用 --p：--p 在轻量档被切成 15px 一级，
         而这两块云是 518px 的位移，跟着粗档位会变成一格一格的顿挫。
         单独写 inline transform 只影响云海自己这一层（实测只占滚动总重算的 2.5%）。 */
      if (clamped !== lastClamped) {
        banks.forEach(bank => {
          const dir = bank.dataset.side === 'left' ? -1 : 1;
          // 0.72 让云海滑到边缘但仍留下一截轮廓，不会一下子全空
          const dx = dir * clamped * 0.72;
          const dy = clamped * 0.04;
          bank.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        });
        if (stars) stars.style.transform = `translate3d(0, ${(clamped * 0.05).toFixed(1)}px, 0)`;
        lastClamped = clamped;
      }
    }

    const maxScroll = () => Math.max(0,
      document.documentElement.scrollHeight - window.innerHeight);
    const clampY = v => Math.max(0, Math.min(v, maxScroll()));

    let targetY = window.scrollY;
    let running = false;
    let gen = 0;          // 代次：外部输入可让旧 rAF 链自然退出，避免双循环
    let lastT = 0;

    function start() {
      if (running) return;
      running = true; lastT = 0;
      const my = ++gen;
      const step = t => {
        if (!running || my !== gen) return;
        const dt = lastT ? Math.min(t - lastT, 64) : 16.67;   // 长时间挂起后不猛跳
        lastT = t;
        const y = window.scrollY;
        const diff = targetY - y;
        if (Math.abs(diff) >= EPS) {
          const alpha = 1 - Math.pow(1 - SMOOTH, dt / 16.67);
          // 单帧位移上限（约 48px@60fps，按 dt 缩放并封顶 60px）：
          // 连续滚轮把目标累积得再快，滚动条也匀速滑动，不出现「一跳一大段」；
          // 末端小差值仍由指数插值自然减速，收敛不突兀。
          const maxStep = Math.min(2.9 * dt, 60);
          let stepPx = Math.max(-maxStep, Math.min(maxStep, diff * alpha));
          // 浏览器会把滚动位置舍入到整/半像素：末端不足 1px 的步进会被吃掉，
          // 使 y 停在离目标 1~2px 处且每帧算出的 next 完全相同 → 死锁。至少走 1px。
          if (Math.abs(stepPx) < 1) stepPx = Math.sign(stepPx);
          const next = y + stepPx;
          // 距目标不足 1px 时直接对齐，避免末端无限尾帧
          window.scrollTo(0, Math.abs(targetY - next) < 1 ? targetY : next);
        } else {
          window.scrollTo(0, targetY);
        }
        // 同一帧读回真实滚动条：场景与内容严格同源，动画值零滞后、零单独插值
        paint(window.scrollY);
        if (Math.abs(targetY - window.scrollY) < EPS) { running = false; return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function adopt(y) {                 // 交还原生滚动 / 同步外部滚动
      running = false; gen++;
      targetY = clampY(y);
      paint(window.scrollY);
    }

    // 滚轮：只累加目标，真实滚动条由插值循环连续驱动（缩放等交还浏览器）
    /* 手机轻量档不挂这条：不拦截滚轮、不做「每帧 scrollTo 追目标」的插值，
       滚动完全交还原生 —— 触屏本来就是原生惯性，再叠一层插值只会让画面比手指晚一拍。
       省掉的是一整个 rAF 循环（每帧 lerp + scrollTo + 读回 scrollY）。
       没有它，scroll 事件仍然走下面的 adopt()，每帧一次 paint，--p 照常更新。 */
    if (!LITE) window.addEventListener('wheel', (e) => {
      // 全屏文章态：交回被点卡片内部滚动，不拦截页面滚轮
      if (document.body.classList.contains('is-full')) return;
      if (e.ctrlKey || e.metaKey) return;
      /* 下游组件（时间线的换槽滚轮）已经 preventDefault 过的，就不要再叠一层页面滚动 ——
         事件继续冒泡到这里时 defaultPrevented 已经是 true，否则滚时间线会把整页一起带走。 */
      if (e.defaultPrevented) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 30 : (e.deltaMode === 2 ? window.innerHeight : 1);
      targetY = clampY(targetY + e.deltaY * unit);
      start();
    }, { passive: false });

    // 原生滚动（滚动条拖动 / 键盘 / 触控 / 锚点跳转）：插值时由循环驱动，否则直接跟随
    window.addEventListener('scroll', () => {
      if (!running) adopt(window.scrollY);
    }, { passive: true });

    // 外部输入开始：立即放弃插值，避免惯性把拖拽/键盘滚动拽回旧目标
    ['pointerdown', 'touchstart', 'keydown'].forEach(evt =>
      window.addEventListener(evt, () => { if (running) adopt(window.scrollY); }, { passive: true }));

    window.addEventListener('resize', () => adopt(window.scrollY), { passive: true });

    /* 标题组重播的唯一入口：只在「已经完全淡出」（heroFaded，paint 里置位）
       之后、并且回到 HERO_REPLAY_AT 以内时才播。两个条件缺一不可 ——
       少了 heroFaded，滚到半程再回滚会在途中白撞一次动画（这正是删掉的那个 bug）；
       少了位置条件，刚滚下去一点就回滚也会重播，看起来像一直在重启。 */
    window.addEventListener('scroll', () => {
      if (heroFaded && window.scrollY < HERO_REPLAY_AT) playHeroRise();
    }, { passive: true });

    // 按钮 / 锚点走同一条插值通道，不再依赖浏览器 behavior:'smooth'（reduce 下会被降级）
    smoothScrollTo = y => { targetY = clampY(y); start(); };

    paint(window.scrollY);

    /* 后台标签里 rAF 被冻结，滚动事件就算触发也不会把 paint 跑完；
       页面第一次可见、或从后台切回来时，按当前 scrollY 直接补一帧。
       不重置目标值，只补位置 —— 用户没有新的滚动意图。 */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      lastP = -1;
      lastClamped = -1;
      paint(window.scrollY);
    });
  }

  /* ---------- 文章卡片：单击展开全屏 / 键盘等价操作（无 hover 状态） ---------- */
  let posts = $$('.post');

  /* ---------- 卡片全屏展开 ----------
     飞行路线：卡片先被 fixed 钉在原框（同一次任务内完成 position 切换，绘制阶段看不到
     跳变），随后 left/top 收到 0、width/height 同时撑满视口——左上角归零与纵横向扩展
     是同一条过渡，边界连续长出去。几何走完再切到阅读布局，内容淡入。
     收起逆序：几何先缩回原槽位，再回到文档流。卡片脱离文档流期间由等高占位块
     守住原槽位，后面的卡片不会整体上移，收起时才能准确落回。 */
  const FLIGHT = 500;   // 与 CSS 中 left/top/width/height 的 .5s 过渡对齐
  const FADE = 160;     // 落位前留给内容淡出的时间，落位后切换阅读布局
  let fullPost = null;
  let fullSlot = null;
  let fullStart = null;
  let flightTimer = 0;
  let fadeTimer = 0;
  let settleTimer = 0;   // 收起末段「内容先淡进来」的定时器，见 closeFullscreen

  function openFullscreen(post) {
    if (!post || fullPost) return;
    fullPost = post;
    clearTimeout(flightTimer);
    /* 正文数据 + 高亮库按需加载：从点击这一刻就起飞，500ms 飞行结束时大多已经就绪；
       没就绪则由下面的落位回调等着它，不会让空正文先淡入再跳字。
       只拉这一篇 —— 正文按篇拆分（js/posts/<id>.js），别把其余几篇一起下下来。 */
    if (window.CBloadReaderAssets) window.CBloadReaderAssets(post.id);
    clearTimeout(fadeTimer);
    clearTimeout(settleTimer);
    settleTimer = 0;
    document.body.classList.remove('is-settling');   // 上一次收尾若被打断，别把淡入留在身上

    // 量框前卸掉入场变换：卡片可能还在旋入动画中途，直接量会拿到变形后的包围盒，
    // fixed 钉上去就与真实位置错开一截（这才是切换 position 时最常见的位置突变）。
    // 键盘 Tab 到未入场的卡片也能展开：先补上入场态，否则飞行与全屏都会停在 opacity 0
    post.classList.add('is-inview');
    post.classList.remove('is-head-collapsed', 'is-head-hover');   // 每次进阅读态，标题行都从展开开始
    post.style.transition = 'none';
    post.style.transform = 'none';

    // 先按当前布局量框（此时还没收起滚动条、也没插占位块）：这个框就是用户眼前
    // 看到的那张卡。收起滚动条会让视口变宽、卡片文字重排，若先收再量，起始框
    // 会比原位矮一截 / 宽一点，第一帧就跳。
    const rect = post.getBoundingClientRect();
    fullStart = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };

    // 量完框再卸掉槽位的堆叠 transform：有 transform 的祖先会成为 fixed 的包含块，
    // 卡片就会相对槽位定位而不是视口，飞行起点会整体错开一截。
    const slotEl = post.closest('.card-slot');
    if (slotEl) slotEl.classList.add('is-flat');

    // 锁滚动；后面的几何目标取整个视口（含原滚动条那条），展开后才是通铺
    document.body.classList.add('is-full');
    document.body.style.overflow = 'hidden';
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // 占位块：连负外边距一起复刻，原槽位高度被完整守住
    fullSlot = document.createElement('div');
    fullSlot.className = 'post-ghost';
    fullSlot.style.height = fullStart.height + 'px';
    fullSlot.style.marginTop = getComputedStyle(post).marginTop;
    post.before(fullSlot);

    // 同帧切 fixed 并钉回原框：position 切换与几何值一起提交，浏览器没有中间帧可画
    post.style.position = 'fixed';
    post.style.margin = '0';
    post.style.left = fullStart.left + 'px';
    post.style.top = fullStart.top + 'px';
    post.style.width = fullStart.width + 'px';
    post.style.height = fullStart.height + 'px';
    post.classList.add('is-flying');

    const btn = $('.post__toggle', post);
    if (btn) btn.setAttribute('aria-expanded', 'true');

    // 双 rAF：起始框先落一帧，再推进到左上角 + 撑满，过渡才会真的播放
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (fullPost !== post) return;
      post.style.transition = '';   // 恢复基类过渡，本帧的几何变化才会动画
      post.style.left = '0px';
      post.style.top = '0px';
      post.style.width = viewW + 'px';
      post.style.height = viewH + 'px';
    }));

    // 飞行末段先把内容淡出，落位切换阅读布局时就不会看到文字重排
    fadeTimer = setTimeout(() => {
      if (fullPost === post) document.body.classList.add('is-expanding');
    }, FLIGHT - FADE);

    // 几何走完后切阅读布局（标题吸顶、单列、全文展开），内容随之淡入
    flightTimer = setTimeout(() => {
      if (fullPost !== post) return;
      post.classList.add('is-full');
      const reveal = () => {
        if (fullPost !== post) return;
        // 阅读页（reader.js）在这一拍注入 md 正文。此时内容还是 opacity:0（is-expanding
        // 尚未摘掉），注入引起的重排会被随后的淡入整段盖住，看不到文字跳一下。
        document.dispatchEvent(new CustomEvent('post:open', { detail: post }));
        document.body.classList.remove('is-expanding');
      };
      /* 按需资源若还没下完，宁可让卡片在多等一会儿（仍是空的飞行终态），
         也不要先揭开空正文再补一张进来。Promise 是缓存的，正常点击几乎立刻兑现。 */
      if (window.CBloadReaderAssets) window.CBloadReaderAssets(post.id).then(reveal);
      else reveal();
    }, FLIGHT);
  }

  function closeFullscreen(immediate) {
    if (!fullPost) return;
    const post = fullPost;
    clearTimeout(flightTimer);
    clearTimeout(fadeTimer);

    const btn = $('.post__toggle', post);
    if (btn) btn.setAttribute('aria-expanded', 'false');

    // 移出残留在卡片内部的焦点，避免收尾后按钮仍处于 focus 态
    const active = document.activeElement;
    if (active && post.contains(active) && typeof active.blur === 'function') active.blur();

    const finish = () => {
      if (fullPost !== post) return;
      clearTimeout(settleTimer);
      settleTimer = 0;
      // 归位与拆占位块在同一任务里：卡片回到文档流的位置恰好是占位块守住的槽位
      post.scrollTop = 0;

      /* 落位这一帧有两处「归零」不能播动画：
         ① 槽位：is-flat 期间它的 translate3d(0, --y) 被压成 none。直接摘掉，
            .card-slot 那条 .62s 的 transform 过渡（本来是给翻页用的）会真的播一次 ——
            卡片先出现在整摞顶端（transform 归零的位置），再往下滑 --y 才落到自己的槽位，
            这就是关闭阅读页时「已经缩到位了又突然回到顶上再掉下来」的来源。
            is-landing 先把过渡掐掉，让 --y 一步到位；读一次布局把这一帧提交出去，
            再放开过渡（几何值已经不变，放开也不会补播）。
         ② 卡片自身：收起姿态（斜卡 rotateY）→ 落位姿态。两者数值本来就一致，
            但收起结束时 .8s 的 transform 可能还在中途，这里一并硬切到终态，
            不让它在槽位上再补一段旋转。 */
      const slotEl = post.closest('.card-slot');
      post.style.transition = 'none';
      if (slotEl) {
        slotEl.classList.add('is-landing');
        slotEl.classList.remove('is-flat');
      }
      post.classList.remove('is-full', 'is-flying', 'is-head-collapsed', 'is-head-hover');
      post.style.position = '';
      post.style.left = '';
      post.style.top = '';
      post.style.width = '';
      post.style.height = '';
      post.style.margin = '';
      post.style.transform = '';
      if (fullSlot && fullSlot.parentNode) fullSlot.remove();
      document.body.classList.remove('is-full', 'is-expanding', 'is-collapsing', 'is-settling');
      document.body.style.overflow = '';
      void post.offsetWidth;          // 提交落位帧：此刻过渡仍被掐着
      post.style.transition = '';
      if (slotEl) slotEl.classList.remove('is-landing');
      document.dispatchEvent(new CustomEvent('post:close', { detail: post }));
      fullPost = null; fullSlot = null; fullStart = null; flightTimer = 0; fadeTimer = 0;
    };

    // 还没落位（仍在展开途中）就直接归位，避免停在「空卡片」上等动画
    if (immediate || !fullStart || !post.classList.contains('is-full')) { finish(); return; }

    // 收起：内容立即隐藏并回到顶部，几何缩回原槽位（不在展开途中时才会走到这里）
    document.body.classList.add('is-collapsing');
    document.body.classList.remove('is-settling');   // 上一次收尾若被打断，别把淡入留在身上
    post.scrollTop = 0;
    // 布局当场切回列表态。若还挂着 is-full，卡片缩回途中仍是「760 单列 + 吸顶标题」的阅读排版，
    // 缩到列表卡尺寸时和首页那张卡对不上形状；落位后摘 is-full 再重排，就是用户看到的那一下突兀。
    // 内容此刻 opacity 0（is-collapsing 那条规则），这次重排看不见。
    post.classList.remove('is-full', 'is-head-collapsed', 'is-head-hover');
    post.style.transition = '';
    // open 时为消除入场变换写过内联 transform:none —— 它会盖住 CSS 里 body.is-collapsing 的斜卡姿态，
    // 清掉才能让卡片一边缩回尺寸、一边转回首页的角度（圆角与阴影同理由那条规则补上）。
    post.style.transform = '';
    post.style.left = fullStart.left + 'px';
    post.style.top = fullStart.top + 'px';
    post.style.width = fullStart.width + 'px';
    post.style.height = fullStart.height + 'px';
    /* 最后 140ms 着手把列表卡内容淡进来（.2s）：与几何收尾重叠，落位时卡片里
       已经看得见标题和摘要，而不是一张空白纸再等一拍。样式见 articles.css 的
       body.is-collapsing.is-settling 那条。 */
    settleTimer = setTimeout(() => {
      if (fullPost === post) document.body.classList.add('is-settling');
    }, FLIGHT - 140);
    flightTimer = setTimeout(finish, FLIGHT + 20);
  }

  function initPosts() {
    /* 卡片整体是一个入口；标题里的 <a> 只是锚点（点卡片本身就是进入），
       不再单独进 Tab 序列 —— 否则 Tab 会先在「卡片 → 标题」两级之间停一次。 */
    posts.forEach(p => {
      p.tabIndex = 0;
      const a = $('.post__heading h3 a', p);
      if (a) a.tabIndex = -1;
    });

    /* ---------- 全屏阅读：标题行照导航栏折叠 ----------
       全屏时 body 滚动被锁（overflow:hidden），正文滚在 .post 自己内部，
       所以必须监听卡片自身的 scroll，而不是 window；
       方向判定沿用顶层栏那一套「同方向累积位移」：拖滚动条时每帧只走一两像素，
       按单次位移（6px）永远够不到，头行就会卡在那里挡文章。
       scrollTop 回到顶部时强制展开——回来第一眼要能看到标题和「回到首页」。 */
    let headAcc = 0;
    let headLast = 0;

    /* 桌面档：导航带改由「指针进入卡片顶部 44px」驱动（.is-head-hover），
       不再跟着滚动折叠 —— 折叠那条留给触摸档，两档共用同一个 is-head-collapsed。
       html.is-hover-ui 是给 CSS 的开关：没有细指针的设备（纯触屏）不会进这条路径，
       它们的导航带仍然靠上滑露出。

       判据不能只看指针：在桌面浏览器里把窗口拖窄、或用 DevTools 的设备模式模拟手机时，
       (hover: hover) + (pointer: fine) 依旧成立，但用户眼里那就是「手机端」——
       导航带会一直按 hover 逻辑走，上滑/下滚彻底失效（用户 2026-11-22 报的正是这个）。
       所以宽度也算进去：细指针 **且** 视口 >900px（与 mobile-lite 的断点对齐）才是桌面档；
       窄窗一律按触摸档走「上滑露出、下滚收起」。 */
    const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
    const WIDE = window.matchMedia('(min-width: 901px)');
    const hoverUI = () => FINE.matches && WIDE.matches;
    function syncHoverUI() {
      const on = hoverUI();
      document.documentElement.classList.toggle('is-hover-ui', on);
      // 从桌面档缩到窄窗时，残留的 is-head-hover 会把导航带钉在「已 hover」状态
      if (!on) posts.forEach(p => p.classList.remove('is-head-hover'));
    }
    syncHoverUI();
    for (const mq of [FINE, WIDE]) {
      if (mq.addEventListener) mq.addEventListener('change', syncHoverUI);
      else mq.addListener(syncHoverUI);   // 老 Safari
    }

    posts.forEach(p => {
      p.addEventListener('pointermove', e => {
        if (!hoverUI() || !p.classList.contains('is-full')) return;
        const rect = p.getBoundingClientRect();
        const on = e.clientY >= rect.top && e.clientY <= rect.top + 44;
        if (on !== p.classList.contains('is-head-hover')) p.classList.toggle('is-head-hover', on);
      }, { passive: true });
      p.addEventListener('pointerleave', () => p.classList.remove('is-head-hover'));
    });

    posts.forEach(p => {
      p.addEventListener('scroll', () => {
        if (!p.classList.contains('is-full')) { headAcc = 0; headLast = 0; return; }
        if (hoverUI()) {
          if (p.classList.contains('is-head-collapsed')) p.classList.remove('is-head-collapsed');
          headAcc = 0; headLast = p.scrollTop;
          return;
        }
        const y = p.scrollTop;
        if (y <= 8) {
          p.classList.remove('is-head-collapsed');
          headAcc = 0;
        } else {
          headAcc += y - headLast;
          if (headAcc > 20) { p.classList.add('is-head-collapsed'); headAcc = 0; }
          else if (headAcc < -20) { p.classList.remove('is-head-collapsed'); headAcc = 0; }
        }
        headLast = y;
      }, { passive: true });
    });

    /* ---------- 卡片整组：进出场只认流星线的进度 ----------
       判据从「卡片自己在屏幕什么位置 / #flow 有没有 is-live」收回到一个状态量：
       initSplit 的 paintFlow 每帧算「线画了多长」，状态一变就调 setCardFlow(on)
       （入场 = 线长 > 2px，出场 = 线彻底退回 0，见 initSplit 的 applyFlow）。
       卡片区不再自己挂 scroll 监听、不再自己判进出 —— 整块只有一个开关。

       入场：线一出现就把 5 张页卡按 0/80/160/240/320 顺次播（整组一起播，不看单张在不在视口）；
       出场：线完全消失那一刻整组按 .split.is-leaving 那套更长的时长原路收回。
       编舞的这 1.2~1.4s 里 initSplit 会把滚动姿态冻住：否则 tick 每帧改写
       --ryEnd / --tilt，transform 的 transition-delay 会被顶掉、.8s 还会被压成 .1s，
       观感就是「先出 1-2 张、停一下再顺次」—— 那是两个写入方在抢同一个 transform。 */
    const stackEl = $('#cardStack');
    let shown = false;         // 整组是否已入场
    let booted = false;        // 加载/滚动恢复完成前，不把恢复过程当成用户在滚

    /* force = 按当前状态直接定态、不播动画（首屏、过滤后、窗口尺寸变化时用） */
    function syncStack(on, force) {
      if (!stackEl) return;
      if (!booted && !force) return;   // 浏览器恢复滚动位置的那一下不算用户滚动
      if (on === shown && !force) return;
      shown = on;
      if (on && !force) staggerEntrance();   // 整组进场前铺好 0/80/160… 的逐个延迟
      posts.forEach(p => p.classList.toggle('is-inview', on));
      /* 全屏阅读期间，正在读的那张必须始终可见。
         resize（拖窗 / 手机档拉到桌面档）与可见性恢复都会让 split 的 paintFlow
         按新几何重算「卡片流」在不在，算出 false 时这一行会把 is-inview 从**正在读的
         那张卡**上一起摘掉 —— .post 的基础样式就是 opacity: 0，整屏立刻只剩天空。
         （对照实测：不 resize 时 is-inview 在、opacity 1；resize 后两者一起没了。） */
      if (fullPost && fullPost.classList.contains('is-full')) fullPost.classList.add('is-inview');
    }
    /* initSplit 的唯一入口：它只管把「线还在不在」传进来，别的什么都不判 */
    setCardFlow = on => syncStack(on);

    /* 卡片逐个入场：只排**5 张页卡**（按 --y 从上到下），每张错开 80ms。
       上下堆那几张（上一组 / 下一组）不排延迟 —— 它们是「整块纸边」，跟第 1 张同拍出现，
       这样观感是「这一摞整体亮起来」，而不是先冒出两张纸再轮到内容卡。
       延迟只挂在各自 .post 的 transition-delay 上，整串播完就清掉。
       入场期间 initSplit 已经冻住滚动姿态（choreoUntil），没有别的东西再来改写 transform，
       所以这串 delay 是真的按 0/80/160… 走完的。 */
    const ENTER_STEP = 80;     // 相邻两张的节拍
    let enterTimer = 0;
    function staggerEntrance() {
      if (!stackEl) return;
      const slots = $$('.card-slot[data-role="page"]', stackEl)
        .sort((a, b) => (parseFloat(a.style.getPropertyValue('--y')) || 0)
                      - (parseFloat(b.style.getPropertyValue('--y')) || 0));
      const list = slots.map(s => $('.post', s)).filter(Boolean);
      list.forEach((p, i) => { p.style.transitionDelay = (i * ENTER_STEP) + 'ms'; });
      clearTimeout(enterTimer);
      enterTimer = setTimeout(() => {
        list.forEach(p => { p.style.transitionDelay = ''; });
      }, list.length * ENTER_STEP + 600);
    }
    /* 首屏那次是 settle() 用 no-anim 直接定态的，不会播入场。
       载入完成后补一遍：整块卡片一起撤、铺好延迟、再同帧放回去
       （上下堆的纸边也在内 —— 它们属于这一摞，不是另一套动画）。 */
    function replayEntrance() {
      if (!stackEl) return;
      const list = $$('.post', stackEl);
      list.forEach(p => p.classList.remove('is-inview'));
      staggerEntrance();
      void stackEl.offsetWidth;
      list.forEach(p => p.classList.add('is-inview'));
    }

    function settle() {
      if (!stackEl) return;
      stackEl.classList.add('no-anim');
      syncStack(flowState, true);
      // 先强制重排，让目标态在「无过渡」下落地，再同帧放开过渡：值已提交，放开后不会补播一次。
      // 这里不能用 rAF 收尾 —— 后台标签页 rAF 被冻结，no-anim 会一直挂着，过渡就永远关着。
      void stackEl.offsetWidth;
      stackEl.classList.remove('no-anim');
    }

    // 视口尺寸变化：按新位置重排一次静止态，不播动画；全屏时不打断飞行
    let resizeQueued = false;
    window.addEventListener('resize', () => {
      if (resizeQueued || document.body.classList.contains('is-full')) return;
      resizeQueued = true;
      requestAnimationFrame(() => { resizeQueued = false; settle(); });
    });

    /* 浏览器会自己把上次的滚动位置恢复回来，那一下也会触发 scroll 事件。
       等到 load / pageshow 之后按最终位置重排一次并及时放开滚动，首屏就不会有动画。 */
    function boot() {
      if (booted) return;
      booted = true;
      settle();
      if (shown) replayEntrance();   // 首屏直接停在卡片区时，补一遍逐个入场
    }
    window.addEventListener('load', boot, { once: true });
    window.addEventListener('pageshow', boot);
    setTimeout(boot, 700);   // 兜底：load 迟迟不来时别把滚动一直锁着
    settle();

    /* 后台标签里恢复滚动位置 / 滚动事件都不会把 syncStack 跑完（rAF 冻结），
       切回前台时卡片会一直停在未入场态（opacity 0、x 在容器外）。这里按当前位置定态，
       已经在视口里就补一遍逐个入场。 */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      settle();
      if (shown) replayEntrance();
    });

    /* 全屏时窗口尺寸变化（旋屏 / 拖窗 / 手机档拉到桌面档）：重新钉死到视口。
       这里**不能**只判 is-full：
       飞行途中（is-flying、is-full 还没加）就 resize 的话，内联几何还是飞行起点
       （= 列表卡那一小块），而后面没有任何人再推进它 —— 结果全屏卡片卡在两百多像素高、
       下面一大片天空（手机档窗口直接拉宽到桌面时必现）。
       resize 本来就该打断飞行：直接给终点几何、关掉过渡，不再等那两帧 rAF。
       left/top 也要一起写：只改 width/height 的话，若 resize 发生在双 rAF 之前，
       卡片还钉在它原来在列表里的位置。 */
    window.addEventListener('resize', () => {
      if (!fullPost) return;
      fullPost.style.transition = 'none';
      fullPost.style.left = '0px';
      fullPost.style.top = '0px';
      fullPost.style.width = window.innerWidth + 'px';
      fullPost.style.height = window.innerHeight + 'px';
      requestAnimationFrame(() => { if (fullPost) fullPost.style.transition = ''; });
    }, { passive: true });

    const empty = $('#feedEmpty');
    const search = $('#search');

    function filter(query) {
      const needle = query.trim().toLowerCase();
      searchNeedle = needle;
      let visible = 0;
      posts.forEach(p => {
        const haystack = (p.textContent + ' ' + (p.dataset.tags || '')).toLowerCase();
        const hit = !needle || haystack.includes(needle);
        p.classList.toggle('is-hidden', !hit);
        if (hit) visible++;
      });
      if (empty) empty.hidden = visible !== 0;
      /* 作品集一起筛：一行 = 一个 app，规则与文章相同（空关键词 = 全放出来）。
         这里只改显隐，重排 / 重新量线交给下面的 refreshSplitLine（它就是同一轮 layout）。 */
      applyAppsFilter(needle);
      /* 命中集合变了 = 换了一条新的全局流：时间线要跟着重建，否则卡片按命中集合算页、
         时间线还按全站算条数，滚动条和 pageStart 会对不上。搜索从队首重新开始。 */
      if (refreshSplitLine) refreshSplitLine(true);
      else refreshSplitCards();
      settle();   // 过滤后布局整体变了：按新位置直接落位，不播入场动画
    }

    if (search) search.addEventListener('input', () => {
      filter(search.value);
      /* 打字就把命中带到眼前（通用落点，见 revealFirstHit）：
         命中在哪一块（文章 / 作品集）就滚到那一块的锚点；清空关键词不跳。
         已经停在该块或更下面时不动 —— 别把正在看结果的人往上拽。 */
      if (search.value.trim()) revealFirstHit();
    });

    /* ---------- 书籍卡兜底：数据没发布就把卡摘掉 ----------
       书稿是第三方教程，只留本地测试渲染用（见 .gitignore），不入库也不推远程；
       但 index.html 里那 4 张书卡是静态写死的，缺 js/books.data.js 时点开就是死链。
       这里先探一下文件在不在：明确 404 才藏卡 + 控制台警告，探不出来就当「未知」不动卡。
       · http(s)：HEAD 一下，便宜（不会把 48KB 的正文索引拉下来）；
       · file://：fetch 会被 CORS 挡掉，改用 <script> 的 onerror 判 404
         （本地有书稿时这一探会顺手把 AX_BOOKS 装上，阅读页直接命中缓存）。 */
    const BOOK_CARDS = $$('.post[id^="book-"]');
    function hideBookCards(reason) {
      if (!BOOK_CARDS.length) return;
      BOOK_CARDS.forEach(p => p.classList.add('is-hidden'));
      console.warn('[blog] 缺少书籍数据（' + reason + '），已隐藏 ' + BOOK_CARDS.length +
        ' 张书籍卡。示例书稿不随仓库发布；本地要看书，先跑 node tools/book.mjs。');
      /* 和搜索过滤走同一条重排：卡片按可见集合重新分页、卡片堆重新叠、时间线重新量线 */
      if (refreshSplitLine) refreshSplitLine(true);
      else refreshSplitCards();
      settle();
    }
    const BOOKS_URL = (window.CB_ASSETS || {}).books;
    if (BOOK_CARDS.length && BOOKS_URL && !window.AX_BOOKS) {
      if (location.protocol === 'file:') {
        const probe = document.createElement('script');
        probe.src = BOOKS_URL;
        probe.async = true;
        probe.onerror = () => hideBookCards('script 加载失败 ' + BOOKS_URL);
        document.head.appendChild(probe);
      } else {
        fetch(BOOKS_URL, { method: 'HEAD', cache: 'no-store' })
          .then(r => { if (!r.ok) hideBookCards('HTTP ' + r.status + ' ' + BOOKS_URL); })
          .catch(() => { /* 断网 / 权限问题：不知道就别动卡片 */ });
      }
    }

    document.addEventListener('keydown', e => {
      const active = document.activeElement;
      const typing = active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable);

      if (e.key === '/' && !typing && search && !document.body.classList.contains('is-full')) { e.preventDefault(); search.focus(); }
      if (e.key === 'Escape') {
        if (document.body.classList.contains('is-full')) { closeFullscreen(); return; }
        if (typing && active === search) { search.value = ''; filter(''); search.blur(); }
        toggleSidebar(false);
      }
      const post = active && active.closest ? active.closest('.post') : null;
      if (post && active === post && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (document.body.classList.contains('is-full')) closeFullscreen();
        else openFullscreen(post);
      }
    });
  }

  /* ---------- 伪 3D 分栏：左半卡片列 / 右半时间线（悬停换成该文预览） ----------
     卡片数据全部从左侧 DOM 读（日期、主题色、标题、摘要、标签），右半内容按它生成，
     不维护第二份数据 —— 改文章只改卡片本身。
     两个面板（时间线 / 预览）叠在同一格里交叉淡入淡出，切换时右半高度不会跳。 */
  /* ---------- 域：滚动姿态（tilt） ----------
     从 initSplit 里分出来的第一个独立工厂。它只写 .split 上的两个自定义属性
     （--ryEnd / --tilt），状态全是自己的：基准角、当前角、两个弹簧速度、上一帧位置。
     不读卡片、时间线、流星线里的任何东西，所以不需要 items / pageStart / flowGeo。

     唯一的外部输入是「入场编舞还没播完」（choreoUntil）：那串 0/80/160ms 的
     transition-delay 还在跑，这时每帧重写 --ryEnd 会把终点顶掉、.8s 也会被压成 .1s。
     所以用 getter 注入，不共享变量 —— 状态各归各家。原来 applyFlow 里那句
     「initSplit 早期 let 还没执行、读到未初始化的 rafId 会 TDZ」的防御也就不再需要：
     rafId 在工厂创建时就已初始化。 */

  /* 7. 滚动速度 → 整组姿态（路标被「惯性拖一下」的手感）：
        · 向下滚：落位角与倾斜一起收小，朝「纯 2D 平面」压过去（幅度很克制，只是暗示）；
        · 向上滚：**同量反向**外扩 —— 两个方向共用一套偏移量，不再一边猛一边轻；
        · 松手后不再加量，目标回基准，剩下的靠欠阻尼弹簧走完（会过冲一点点再落回来）。
        角度变量挂在 .split 上，一次 setProperty 四张卡同时生效。
        几何在滚动中会变，所以鼠标进到卡片区就整段冻结 —— 否则命中区跟着变，
        hover 又会在边缘反复进出（这正是上一轮刚消掉的那类抖动）。 */
  function createTilt({ splitEl, stack, getChoreoUntil }) {
    const readBase = () => {
      const cs = getComputedStyle(stack);
      return {
        ry: Math.abs(parseFloat(cs.getPropertyValue('--ryBase'))) || 34,
        tilt: Math.abs(parseFloat(cs.getPropertyValue('--tiltBase'))) || 8
      };
    };
    let base = readBase();
    const DELTA_RY = 6, DELTA_TILT = 2;   // 滚动时最多偏离基准 6° / 2°，正反两个方向同量反向
    const V_REF = 900;                    // 滚动速度参考（px/s），到这个速度取满偏移
    const SPRING_K = 120, SPRING_C = 11;  // 弹簧刚度 / 阻尼，阻尼比 ≈ .5 → 回位时有一次轻微过冲
    let ryCur = base.ry, tiltCur = base.tilt;
    let ryVel = 0, tiltVel = 0;
    let velSm = 0;                        // 平滑后的滚动速度，单帧抖动不该直接进目标值
    let tiltLastY = null, tiltLastT = 0, tiltStartAt = 0, rafId = 0;
    let tiltFrozen = false;

    function stop() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
      document.body.classList.remove('is-scrolling');   // transform 过渡恢复 .8s
    }

    function tick(now) {
      // 全屏阅读时不参与这套姿态，卡片是钉在视口上的
      if (document.body.classList.contains('is-full')) { stop(); return; }
      /* 编舞窗口内一律不写 --ryEnd / --tilt：卡片正在按 0/80/160… 顺次入场（或整组收回），
         这两个变量一变，卡片的 transform 就被重定终点，那串 delay 会当场作废。 */
      if (performance.now() < getChoreoUntil()) { stop(); return; }
      const dt = Math.max(.001, Math.min((now - (tiltLastT || now)) / 1000, .05));
      tiltLastT = now;
      const y = window.scrollY;
      if (tiltLastY === null) tiltLastY = y;
      velSm += ((y - tiltLastY) / dt - velSm) * Math.min(1, dt * 10);
      tiltLastY = y;

      const s = Math.min(Math.abs(velSm) / V_REF, 1);
      // 正反方向对称：偏移量只有一套，方向由速度符号决定。
      // 上一版向下 12°/4°、向上 20°/10°，两个方向不等量、整体也偏大；
      // 现在统一取 6°/2°（以向下那套为准再减半），滚动时只是轻微示意，不抢内容。
      const dir = velSm > 0 ? -1 : 1;
      const targetRy = base.ry + dir * DELTA_RY * s;
      const targetTilt = base.tilt + dir * DELTA_TILT * s;

      // 半隐式欧拉：位移由「弹簧力 + 阻尼」积分，阻尼不足自然产生过冲
      ryVel += ((targetRy - ryCur) * SPRING_K - ryVel * SPRING_C) * dt;
      tiltVel += ((targetTilt - tiltCur) * SPRING_K - tiltVel * SPRING_C) * dt;
      ryCur += ryVel * dt;
      tiltCur += tiltVel * dt;
      splitEl.style.setProperty('--ryEnd', ryCur.toFixed(2) + 'deg');
      splitEl.style.setProperty('--tilt', tiltCur.toFixed(2) + 'deg');

      // 收尾：速度归零、角度贴着基准、弹簧也停了 → 摘掉滚动态，交回 .8s 的平滑过渡。
      // 必须等过了启动门槛再判 —— 第一帧 tiltLastY 还是 null，算出来的速度必然是 0，
      // 不设这个门槛，动画会在第 1 帧就自己结束，角度永远涨不起来。
      if (now - tiltStartAt > 300 &&
          Math.abs(velSm) < 8 && Math.abs(ryVel) < 2 && Math.abs(tiltVel) < 2 &&
          Math.abs(ryCur - base.ry) < .06 && Math.abs(tiltCur - base.tilt) < .06) {
        ryCur = base.ry; tiltCur = base.tilt; ryVel = tiltVel = velSm = 0;
        splitEl.style.setProperty('--ryEnd', base.ry + 'deg');
        splitEl.style.setProperty('--tilt', base.tilt + 'deg');
        stop();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      /* 手机轻量档：不做滚动姿态弹簧。
         它每帧往 .split 写两次 --ryEnd / --tilt，而 .split 是「卡片堆 + 文章时间线 +
         作品集」的共同祖先 —— 等于每帧把整块文章区重算一遍样式，这是整页滚动时
         最贵的一笔。而它换来的只是滚动时 6°/2° 的微倾，在 350px 宽的卡堆上几乎看不出来。
         不启动 = 角度恒为基准：.split 上已经写着 --ryEnd: var(--ryBase)，
         卡片照常摆成 skewY + rotateY 的静止姿态，只是不再随速度前后摆。 */
      if (LITE) return;
      if (rafId || tiltFrozen) return;   // 鼠标还在卡片区里就完全不启动
      /* 编舞窗口内不接手：入场那串 .8s 过渡（和 0/80/160… 的延迟）还没播完，
         这时起弹簧会把 transform 压成 .1s、并且每帧重定终点 —— 那正是「前 1-2 张先出、
         停一下再顺次」的来源。等编舞结束，下一次 scroll 事件自然会把姿态接回来。 */
      if (performance.now() < getChoreoUntil()) return;
      tiltLastY = null; tiltLastT = 0;
      tiltStartAt = performance.now();
      document.body.classList.add('is-scrolling');
      rafId = requestAnimationFrame(tick);
    }

    /* 鼠标进入卡片区就冻结：停掉 rAF，角度停在当前值，几何一动不动（滚轮在卡片上滚也不会重启）。
       离开时重新起帧 —— 若此时角度偏离基准，弹簧会把它平滑地送回静止姿态。
       手机轻量档不挂这两条：tilt 的 start() 第一行就 return，弹簧永远不会起，
       它们只会在每次点按时白白跑一遍 start()/stop()。 */
    if (!LITE) {
      stack.addEventListener('mouseenter', () => { tiltFrozen = true; stop(); });
      stack.addEventListener('mouseleave', () => { tiltFrozen = false; start(); });
    }
    window.addEventListener('scroll', start, { passive: true });

    return {
      start,
      stop,
      /* 宽度 / 基准角变了之后重读 --ryBase / --tiltBase（拖窗、旋屏走这里） */
      rebase() { base = readBase(); }
    };
  }

  /* ---------- 域：作品集（Apps） ----------
     一块独立区块（#appsBlock）：左边 app 卡片、右边作品集自己的时间线（按年号排），
     落在文章区下方，不与文章卡片 / 时间线共用容器。它不参与分页，也不持有卡片状态，
     唯一的对外依赖是「折叠 / 重建改了整块高度，几何要重量」—— 所以把
     measureFlow / measureSweep / paintFlow 三个函数注进来，函数体里的调用名一个字不改。
     年号元素与文章时间线共用 yearHTML（同样从外面传），两边的年号因此不会各自长歪。 */
  function createApps({ yearHTML, measureFlow, measureSweep, paintFlow }) {
    const appsBox = $('#appsGrid');
    const remeasure = () => { measureFlow(); measureSweep(); paintFlow(); };

    function render() {
      const box = $('#appsGrid');
      const apps = Array.isArray(window.APPS) ? window.APPS.slice() : [];
      if (!box || !apps.length) return;
      /* 文案语言：nameEn / descEn 有就换，没有回退中文 —— 与阅读页那边 htmlEn || html 同一套规矩。
         这一块是内联拼出来的串，走不了 applyLang 的 data-zh/data-en 属性通道，只能渲染时自己挑。
         这里必须读 document.documentElement，不能读模块常量 html：本函数下面还有个
         let html = '' 拼串，同作用域提前引用会撞 TDZ（Cannot access 'html' before initialization），
         render 一抛，作品集整块空白、初始化序列跟着断。 */
      const en = document.documentElement.dataset.lang === 'en';
      const ys = [...new Set(apps.map(a => a.year))].sort((a, b) => b - a);

      /* 两列是同一个 grid 的两行：左边一条时间线条目、右边一张卡。
         同一行天然同高，时间线条目 align-self:center 就落在卡片中线上 —— 不用逐张量高。
         年份只在时间线这一列标（跨两列占整行，视觉上只出现在左列）。 */
      /* 老站首页（父目录 homePage.html）里每个 app 的图标是**内联 svg**（少数是 png）：
         path 抄进 apps.data.js 的 svg 字段，这里按各自的 viewBox 还原，颜色交给 --tc。
         两种都没有的退回类型缩写（LaTeXInput 这类条目下线后已无实例，留作兜底）。 */
      const markOf = a => {
        if (a.icon) return `<img class="appsRow__img" src="${a.icon}" alt="" width="34" height="34" decoding="async">`;
        if (a.svg) {
          const paths = a.svg.d.map(d => `<path d="${d}"/>`).join('');
          return `<svg class="appsRow__svg" viewBox="${a.svg.vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${paths}</svg>`;
        }
        return `<span class="appsRow__txt">${a.kind}</span>`;
      };

      /* 一行一个 app：左边是时间线（圆点压在流星线的延长段上 + MM-DD 日期），右边是图标、
         名称、说明与类型 —— 名称只出现一次（之前时间线列再写一遍 .appsTl__name，与卡片标题重复）。
         年号与文章时间线同一份（yearHTML 默认款）：可点、有 .tl__fold、is-active 加下划线；
         一年一组，条目收在 .appsGroup__body 里由 grid-template-rows 0fr↔1fr 折叠。
         **默认全部展开**，每年独立开关 —— 不再只允许一年 active。 */
      let html = '';
      ys.forEach(y => {
        const accent = (apps.find(a => a.year === y) || {}).accent || '#8f8cf0';
        html += `<div class="appsGroup is-open" data-year="${y}">`
              + yearHTML(y, accent, { active: true })
              + `<div class="appsGroup__body"><div class="appsGroup__rows">`;
        apps.filter(a => a.year === y)
             .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
             .forEach(a => {
          html += `<a class="appsRow" data-year="${a.year}" href="apps/${a.id}/index.html" target="_blank" rel="noopener" style="--tc:${a.accent}">`
                + `<span class="appsRow__dot"></span>`
                + `<span class="appsRow__date">${(a.date || '').slice(5)}</span>`
                + `<span class="appsRow__icon">${markOf(a)}</span>`
                + `<span class="appsRow__body"><span class="appsRow__name">${en ? (a.nameEn || a.name) : a.name}</span>`
                + `<span class="appsRow__desc">${en ? (a.descEn || a.desc) : a.desc}</span></span>`
                + `<span class="appsRow__kind">${a.kind}</span>`
                + `<span class="appsRow__go" aria-hidden="true"></span></a>`;
        });
        html += `</div></div></div>`;
      });
      box.innerHTML = html;
      /* 重建会把行的显隐一起清掉（切语言后就是这里）：手上还握着搜索词的话重新筛一遍，
         否则切一次语言过滤结果就没了。放在量线之前，几何才按筛完的结果算。 */
      if (searchNeedle) applyAppsFilter(searchNeedle);

      /* 淡入不做在这里，交给流星线：x 判断在 paintFlow()，元素坐标由 measureSweep() 统一量（sweep 队列）。
         为什么换掉「滚进视口就点亮」：那样只加不减 —— 行进了视口就永远亮着，往回收缩时
         没有对应的淡出，也和上面文章时间线的「线扫过才亮」两套节奏。现在统一为
         线头经过即淡入、线头退回即淡出。
         两个老坑仍然成立，别再踩：IntersectionObserver 在后台标签不回调；首帧 rect 全 0 会让十行一起亮。
         这里只作废缓存，让下一次 measureFlow 重量一遍。 */
      measureFlow();
      measureSweep();

      /* 淡入沿用时间线条目的 is-lit（从下方位升上来），进视口点亮，每项错开 40ms。
         这里不用 IntersectionObserver：实测它在这块（嵌在 <main> 里的独立 section、外层还有
         几个定位容器）不回调，滚到位置后十条全透明。改成「滚动时量一次 rect」——
         只有十条，一帧一次 rect 读，代价可以忽略，行为也完全可预测。 */

    }

    /* 作品集年号：与文章年号同一个元素、同一套手势，但**按年独立开关** ——
       点某年只切换它自己那组，其它年不动；默认全部展开，所以可以多个年号同时 active。
       is-active 跟着这组自己的 is-open 走：开 = 下划线 + 箭头朝上，关 = 收起 + 箭头朝下。 */

    function setYear(y) {
      if (!appsBox || !y) return;
      const group = $$('.appsGroup', appsBox).find(g => g.dataset.year === y);
      if (!group) return;
      const open = group.classList.toggle('is-open');
      const yearEl = $('.tl__year', group);
      if (yearEl) yearEl.classList.toggle('is-active', open);
      /* 折叠改了整块高度：尾段线头 hy、--fx2、sweep 队列全得重量。
         过渡是 .5s 的 grid-template-rows，中途量到的是半截 —— 先按当前帧补一次，
         等 transitionend 再量一次终态。 */
      requestAnimationFrame(remeasure);
    }
    if (appsBox) {
      appsBox.addEventListener('click', e => {
        const yEl = e.target.closest ? e.target.closest('.tl__year') : null;
        if (yEl) setYear(yEl.dataset.key);
      });
      appsBox.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const yEl = e.target.closest ? e.target.closest('.tl__year') : null;
        if (!yEl) return;
        e.preventDefault();
        setYear(yEl.dataset.key);
      });
      appsBox.addEventListener('transitionend', e => {
        if (e.propertyName === 'grid-template-rows') remeasure();
      });
    }

    /* 切语言要整块重建：名称与说明是 render() 拼进去的，data-zh/data-en 那条通道管不到。
       重建会把每行的 is-lit / 显隐一起清掉，render 末尾的 applyAppsFilter 会按当前搜索词补回来；
       高度变了，几何紧跟着量一次。 */
    document.addEventListener('langchange', () => { render(); requestAnimationFrame(remeasure); });

    return { render, setYear, box: appsBox };
  }

  /* ---------- 域：时间线窗口（line） ----------
     原生滚动换成「换槽」：条目的纵向位置只由「第几行 − 窗口起点」决定（写 --slot），
     窗口顶端是浮点 lineDraw，小行星是另一个浮点 ballDraw（只有它走弹簧）。
     域内状态全部自有：linePos / lineDraw / lineTarget / lineWheel / lineRAF / lineLastT /
     ballDraw / ballVel / ballRAF / ballSpring / moveTimer / lineDragging。
     外部不再直接写这些变量，只通过下面这组方法改位置。

     三个回调注入（都是「这条流之外」的动作）：
       onPage(pg)     滚轮 / 拖拽跨过一条时，通知卡片堆换页（原本直接调 syncCardWindow）
       onDragPaint()  拖动中重画流星线（原本 measureSweep + paintFlow）
       onRelease(t,v) 松手后落到整数页（原本 alignPage）
     这样 line 域只往下驱动 DOM，不再反向调 applyCards / layout，依赖是单向的。 */
  function createLine({ line, rail, PAGE, onPage, onDragPaint, onRelease }) {

    /* ---------- 时间线 ↔ 卡片页，同一条 pageStart ----------
       时间线不再用原生滚动：年号与条目全部绝对定位，纵向位置只由「第几行 − 窗口起点」决定，
       滚动于是变成「换槽」—— 新的一条淡入、队列另一端的那条淡出，中间没有 scrollTop 这份
       会抖的中间状态。
       和旧实现的区别：窗口不再属于某一个年份。年号只是流里的普通一行（装饰），
       所以窗口可以同时压着两年的条目，pageStart / 球的行程都按全局条数算。 */
    function kidsOf() {
      return $('.tl__stream', line);
    }
    function lineItems(kids) {
      return kids ? Array.from(kids.querySelectorAll('.tl__item')) : [];
    }

    /* 把每一条摆进窗口。
       槽距不是「固定一步」而是**逐条累加**：标题折行的那条会占两行高，固定步长会让它压到
       下一条身上（实测 11-12 那条两行，第 5 槽直接溢出窗口下沿）。
       位置用累计像素 --slot（px）。

       ---- v134：从「一格一格跳」改成**连续** ----
       pageStart 是整数（卡片只能整页翻），所以它不能兼当滚动位置。多一层 lineDraw：
       浮点、0..maxStart，是「窗口顶端停在第一条的几倍处」。基址 base 于是变成
       offs[p] 与 offs[p+1] 之间的插值 —— 拖动中条目跟着手指连续移动。
       linePos 是**目标**（整数，等于 pageStart）；松手/滚轮时 lineDraw 直接落到 linePos，
       视觉上的 .36s 位移由 CSS 过渡完成（无过冲），弹簧只拉球 —— 内容不做惯性。 */
    /* 内容窗口位置是 lineDraw（拖动中是小数，其余时候等于 linePos 这个整数目标）；
       小行星的位置是 ballDraw。两者分开：换槽时内容瞬切，球用弹簧追过去 ——
       「惯性」只留给球，条目和年号不跟着过冲。 */
    let linePos = 0, lineDraw = 0, lineDragging = false;
    /* 滚轮只累加 lineTarget，真正的 lineDraw 由 rAF 逐帧插值逼近（同页面滚动那条指数曲线）；
       lineWheel 标记这段插值还没收敛：这段时间里 applyLine 不把位置吸回整数，
       小行星也跟同一个插值位，所以内容与球都是一帧一帧滑，而不是一格一格跳。 */
    let lineTarget = 0, lineWheel = false, lineRAF = 0, lineLastT = 0;
    let ballDraw = 0, ballVel = 0, ballRAF = 0, ballSpring = false;
    let moveTimer = 0;

    /* 滚轮归谁：只看指针是不是停在右侧那颗小行星滚动条（.tl__bar，26px 宽、整列高）上。
       原先那套「页面停 1s 才算人停在文章区」的判据已经删掉 —— 它导致必须先在分栏里
       悬停一秒滚轮才生效，路过或刚滚进来时手感像卡住；反过来，指针在正文中间也会
       把页面滚轮抢去换条。现在不再监听其它位置：分栏里除滚动条以外的地方一律还给页面。 */

    function applyLine() {
      const stream = kidsOf();
      if (!stream) return;
      /* 行 = 年号行 + 条目行，按 DOM 顺序排成一条流。年号也在流里占真实高度，
         所以定位必须按「行」累加，不能只拿条目算 —— 否则跨年时条目会压到年号身上。 */
      const rows = Array.from(stream.children).filter(el =>
        el.classList.contains('tl__yearRow') || el.classList.contains('tl__item'));
      const total = rows.filter(el => el.classList.contains('tl__item')).length;
      if (!total) {
        /* 搜索没有命中：流是空的，没有行程也就没有球 —— 不在这里收掉的话，
           is-nobar 还停在上一轮的状态，球会孤零零挂在空轨道上。 */
        stream.classList.add('is-nobar');
        return;
      }

      const hOf = el => Math.round(el.getBoundingClientRect().height)
                     + (el.classList.contains('tl__item') ? 6 : 0);
      const hs = rows.map(hOf);
      const offs = [];
      let acc = 0;
      hs.forEach(h => { offs.push(acc); acc += h; });

      const itemRows = [];        // 条目序号 → rows 下标
      rows.forEach((el, i) => { if (el.classList.contains('tl__item')) itemRows.push(i); });
      const rowOf = q => itemRows[Math.min(total - 1, Math.max(0, q))];
      const topOf = q => offs[rowOf(q)];
      const heightOf = q => hs[rowOf(q)];

      const maxStart = Math.max(0, total - PAGE);
      linePos = Math.min(maxStart, Math.max(0, linePos));
      /* 内容不追弹簧：除了手指按住球的那一段，lineDraw 永远等于 linePos（整数）。
         搜索后总数变了、外部翻页、重建时间线都靠这一句把窗口收回整数格。 */
      if (!lineDragging && !lineWheel) lineDraw = linePos;
      lineDraw = Math.min(maxStart, Math.max(0, lineDraw));
      /* 球可以停在半格：拖动时跟手，松手后由 springBall 追到整数。
         滚轮是连续态：球直接跟内容同一位（实时滚动条），不等弹簧。
         没在拖、球也没在弹（搜索 / ?year 这类外部重置）时把球对到内容位，避免它从旧行程飞过来。 */
      ballDraw = Math.min(maxStart, Math.max(0, ballDraw));
      if (!lineDragging && !lineWheel && !ballSpring && Math.abs(ballDraw - lineDraw) > .5) ballDraw = lineDraw;

      /* 窗口上沿：若 q 正好是某年的第一条，把上一行（那颗年号）一起包进窗口 ——
         年号是「这一年的标题」，它该跟着这一年的第一条一起出现，而不是刚滚一格就被推出窗口。
         其余情况窗口上沿就是条目自己的顶边。 */
      const baseOf = q => {
        const ri = rowOf(q);
        const prev = rows[ri - 1];
        return prev && prev.classList.contains('tl__yearRow') ? offs[ri - 1] : offs[ri];
      };

      const p = Math.min(maxStart, Math.floor(lineDraw));
      const f = Math.min(1, Math.max(0, lineDraw - p));
      const p1 = Math.min(maxStart, p + 1);
      const base = baseOf(p) + (p1 > p ? (baseOf(p1) - baseOf(p)) * f : 0);
      const kNow = Math.min(total - 1, p + PAGE - 1);
      const winNow = Math.round(topOf(kNow) + heightOf(kNow) - base);

      /* 轨道高与球的行程只认**全局最大的窗口高**：跨年时窗口会多出一颗年号，
         这一页的窗口高会变（多 78px 左右），拿它算球位，球会在换条的一瞬间跳一下。
         每次重算（8 条、纯算术）；字载入 / 窗口变窄会让标题折行、行高变大，
         所以不能缓存 —— 缓存不失效就会拿着旧窗口高把最后一条画到下一年年号上。
         多出来的那几十像素只是让窗口下沿偶尔留白。 */
      let winMax = 0;
      for (let q = 0; q <= maxStart; q++) {
        const k = Math.min(total - 1, q + PAGE - 1);
        winMax = Math.max(winMax, Math.round(topOf(k) + heightOf(k) - baseOf(q)));
      }
      /* 极窄 / 极矮时窗口可能比轨道还高：给一个封顶，剩下的交给 .rail 的 overflow 裁，
         免得整条流把下面的东西顶出去。 */
      const railH = rail.clientHeight || 560;
      winMax = Math.min(winMax, Math.max(245, railH - 8));
      stream.style.setProperty('--lineWin', winMax + 'px');

      /* 年份高亮：窗口里出现过的年份全部 active —— 跨年时两个年号会同时有下划线。
         这只是「你现在看到的是哪几段」，不再承担筛选。 */
      const inView = new Set();
      for (let q = p; q <= Math.min(total - 1, p + PAGE - 1); q++) {
        const el = rows[rowOf(q)];
        if (el.dataset.year) inView.add(el.dataset.year);
      }
      $$('.tl__yearRow', line).forEach(row => {
        const yEl = $('.tl__year', row);
        if (yEl) yEl.classList.toggle('is-active', inView.has(row.dataset.year));
      });

      rows.forEach((el, i) => {
        const s = offs[i] - base;
        el.style.setProperty('--slot', Math.round(s) + 'px');
        /* 可见性按**像素**判，不按「第几条」：拖动中 base 是插值出来的，
           按索引判会让下一条整条先变成 is-out（透明），等整数跨过去才突然出现 ——
           中间空一格，那才是「不连续」的真正观感来源。
           改成像素判之后，下一条在窗口外一寸的地方就已经摆好位置（透明预渲染），
           滑进窗口时由 opacity 过渡淡入，拖动就接得上，不会闪。
           上沿只放 -0.6h：留满一格的话，向上滑出的那条会整个压到年份大字上（实测 2026
           会被条目文字穿过）。露出六成前就压掉，重叠就只剩一条极窄的暗边。 */
        const inWin = s > -hs[i] * .6 && s < winNow - 2;
        el.classList.toggle('is-slot', inWin);
        el.classList.toggle('is-out', !inWin);
      });

      /* 换槽期间：条目内部那套 is-lit 淡入（圆点 / 日期 / 标题 / 年号）跟着流一起被翻一遍，
         和窗口自己的 .is-out 淡出叠起来就像「淡出播了两次」。这段时间内层收成瞬切，
         只保留窗口那一层 fade —— 页面滚动时的流星线入场不受影响。
         类的移除交给 markMove 的计时器：换槽动作可能比 .5s 的 fade 先结束，
         但淡出本身还要播完，不能提前把内层过渡放回来。 */
      if (lineDragging || lineWheel) stream.classList.add('is-move');

      // 滑块位置：0 = 窗口在队首，1 = 已在队尾。**球自己的浮点位置**，和内容解耦
      stream.style.setProperty('--barPos', maxStart ? (ballDraw / maxStart).toFixed(4) : '0');
      /* 球的惯性形变：速度按「页/秒」归一成 -1..1 写给 --rock-sy，球沿运动方向拉长、
         --rock-lead 让它再超前几个像素。速度归零（停下 / 拖动中点住不动）时两个值都回 0，
         球自己弹回正圆 —— 弹回的观感由 .tl__rock 的 scale 过渡（过冲曲线）提供。 */
      const vN = maxStart ? Math.max(-1, Math.min(1, ballVel / maxStart * .85)) : 0;
      stream.style.setProperty('--rock-sy', vN.toFixed(3));
      stream.style.setProperty('--rock-lead', (vN * 4).toFixed(2) + 'px');
      /* 没有行程就没有滚动条：全局不足一页时整条轨道 + 球一起收起来。
         留着一颗拖不动的球等于告诉用户「这里能滚」，是最差的暗示。 */
      stream.classList.toggle('is-nobar', maxStart === 0);
    }
    const sync = applyLine;

    /* 换槽的 is-move 只负责把内层 is-lit 过渡收掉：它至少要陪完这一轮 .5s 的淡出，
       所以不是「弹簧一停就摘」，而是留一个 520ms 的计时器；换槽动作还没结束就续期。

       **续期必须同时认 lineWheel，不能只认 lineDragging。**
       applyLine 里那句 `if (lineDragging || lineWheel) add('is-move')` 是每帧都跑的，
       只靠这一个 one-shot 计时器兜底就会漏：滚轮翻页一旦比 520ms 活得久
       （连续攒 delta、或触控板细碎滑动都要滑很久才收敛），计时器到点时类被摘掉，
       而下一帧 applyLine 又把它加回来 —— 之后没有任何人再来摘，is-move 就此永久粘住。
       粘住之后 `.tl__stream.is-move` 把条目内层过渡收成 `transition: none`，
       于是**之后每一次 is-lit 翻转都是瞬切**：往会滚时条目不再淡出、直接消失
       （这也解释了为什么「翻到过底部」之后才出现、而且时有时无 —— 取决于插值
       是不是活过了那 520ms）。两种换槽态都算「还在动」，都要续期。 */
    function markMove() {
      const s = kidsOf();
      if (!s) return;
      s.classList.add('is-move');
      clearTimeout(moveTimer);
      const tick = () => {
        if (lineDragging || lineWheel) { moveTimer = setTimeout(tick, 520); return; }
        moveTimer = 0;
        s.classList.remove('is-move');
      };
      moveTimer = setTimeout(tick, 520);
    }

    /* 弹簧只拉球（ballDraw），不拉内容。
       手感抄 nexus-editor floatball 的 cubic-bezier(0.34, 2, 0.64, 0.6) —— 那个 y2=2
       就是「冲过头再弹回来」的过冲。ω=√k≈13，c=12 → 阻尼比 ≈ 0.42，过冲约两成；
       松手会先滑过头再落回，甩得越快冲得越远，这就是「惯性」的唯一来源。
       条目 / 年号不等这个弹簧：lineDraw 在换槽时已经是整数，内容直接落格。
       每帧只写球的 CSS 变量，不重算 is-lit —— 内容没动，流星线不需要跟着跑。 */
    function springBall(target, vel0) {
      markMove();
      if (ballRAF) { cancelAnimationFrame(ballRAF); ballRAF = 0; }
      /* 已经在目标上：没有速度可言，形变必须立刻归零，否则球会停在上一帧的突起姿态。 */
      if (Math.abs(ballDraw - target) < .004) {
        ballDraw = target; ballVel = 0; ballSpring = false; applyLine(); return;
      }
      ballVel = vel0 || 0;      // 松手那一帧就把手指速度交给形变，球先一步「甩」起来
      ballSpring = true;
      let pos = ballDraw, vel = vel0 || 0, last = performance.now();
      const k = 200, c = 12;
      const step = now => {
        const dt = Math.min(.032, Math.max(.001, (now - last) / 1000));
        last = now;
        const a = -k * (pos - target) - c * vel;
        vel += a * dt;
        pos += vel * dt;
        if (Math.abs(pos - target) < .004 && Math.abs(vel) < .08) {
          ballDraw = target;
          ballVel = 0;
          ballSpring = false;
          ballRAF = 0;
          applyLine();
          return;
        }
        ballDraw = pos;
        ballVel = vel;
        applyLine();
        ballRAF = requestAnimationFrame(step);
      };
      ballRAF = requestAnimationFrame(step);
    }

    /* 滚轮：只在指针压住右侧小行星滚动条（.tl__bar）时接管，其它位置一概不拦。
       监听挂在 line 根节点上、用事件目标判定 —— renderLine() 每次重建都会换掉
       .tl__bar 这颗 DOM，直接挂在上面的监听会跟着节点一起丢掉。
       命中后 wheel 只把目标 lineTarget 往前推（deltaY / 110 条），真正的 lineDraw 交给
       startLineSmooth() 逐帧插值 —— 和页面滚动同一条指数曲线，内容一帧一帧滑过去，
       不是每格跳一次；小行星的 ballDraw 也跟着同一个插值位。
       目标到队首 / 队尾时不再 preventDefault，滚轮自然交还页面，不会把页面锁死在这条流上。 */
    const WHEEL_ITEM = 110;   // 滚轮 110px ≈ 一条；触控板的细碎 delta 会累积成连续滑动
    line.addEventListener('wheel', e => {
      const t = e.target;
      if (!t || !t.closest || !t.closest('.tl__bar')) return;   // 不在滚动条上：页面自己滚
      if (document.body.classList.contains('is-full')) return;
      const kids = kidsOf();
      if (!kids) return;
      const maxStart = Math.max(0, lineItems(kids).length - PAGE);
      if (maxStart <= 0) return;
      const unit = e.deltaMode === 1 ? 30 : (e.deltaMode === 2 ? window.innerHeight : 1);
      const d = e.deltaY * unit;
      /* 边界认「目标」不认「已画位置」：目标已经在队首/队尾时，滚轮还给页面。 */
      if ((d < 0 && lineTarget <= 0) || (d > 0 && lineTarget >= maxStart)) return;
      e.preventDefault();
      lineTarget = Math.min(maxStart, Math.max(0, lineTarget + d / WHEEL_ITEM));
      startLineSmooth();
    }, { passive: false });

    /* 滚轮插值：和页面滚动同一条指数逼近（SMOOTH .18 / 16.67ms），单帧封顶 1.6 条，
       连续滚轮攒下的目标再多，内容也是匀速滑过去，不再一格一格跳。
       ballDraw 跟 lineDraw 同位，--rock-sy 的速度由每帧位移算，停下那一帧归零，
       小行星自己弹回正圆（不再锁在拉伸姿态）。 */
    function startLineSmooth() {
      if (lineRAF) return;
      const kids = kidsOf();
      lineWheel = true;
      if (kids) kids.classList.add('is-scroll');
      markMove();
      lineLastT = 0;
      const step = t => {
        const dt = lineLastT ? Math.min(t - lineLastT, 64) : 16.67;
        lineLastT = t;
        const diff = lineTarget - lineDraw;
        if (Math.abs(diff) >= .004) {
          const alpha = 1 - Math.pow(1 - .18, dt / 16.67);
          const maxStep = 1.6 * dt / 16.67;
          const stepI = Math.max(-maxStep, Math.min(maxStep, diff * alpha));
          const prev = lineDraw;
          lineDraw = linePos = lineDraw + stepI;
          ballDraw = lineDraw;
          ballVel = (lineDraw - prev) / Math.max(.008, dt / 1000);
          applyLine();
          const pg = Math.floor(lineDraw);
          onPage(pg);
          lineRAF = requestAnimationFrame(step);
          return;
        }
        lineDraw = linePos = ballDraw = lineTarget;
        ballVel = 0;
        lineWheel = false;
        lineRAF = 0;
        applyLine();
        const pg = Math.floor(lineTarget);
        onPage(pg);
        if (kids) kids.classList.remove('is-scroll');
      };
      lineRAF = requestAnimationFrame(step);
    }

    /* 外部改位置（点 deck / 拖完松手 / 重建 / 换年份）之前先停掉插值循环，
       否则旧的一帧会把刚写好的整数位置又拖回旧目标。 */
    function stopLineSmooth() {
      if (lineRAF) { cancelAnimationFrame(lineRAF); lineRAF = 0; }
      lineWheel = false;
      const kids = kidsOf();
      if (kids) kids.classList.remove('is-scroll');
    }

    /* 焦点只留给左侧卡片：时间线整块和它的条目都不进 Tab 序列 —— 滚轮接管现在只认
       右侧那颗小行星滚动条（见上面的 wheel），这里不再需要把焦点扣在轨道上；
       点击条目也不再聚焦，之前那圈 focus-visible 绿框随之消失。 */

    /* 拖那颗球：把它当成真正的滚动条把手。
       拖动 N 像素 = 推进 N/travel * maxStart 条 —— **不取整**，球停在两级之间时
       条目就真的停在两级之间（这是「连续」的全部意义）。
       拖动中卡片不翻（整页翻动会让 5 张卡在手指底下乱跳），松手才 alignPage 过去。
       用 pointerdown + window 上的 move/up，手指滑出轨道也不会断。 */
    line.addEventListener('pointerdown', e => {
      const bar = e.target.closest && e.target.closest('.tl__bar');
      if (!bar) return;
      e.preventDefault(); e.stopPropagation();
      if (ballRAF) { cancelAnimationFrame(ballRAF); ballRAF = 0; }
      stopLineSmooth();            // 手接管：滚轮那串插值立刻停，位置从球的实际位置起算
      ballSpring = false;          // 手接管球，旧的弹簧作废
      markMove();                  // 拖动全程压掉内层 is-lit 过渡，只留窗口 fade
      const kids = bar.parentElement;
      const maxStart = Math.max(0, lineItems(kids).length - PAGE);
      const travel = Math.max(1, bar.getBoundingClientRect().height - 28);
      /* 从球的**视觉位置**起拖，不从内容位起：球可能还在半路上（弹簧没停），
         抓住它就该从手指看到的那一格继续，而不是先跳到内容所在的整数格。 */
      const y0 = e.clientY, d0 = ballDraw;
      lineDraw = linePos = d0;
      lineTarget = d0;
      let prevT = performance.now(), vel = 0;
      lineDragging = true;
      kids.classList.add('is-drag');
      const move = ev => {
        const t = Math.min(maxStart, Math.max(0, d0 + (ev.clientY - y0) / travel * maxStart));
        const now = performance.now();
        if (now - prevT > 1) { vel = (t - lineDraw) / ((now - prevT) / 1000); prevT = now; }
        lineDraw = linePos = ballDraw = t;
        lineTarget = t;
        ballVel = vel;                 // 拖动中球跟手，形变也跟着手指方向
        applyLine(); onDragPaint();
        /* 拖动也逐条同步卡片：球滑过半条时左边就换一张，不再等松手才结算。 */
        onPage(Math.floor(t));
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        kids.classList.remove('is-drag');
        lineDragging = false;
        /* 松手：内容吸到最近一条（瞬切），球带着手速弹过去 —— 惯性只留在球上。
           0.6 是折旧系数（vel 的单位是「条/秒」，直接灌进去会冲出三页）。 */
        const target = Math.round(lineDraw);
        linePos = lineDraw = target;
        onRelease(target, Math.max(-180, Math.min(180, vel)) * .6);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    return {
      sync,                                   // = applyLine：按当前位置重摆槽位
      markMove,
      stream: kidsOf,                         // 时间线流的容器（.tl__stream），layoutRail 要量它的高度
      pos: () => linePos,
      /* stop + 三位置对齐（不做球的处理）：翻页 / 跳年之前先把插值停掉 */
      move(p) { stopLineSmooth(); lineTarget = linePos = lineDraw = p; },
      /* 球直接归位，不从旧行程飞过来（重建时间线时用） */
      snap(p) { ballVel = 0; ballDraw = p; },
      spring(target, vel0) { springBall(target, vel0); },
      /* 内容落格 + 球从当前位置弹过去（外部重置）：球可以慢慢弹，内容不等它 */
      settle(p) { stopLineSmooth(); lineTarget = linePos = lineDraw = p; springBall(p, 0); },
      /* 同上，但球也直接归位 */
      settleSnap(p) { stopLineSmooth(); lineTarget = linePos = lineDraw = p; ballVel = 0; ballDraw = p; springBall(p, 0); },
      /* 程序跳转：不播弹簧，直接落位 */
      jump(p) { linePos = lineDraw = p; ballDraw = p; ballVel = 0; ballSpring = false; }
    };
  }

  /* ---------- 域：贯穿箭头（flow） ----------
     线的几何全部实测（measureFlow），进度由滚动决定（flowProgress → paintFlow）。
     线的「还在场」是整站唯一的进出场事实依据：applyFlow 派生卡片堆、文章区头部、
     滚动球的 is-in / is-leaving，条目与作品集只跟线头走（is-lit），没有第二个触发源。

     域内状态：flowGeo / sweep / flowDrawn / flowWasLive / choreoUntil，以及三个阈值常量。
     外部只通过五个口子碰它：measure / sweep / paint / choreoUntil，以及 applyFlow 里的回调。

     三个注入的回调都是「这条线之外」的动作：
       stopTilt()       入场那一下冻住滚动姿态（原本直接调 tilt.stop）
       onSyncLine()     入场后先摆槽（原本直接调 lineCtl.sync）
       onLayoutRail()   摆完槽再量（原本直接调 layoutRail）
     注意 onSyncLine / onLayoutRail 必须同在下一个 rAF 里且顺序不能换，见 applyFlow 内注释。 */
  function createFlow({ flow, splitEl, line, rail, stopTilt, onSyncLine, onLayoutRail }) {

    const flowP1 = flow ? $('.flow__p1', flow) : null;
    const flowP2 = flow ? $('.flow__p2', flow) : null;
    const flowP3 = flow ? $('.flow__p3', flow) : null;
    const flowG1 = flow ? $('#flowG1', flow) : null;
    const flowG2 = flow ? $('#flowG2', flow) : null;
    const flowG3 = flow ? $('#flowG3', flow) : null;

    /* ---------- 贯穿箭头（flow）：几何全部实测，进度由滚动决定 ----------
       线在 .split 上，不是时间线内部：它要一路画到容器底、再向左拐到接近左缘、最后向下延伸。
       三个分段各由 clip-path 裁长度，所以滚动时改的只是几个自定义属性，不触发重排。
       段与段的长度比固定，进度 p 按总长度（l1+l2+l3）等比推进。 */
    const FLOW_TAIL = 122;     // 拐向左之后往下伸出的那一段长度（正好停在 footer 之上）
    /* 两个 90° 拐角改成贝塞尔平滑曲线时的半径。只影响「拐角弯得多开」，
       不影响线的走向与对位；三段里哪一段不够长（窄屏、极矮容器）就自动收小。 */
    const FLOW_BEND = 80;
    const flowGeo = { x: 0, y0: 0, yb: 0, x2: 12, r: 0, v1: 0,
                      l1: 0, l2: 0, l3: FLOW_TAIL, total: 1, yearY: 0, avail: 0, span: 1,
                      d1: '', d2: '', d3: '' };
    /* 「线扫过」队列：文章子条目（箭头扫）+ 作品集年号与行（尾段扫）都在这里。
       只在布局时量一次 y，滚动时纯数值比较 —— 两条时间线不再各写一套循环。 */
    let sweep = [];
    let flowDrawn = 0;         // 当前已画长度，给「箭头扫到哪一条」复用
    let flowWasLive = false;   // 上一帧线是否还活着，用来只在「活 → 死」那一次统一卸载

    /* ---------- 唯一的进出场状态机：只认流星线画到哪 ----------
       入场：线刚画出来（> ENTER_PX）；出场：线彻底退回 0。
       两个阈值分开，是为了缓慢滚动停在临界点时不会把整块来回抖成呼吸灯
       （以前进出都用同一个 > 2px，鼠标/触控板抖一像素就能把整组重播一遍）。

       **全站只有这一处产生进出场状态**：卡片堆（setCardFlow）、文章区头部（feed__inner.is-in）、
       滚动条（line.is-in）都由它派生；条目与作品集仍按线头位置逐条判定（is-lit），
       但那也是同一条线的进度，不再有第二套触发源。 */
    const ENTER_PX = 2;        // 线长超过这个像素算「线已经在场」
    const CHOREO_IN = 1200;    // 卡片入场编排：5×80ms + 单张 .8s（与 css 对齐）
    const CHOREO_OUT = 1400;   // 出场编排：整组一起收，时长比入场长一档
    let choreoUntil = 0;       // 编舞窗口（此期间冻结滚动姿态，见 createTilt 的 tick）

    function applyFlow(on) {
      if (on === flowState) return;
      flowState = on;
      const feedInner = splitEl.closest('.feed__inner');
      /* 出场先挂 is-leaving、入场反序摘掉：transition 的时长取自「变化后」的样式，
         所以同一次任务里先换状态类再改 is-inview / is-in，反向播放就是用另一套更长的参数。 */
      splitEl.classList.toggle('is-leaving', !on);
      if (feedInner) {
        feedInner.classList.toggle('is-in', on);
        feedInner.classList.toggle('is-leaving', !on);
      }
      line.classList.toggle('is-in', on);
      /* 编舞期间冻住滚动姿态：tick 每帧改写 --ryEnd / --tilt，
         卡片那串 transition-delay 会被顶掉、.8s 还会被压成 .1s。 */
      choreoUntil = performance.now() + (on ? CHOREO_IN : CHOREO_OUT);
      /* 只在弹簧真的在跑时才停：入场那一刻也可能走到这里，那时还没起过帧。
         is-scrolling 只由 createTilt 的 start 加，它挂着就说明弹簧一定已经开起来了。 */
      if (document.body.classList.contains('is-scrolling')) stopTilt();
      setCardFlow(on);                 // 卡片整组：顺次入场 / 整组原路收回
      if (!on) return;
      /* 量线窗口 + 重排槽位都排到下一帧：applyFlow 自己就是被 layoutRail → paintFlow 调起来的，
         同步再量一遍等于在「量到一半」时改 --lineWin（还会把判据算出别的值，让刚入场的状态又翻回去）。
         两件事放同一个 rAF 且顺序不能换：applyLine 先写 --lineWin / --slot，layoutRail 再按新几何量。 */
      requestAnimationFrame(() => { onSyncLine(); onLayoutRail(); });
    }

    function measureFlow() {
      if (!flow) return;
      const spR = splitEl.getBoundingClientRect();
      const railR = rail.getBoundingClientRect();
      const tlR = $('.tl', line);
      const G = flowGeo;
      /* 竖线必须压在圆点中心 —— 直接量圆点，不再靠「容器左缘 + 猜测常量」。
         那个常量（+17）早就和 CSS 里的 margin-left 失配，圆点整体偏在线右侧 17px。
         圆点的入场只有纵向上浮、没有横移，所以首帧量到的 x 就是最终值，窗口滚动也能量
         （条目仍按槽位摆着，宽度有效）。
         线宽 2px，left 取「中心 − 1」才让线正压在点上。 */
      const dotEl = $('.tl__dot', line);
      const streamEl = $('.tl__stream', line);
      const dotC = dotEl
        ? dotEl.getBoundingClientRect().left + dotEl.getBoundingClientRect().width * .5
        : (streamEl || tlR || railR).getBoundingClientRect().left + 1;
      G.x = Math.round(dotC - spR.left) - 1;
      // 起点比窗口再高 12px；终点是容器底 +3px —— 斜卡的视觉底比布局底高一点，留这 3px 才看得见线
      G.y0 = Math.round((tlR ? tlR.getBoundingClientRect().top : railR.top) - spR.top + 12);
      G.yb = Math.round(spR.height + 3);
      /* 第三段同样要压在作品集圆点的中心。作品集那块是居中的（max-width 980），
         左缘随视口变，所以 x2 必须实测，不能再用写死的 12（那是「padding 24 + inner 36」
         的旧假设，宽屏下偏出上百像素）。量不到（没有作品集）时才回落到 12。 */
      const aDot = $('.appsRow__dot');
      /* 搜索把作品集筛空时第一颗圆点是 display:none、rect 全 0：
         拿它算 x2 会把尾段甩到屏幕外，所以「量不到有效宽度」就当没有作品集。 */
      const aDotR = aDot ? aDot.getBoundingClientRect() : null;
      G.x2 = aDotR && aDotR.width
        ? Math.min(G.x - 24, Math.round(aDotR.left + aDotR.width * .5 - spR.left) - 1)
        : 12;
      /* 尾段不再是「停在 footer 之上」那 122px：下面新长出了作品集区块（#appsBlock），
         这段就是用来把上下两块连起来的，所以要按实际距离量到它的年号行。
         量不到（区块还没渲染 / 被收起）时才回落到 FLOW_TAIL。 */
      const abEl2 = $('#appsBlock');
      /* 尾段的**纵向全长**（从容器底量到作品集区块底）。曲线之前的原始长度，
         拐角半径与三段弧长都由它派生。 */
      let v3;
      if (abEl2 && abEl2.getBoundingClientRect().height) {
        /* 尾段一路画到作品集这块的底边：它现在是这条区间的「脊柱」，
           左边那条竖线穿到底，右侧依次是作品集的时间线和 app 卡片。 */
        v3 = Math.max(FLOW_TAIL, Math.round(abEl2.getBoundingClientRect().bottom - spR.top - G.yb));
      } else {
        v3 = FLOW_TAIL;
      }

      /* ---------- 折线 → 贝塞尔平滑曲线 ----------
         原来三段互成直角（竖到底 → 横到左缘 → 再向下），两个拐点都是 90° 的硬折。
         现在每个拐角插一段四分之一圆（三次贝塞尔拟合，κ=.5523），**直线段一个像素不动**：
         竖段仍压在 .tl__dot 中心、尾段仍压在 .appsRow__dot 中心，所以「线跟着圆点走」这条对位不变。
         半径受三段可用长度约束（横段要留出一条直线、两段竖线不能被吃穿），窄屏自动收小；
         r=0 时下面的公式原样退化成折线，不会画出反向的怪弧。 */
      const v1 = Math.max(0, G.yb - G.y0);          // 段 1 纵向全长
      const v2 = Math.max(0, G.x - G.x2);           // 段 2 横向全长
      G.r = Math.max(0, Math.round(Math.min(FLOW_BEND, v1 * .5, v2 * .5, v3 * .5)));
      const r = G.r;
      const arc = r * Math.PI / 2;                  // 一个拐角的弧长（≈ 1.571r）
      const K = .5523;                              // 四分之一圆的三次贝塞尔控制点系数
      const yA = G.yb - r;                          // 段 1 直线终点 = 第一拐角起点
      const xB = G.x - r;                           // 第一拐角的终点 x
      const xC = G.x2 + r;                          // 段 2 直线终点 = 第二拐角起点
      const yD = G.yb + r;                          // 段 3 直线起点
      G.v1 = yA - G.y0;                             // 段 1 里「真直线」的那一截（调试 / 派生量）
      /* 三段的「长度」统一成**弧长**：进度、渐变端点、线头全按它算，
         所以拐角里线头也是等速往前走，不会在拐弯处突然窜一截。 */
      G.l1 = Math.max(1, G.v1 + arc);
      G.l2 = Math.max(1, (xB - xC) + arc);
      G.l3 = Math.max(1, v3 - r);
      G.total = G.l1 + G.l2 + G.l3;

      /* 三个子路径首尾共点：段 1 的终点就是段 2 的起点，段 2 的终点就是段 3 的起点。
         接缝处切线也连续，所以既没有折角、也没有一帧的空隙。
         r=0 时 L 长 0、C 的四个控制点共线 —— 渲染出来仍是原来那条折线。 */
      G.d1 = `M${G.x} ${G.y0}L${G.x} ${yA}`
           + `C${G.x} ${yA + K * r} ${xB + K * r} ${G.yb} ${xB} ${G.yb}`;
      G.d2 = `M${xB} ${G.yb}L${xC} ${G.yb}`
           + `C${xC - K * r} ${G.yb} ${G.x2} ${yD - K * r} ${G.x2} ${yD}`;
      G.d3 = `M${G.x2} ${yD}L${G.x2} ${G.yb + v3}`;
      if (flowP1) {
        flowP1.setAttribute('d', G.d1);
        flowP2.setAttribute('d', G.d2);
        flowP3.setAttribute('d', G.d3);
      }
      /* 渐变全部用 userSpaceOnUse：两段竖线是「to bottom」、横段是「to left」，
         端点就取上面这几个接缝坐标。段与段在接缝处取同一个 alpha（见 paintFlow 的 fAlpha），
         所以拐角不会被画成一亮一暗的两截。横段的右端点用 xB（不是 fx）：curve 那一段
         已经由段 1 的竖向渐变负责，两段在自己那一段里各自从接缝值起步。 */
      if (flowG1) {
        flowG1.setAttribute('x1', 0); flowG1.setAttribute('y1', G.y0);
        flowG1.setAttribute('x2', 0); flowG1.setAttribute('y2', G.yb);
        flowG2.setAttribute('x1', xB); flowG2.setAttribute('y1', 0);
        flowG2.setAttribute('x2', G.x2); flowG2.setAttribute('y2', 0);
        flowG3.setAttribute('x1', 0); flowG3.setAttribute('y1', yD);
        flowG3.setAttribute('x2', 0); flowG3.setAttribute('y2', G.yb + v3);
      }

      /* 窗口顶边相对 .split 顶的 y：progress=0 的判定要用它。
         这里不能再量「第一个 .tl__year」—— 年号现在跟着流一起上滑，滚两页之后
         它的 y 已经跑到窗口外，拿它当锚点会让整条箭头提前点亮 / 延后点亮。
         窗口盒（.tl__stream）的顶边是固定的，它才是这条时间线的「现在」。 */
      const yRect = (streamEl || tlR || railR).getBoundingClientRect();
      G.yearY = Math.round(yRect.top - spR.top);
      /* 从起点滚到页底，实际还能滚多少像素（= 线最长能长到多少）。
         它比几何总长小时说明「页面不够长」，最后那段向下的尾巴按 1:1 永远走不完，
         所以把分母换成这个行程 —— 倍率会略大于 1（实测 906/830 ≈ 1.09，肉眼分不出），
         换来的是一条滚到底能画满的线。行程够长时取 total，就是严格 1:1。 */
      G.avail = Math.round(window.innerHeight * .75
        + (document.documentElement.scrollHeight - window.innerHeight)
        - (yRect.top + window.scrollY));
      G.span = Math.max(1, Math.min(G.total, G.avail));
      flow.style.setProperty('--fx', G.x + 'px');
      flow.style.setProperty('--fy0', G.y0 + 'px');
      flow.style.setProperty('--fyb', G.yb + 'px');
      flow.style.setProperty('--fx2', G.x2 + 'px');
      /* --fl3 是尾段**纵向全长**（曲线之前的原始长度），不是弧长：
         它是给 devtools 看的口径，前端已不再用它当盒高。 */
      flow.style.setProperty('--fl3', v3 + 'px');
      flow.style.setProperty('--fbend', G.r + 'px');   // 拐角半径（实际值，可能被 min 收过）
      flow.style.setProperty('--fv1', G.v1 + 'px');    // 段 1 的真直线长度（调试口径）
    }

    /* 扫过队列：y 摊在这里算一次，滚动时只做数值比较，不再逐条量 rect。
       两块共用一个队列、一个线头判定：文章的年号、文章子条目都看箭头（arrowY），
       作品集的年号与行看尾段线头（hy）。
       文章子条目不再按「年份展开」分组：整条流一直存在，窗口外的靠 is-out 收掉，
       所以队列里始终是全部条目 —— 已经亮的条目不会因为分组切换而残留 is-lit。
       y 只在量的时候算；窗口滚动时条目仍在流里，尺寸是真实的。 */
    function measureSweep() {
      sweep = [];
      /* 坐标原点必须和 paintFlow 的箭头同一个：paintFlow 用的是 flow 自己那套
         --hy / G.y0（.tl__flow 的局部坐标），所以这里量条目也不能拿 split 的顶当 0。
         之前用 split 顶，而线的箭头在 flow 局部坐标，两边差了一个流顶部偏移：
         线头 168px、条目 914px，线永远扫不到，全条时间线停在 is-lit=false。 */
      const spTop = (flow || splitEl).getBoundingClientRect().top;
      const add = (el, tail, lead, y) => {
        const r = el.getBoundingClientRect();
        if (r.height <= 0) return;
        sweep.push({ el, y: Math.round(y != null ? y : r.top - spTop + r.height * .5), tail, lead });
      };
      /* 文章时间线的条目 / 年号用 --slot 的**目标值**算 y，不用过渡中的 rect。
         换槽时 --slot 先改、元素再花 .36s 滑过去；如果量 rect，程序翻页那一下量到的是旧位置，
         paintFlow 会把刚进窗口的条目判成「线还没扫到」而压暗 —— 这正是「只滚动、不渲染」的来源。
         用目标槽位算，线头判定和动画结束时一致，翻页后立刻就是最终状态。 */
      const streamOff = (() => {
        const st = $('.tl__stream', line);
        return st ? st.getBoundingClientRect().top - spTop : 0;
      })();
      const slotCenter = el => {
        const row = el.classList.contains('tl__year') ? el.parentElement : el;
        if (!row || (!row.classList.contains('tl__item') && !row.classList.contains('tl__yearRow'))) return null;
        const slot = parseFloat(row.style.getPropertyValue('--slot'));
        if (!isFinite(slot)) return null;
        return streamOff + slot + el.getBoundingClientRect().height * .5;
      };
      $$('.tl__year', line).forEach(el => add(el, false, 0, slotCenter(el)));
      $$('.tl__item', line).forEach(el => add(el, false, 0, slotCenter(el)));
      /* 作品集：年号是折叠开关，永远在场；条目只有「所属那年是展开的」才进队列。
         收起那组的条目仍有真实尺寸（0fr 只是把格子压到 0 高、内层 overflow 裁掉），
         照着量会把它们当成下一年的行，线头一到就错亮 —— 所以按组过滤。 */
      const appsBox = $('#appsGrid');
      if (appsBox) {
        $$('.tl__year', appsBox).forEach(el => add(el, true, 8));
        $$('.appsRow', appsBox).forEach(el => {
          if (el.closest('.appsGroup:not(.is-open)')) return;
          add(el, true, 8);
        });
      }
      /* 区块标题「APP」在 #appsGrid 之外（它是 #appsBlock 的第一个子元素，
         这样才不参与年号的折叠 / 跳年），但它和下面那排年号是同一级视觉元素：
         同样得跟着尾段线头点亮，否则整块内容一块块浮上来、顶上那个大字一直躺着不动。
         lead 取 8，与年号 / 行一致 —— 线头还没到标题就已经开始淡入，不会明显滞后。 */
      const appsTitle = $('.appsBlock__title');
      if (appsTitle) add(appsTitle, true, 8);
    }

    /* 滚动进度：与滚动同速 —— 滚过多远，线就长多长。
       起点锚在年份顶（2026 滚到屏高 75%、也就是屏底往上 1/4 时才开始画）。
       曾经按 (from - r.top) / (from - to) 把整段行程映射到整条线，
       线比手指快 1.6 倍左右：滚一小段，线已经窜到底，尾迹完全跟不上滚动。

       分母用 flowGeo.span（= min(总长, 可用行程)）：页面够长时是纯 1:1；
       页面不够长（474×710 下总长 906、行程只有 830）时把线压进这 830px，
       倍率 1.09 —— 不做这一步，滚到底还差 76px，最后向下的那截永远画不完。 */
    function flowProgress() {
      const r = splitEl.getBoundingClientRect();
      const from = window.innerHeight * .75 - flowGeo.yearY;
      const drawn = from - r.top;                     // 滚过的位移 = 画出的长度
      return Math.max(0, Math.min(1, drawn / flowGeo.span));
    }

    function paintFlow() {
      if (!flow) return;
      const G = flowGeo;
      const drawn = G.total * flowProgress();
      flowDrawn = drawn;
      const l1 = Math.min(drawn, G.l1);
      const l2 = Math.max(0, Math.min(drawn - G.l1, G.l2));
      const l3 = Math.max(0, drawn - G.l1 - G.l2);
      flow.style.setProperty('--lv1', l1 + 'px');
      flow.style.setProperty('--lh', l2 + 'px');
      flow.style.setProperty('--lv2', l3 + 'px');

      /* 透明度必须按「整条路径的弧长」算，不能让三段各自从最淡重新开始：
         原来每段都是「本段自己从 .16 渐到 .72」，于是竖段画到拐角时已经是最亮的 .72，
         横段却在同一个拐角处又从 .16 起步 —— 接缝处一亮一暗，看上去像线断成两截。
         现在只有一个 alpha 函数：0 处 .16、流星头处 .72、中间按 s/drawn 线性插值，
         每段的两个渐变端点都从这条曲线取值，所以竖段末端的值恒等于横段起点的值。 */
      const fA0 = .16, fA1 = .72;
      const fSpan = Math.max(1, drawn);
      const fAlpha = s => (fA0 + (fA1 - fA0) * Math.min(1, Math.max(0, s / fSpan))).toFixed(3);
      flow.style.setProperty('--la1', fAlpha(0));
      flow.style.setProperty('--lb1', fAlpha(l1));
      flow.style.setProperty('--la2', fAlpha(l1));
      flow.style.setProperty('--lb2', fAlpha(l1 + G.l2));
      flow.style.setProperty('--la3', fAlpha(l1 + G.l2));
      flow.style.setProperty('--lb3', fAlpha(drawn));

      /* 流星头：走完一段就换到下一段接着走。段内那两个拐角现在有曲率，
         所以头进了拐角就按圆弧参数推进（θ 从起点转到终点），其余仍是直线上的等速前进。
         直线段的公式与改折线之前逐像素一致；r=0（退化）时两处除以 r 的分支都不会进，
         结果就落回原来那三段直线。 */
      const r = G.r;
      let hx, hy;
      if (drawn <= G.l1) {
        const s = drawn - G.v1;                    // 越过直线、落进第一个拐角的那一截长度
        if (s <= 0) { hx = G.x; hy = G.y0 + drawn; }
        else {
          const th = Math.min(Math.PI / 2, s / r);
          hx = (G.x - r) + r * Math.cos(th);
          hy = (G.yb - r) + r * Math.sin(th);
        }
      } else if (drawn <= G.l1 + G.l2) {
        const s = drawn - G.l1;                    // 段 2 已走过的长度
        const straight = (G.x - r) - (G.x2 + r);   // 段 2 里真直线的那一截
        if (s <= straight) { hx = (G.x - r) - s; hy = G.yb; }
        else {
          const th = -Math.PI / 2 - (s - straight) / r;
          hx = (G.x2 + r) + r * Math.cos(th);
          hy = (G.yb + r) + r * Math.sin(th);
        }
      } else { hx = G.x2; hy = G.yb + r + (drawn - G.l1 - G.l2); }
      flow.style.setProperty('--hx', hx + 'px');
      flow.style.setProperty('--hy', hy + 'px');
      /* 线是否「还在场」—— 整块分栏唯一的进出场锚点，也是全站唯一的事实依据。
         进用 > ENTER_PX，出要等线彻底退回 0：中间那段保持当前状态，
         所以缓慢滚动（或停在临界点上轻轻抖）不会把整组反复重播。 */
      const live = flowState ? drawn > 0 : drawn > ENTER_PX;
      if (live !== flowState) applyFlow(live);

      /* 手机轻量档：flow 与右栏时间线被 CSS 收掉（display:none），这条线的长度、三段渐变、
         流星头坐标，以及「箭头扫到哪一条」的逐条 toggle，全都画在一个看不见的元素上 ——
         每帧 11 次 setProperty 加一整遍 sweep 循环，换来的是零像素。
         这里保留上面那句入场判定（它是全站唯一的进出场状态，卡片靠 applyFlow 才会入场），
         到此为止。桌面上照旧全画。 */
      if (LITE) return;

      flow.classList.toggle('is-live', live);

      // 箭头扫到哪一条，哪一条才浮出（回头往上滚就收回去）；折走之后就等于全扫过
      const arrowY = G.y0 + Math.min(drawn, G.l1);
      /* 一个循环搞定两块：文章子条目按箭头、作品集（年号 + 行）按尾段线头。
         线头经过就亮、退回去就灭 —— 淡入淡出交给各自的 CSS transition，
         这里只负责布尔量，所以每帧就算全扫一遍也只是几次 classList.toggle。

         文章时间线的条目 / 年号坐标由 measureSweep 用 --slot 的目标值算（不是过渡中的 rect），
         所以程序翻页把条目换到别的槽位之后，这里判出来的仍是「线头扫过没有」，
         新进窗口的条目会被正确点亮，不会因为是新节点就停在 is-lit=false。 */
      const tailY = hy;
      /* 条目 / 年号 / 作品集行：线头扫到就亮、线头退回去就收 —— 回滚时线离开的位置要正常出场。
         只有线整个没了（live 从 true 变 false）那一帧才再统一清一次，
         把停在起点附近、没被线头判定的残留也收干净，下一次线扫回来从头播。 */
      for (let i = 0; i < sweep.length; i++) {
        const s = sweep[i];
        s.el.classList.toggle('is-lit', s.y <= (s.tail ? tailY : arrowY) + s.lead);
      }
      if (!live && flowWasLive) {
        /* 作品集那块在 .split 之外（线尾段一路画到它），所以清点亮不能用 splitEl 当根，
           否则它的年号 / 行会残留 is-lit，回滚到顶部只清掉一半。
           区块标题「APP」同样在 .split 之外，一起收干净。 */
        $$('.tl__item, .tl__year, .appsRow, .appsBlock__title').forEach(el => el.classList.remove('is-lit'));
      }
      flowWasLive = live;
    }

    return {
      measure: measureFlow,       // 量几何：三段长度、拐角半径、路径 d、渐变端点、可用行程
      sweep: measureSweep,        // 量「线扫过」队列（文章条目 / 年号 / 作品集 / APP 标题）
      paint: paintFlow,           // 按滚动进度画线头 + 判进出场 + 逐条 is-lit
      choreoUntil: () => choreoUntil   // 给 createTilt：编舞窗口内冻结滚动姿态
    };
  }

  /* ---------- 域：卡片堆（deck） ----------
     左列 5 张卡按「和 pageStart 的距离」拿角色，四种落点全部只靠 --y 表达：
       page   rel 0..4     当前页，按叠距铺开，越靠后 z 越高
       prev   rel -1..-2   上堆，半透明，当「上一页」入口（两张姿态不对等）
       gone   rel < -2     翻页时被顶下去的旧卡，偏转放大后淡出
       next   rel 5..9     下堆，紧堆在底部，当「下一页」入口（每层错 8px / 右错 7px）

     layout() 算尺寸（--outH / --stack-gap / --card-cap），applyDeck 写落点。
     两者必须成对跑两遍：第一遍读到的 data-role 还是上一页留下的，量不准 —— 见 layout 内注释。

     pageStart 不归这个域：它同时被 line（槽位起点）和调度层（goPage / alignPage）读写，
     所以只读注入 getPageStart()。visibleItems 同理（搜索会改可见集合，且定义在下方）。
     layoutRail 属于 flow 域，通过 onLayoutRail() 回调。 */
  function createDeck({ stack, cardsCol, items, PAGE, visibleItems, getPageStart, onLayoutRail }) {

    const GAP_MIN = 56;

    const DECK_UP_MAX = 2;   // 上堆最多 2 张
    const DECK_DOWN_MAX = 5; // 下堆最多 5 张
    /* 下堆在容器底占的高度 = 最后一张露出的 DECK_PEEK + 每层再往上错开的 8px。
       整摞的**堆顶**（最上面那层纸边）必须接住最后一张页卡的底，堆底裁在容器底：
       layout 按 DECK_PEEK + (n-1)*8 给堆留位，applyDeck 把最深那张放在容器底 - DECK_PEEK，
       往上的层每层抬 8px —— 这样堆不会压到页卡正文，也不会溢出容器去盖流星线。

       手机轻量档把 DECK_PEEK 抬到 34（桌面维持 10，实际露出 10 + DECK_LIFT 4 = 14px）。
       桌面只露一条纸边就够：右边有时间线可以导航、指针 hover 还能提层。
       窄屏两样都没有 —— 右栏已被 CSS 收掉、hover 也不挂了 —— 这条边加上面那行
       「下一组文章」就是「后面还有文章」的唯一提示；而 14px 装不下那行字
       （提示文字顶在 --pad*0.34 ≈ 7px 处、行高 22px，共要 29px），
       实测被容器底的 clip-path 切掉半截，看起来像一张坏卡。
       34 能放下完整一行提示再留一道纸边；多占的 20px 从叠距里让出
       （390×844 实测 gap 107 → 101，第 5 张仍是自然高度，不触发 --card-cap）。 */
    const DECK_PEEK = LITE ? 34 : 10;
    const DECK_STEP = 8;     // 每层错开的高度
    const DECK_X = 7;        // 每层再向右错开的宽度：后面的纸边从右侧露出来，能数出几层
    const DECK_LIFT = 4;     // 下堆第一张压在页卡下沿上方 4px：两条纸边错开，不露背景
    const TAIL_PEEK = 30;    // 仅当最后一张仍放不下（超长正文）时才裁，见 layout 的 availH

    function applyDeck() {
      if (!cardsCol) return;
      const boxH = cardsCol.clientHeight || stack.clientHeight || 560;
      const pad = Math.round(parseFloat(stack.style.getPropertyValue('--outH')) || 84);
      const gap = Math.round(parseFloat(stack.style.getPropertyValue('--stack-gap')) || 76);
      const vis = visibleItems();   // 全局一条流：跨年时卡片直接往下接，不再整组换掉
      /* 这摞实际几层（0..5），layout 给下堆预留的高度用的是同一个数。 */
      const deckN = Math.max(0, Math.min(DECK_DOWN_MAX, vis.length - getPageStart() - PAGE));

      items.forEach(it => {
        const slot = it.slot;
        const idx = vis.indexOf(it);
        if (idx < 0) { slot.dataset.role = 'hidden'; it.rel = -1e9; return; }
        const rel = idx - getPageStart();
        /* 命中判定要按「流里的先后」认人（见 resolveHover）：
           DOM 顺序 ≠ 流顺序 —— 2026-11-15 就出现过 Termux 在 DOM 里排最后、流里却是第 3 张，
           用 DOM 下标判「谁在下面」会把一眼能看见第 3 张错认成第 5 张。
           落位、z-index 全按 rel 走，所以 hover 也只能按 rel 认。 */
        it.rel = rel;
        const prevRole = slot.dataset.role;
        let role, y, zi, turn = 0, deckX = 0;

        if (rel >= 0 && rel < PAGE) {
          // 当前页：从 pad 起按叠距铺开，越靠后 z 越高
          role = 'page'; y = pad + rel * gap; zi = 10 + rel;
        } else if (rel >= -DECK_UP_MAX && rel < 0) {
          /* 上堆两张的姿态是**不对等**的，而且都不许探太高：
             k=1（写「上一组文章」那张）只探出 44px（y = pad - 64，屏幕上卡顶在 -44）——
             这个 44 是 CSS 里 [data-hint="up"] 提示行 top: 40px 的来源：卡顶探出 44、
             提示写在卡内 40 起，正好落在容器 0..20 这条窄带里，不会画到上面的标题栏。
             k=0（更早那张）压到跟容器顶齐平（y = pad - 20，卡顶 0），靠大偏转从左上探出一角 ——
             用户口径「比下一张还低，只是偏转大一些填补左上角」。
             之前两张按 -130 / -60 往上探，最上面那张顶到 -107，直接盖住「文章」标题栏。 */
          const k = rel + DECK_UP_MAX;                 // 0 = 更早那张, 1 = 更近（写提示）那张
          role = 'prev'; zi = 2 + k;
          if (k === 0) { y = pad - 20; turn = 0.72; }
          else { y = pad - 64; turn = 0.34; }
        } else if (rel < 0) {
          /* 上堆只能留 2 张；更早的那几张从页面队列里退出去。
             原来是往容器上方飞（y = pad - 190 - k*26），会从「文章」标题栏上面升出去；
             现在改成从页卡位置**往下**滑到新页上并淡出：z 放在页卡之上，
             否则往下一沉就被新页整张盖住，只看见它凭空消失，看不出方向。 */
          const k = -rel - DECK_UP_MAX + 1;             // 1,2,3...
          role = 'gone'; y = pad + 64 + k * 26; zi = 16;
          turn = 0.52 + k * 0.12;
        } else if (rel < PAGE + DECK_DOWN_MAX) {
          /* 下堆：一摞最多 5 层，每层错 8px，**第一张（下一张要取走的）压在最前**。
             它露出的高度 = 整摞预留的 44 + (n-1)·8，正好等于 boxH - peek；
             标题位写「下一组文章」，纸面一直往下铺，被 .card-stack 的切口平切，
             所以右下三角缺口由这张卡自己的纸补上，不再需要单独的背板。
             后面的层依次低 8px、z 低一层，整张被第一张盖住 —— 切页时它们才滑出来。 */
          const n = deckN;                                                  // 这摞实际几层
          const k = rel - PAGE;                                             // 0 = 下一张要被取走的
          const d = k - (n - 1);                                            // 0 = 最后一张
          const top = boxH - DECK_PEEK + d * DECK_STEP - DECK_LIFT;
          /* 后面的层每层再往右下错开：右边缘从前面那张的右侧探出 7px、顶边低 8px，
             一层一道台阶，最多 5 层时像一叠被轻轻推开的纸；前卡（k=0）保持原位。 */
          deckX = k * DECK_X;
          turn = k * 0.03;
          role = 'next'; y = top; zi = 24 + (n - 1) - k;
        } else {
          role = 'hidden';
        }

        /* 堆两端各一张「标题卡」，占的是那张卡自己的标题位：
           上堆最下面那张 →「上一组文章」（左对齐，跟普通卡片标题一样从左边起）；
           下堆最前面那张 →「下一组文章」（右对齐，贴纸边右端，跟它压在整摞最前的姿态呼应）。
           放卡（页卡退回下堆）时先挂 data-returning 保留正文，等它滑进切口后再换成标题卡；
           否则它还在页卡位置就会先变成一句「下一组文章」，看起来像闪了一下。 */
        const isFrontNext = role === 'next' && rel === PAGE;
        if (rel === -1 && getPageStart() > 0) slot.dataset.hint = 'up';
        else if (isFrontNext) {
          if (slot.dataset.returning === '1') {
            delete slot.dataset.hint;
          } else if (prevRole === 'page') {
            delete slot.dataset.hint;
            slot.dataset.returning = '1';
            clearTimeout(slot.__hintTimer);
            clearTimeout(slot.__retTimer);
            /* 正文在退回的前 0.2s 里淡出（见 CSS 的 opacity 过渡），卡片还在滑；
               0.32s 时才把标题位换成「下一组文章」——这时它已经离开页卡位置，
               既不会在页卡上闪一下标题卡，也不会出现一秒的空白纸。 */
            slot.__hintTimer = setTimeout(function () {
              if (slot.dataset.role === 'next' && slot.dataset.returning === '1') {
                slot.dataset.hint = 'down';
              }
            }, 320);
            slot.__retTimer = setTimeout(function () {
              if (slot.dataset.role === 'next') delete slot.dataset.returning;
            }, 660);
          } else {
            slot.dataset.hint = 'down';
          }
        } else {
          clearTimeout(slot.__hintTimer);
          clearTimeout(slot.__retTimer);
          delete slot.dataset.returning;
          delete slot.dataset.hint;
        }

        slot.dataset.role = role;
        /* 下堆最前面那张的顶边正好接住最后一张页卡：把它的顶边线透明掉，
           避免在页卡下沿多出一条 1px 的浮线；顶边由卡自己的绿色 accent 线交代。 */
        if (role === 'next' && rel === PAGE) slot.dataset.deckTop = '1';
        else delete slot.dataset.deckTop;
        slot.style.setProperty('--y', y + 'px');
        slot.style.setProperty('--deck-x', deckX + 'px');
        slot.style.setProperty('--zi', zi);
        slot.style.setProperty('--turn', turn.toFixed(3));
        /* 下堆不再逐张裁到容器底：卡片保留完整纸面（比容器底长），
           由 .card-stack 的 clip-path 统一切平，取卡时纸面是滑出来的而不是弹开的。
           但飞行 / 全屏时那条整体裁切会被取消（不然通铺的卡被切在容器里），
           下堆就会整张画到容器底外 —— 收起动画里页卡一缩、背景一淡回来，
           这一摞就盖在正文和流星线上（用户 2026-11-15 报的「溢出」）。
           所以每张卡都记下「容器底以上的可见高度」= boxH - y（y 与容器底同一个坐标系），
           CSS 在 body.is-full 时按它在同一个底边再裁一次，整体裁切恢复时两者重合、不跳。 */
        slot.style.setProperty('--deck-vis', isFinite(y) ? Math.max(0, boxH - y) + 'px' : '100%');
        // is-deck：除了当前页，其它都切到「堆」姿态（见 css .post.is-inview.is-deck）
        it.post.classList.toggle('is-deck', role !== 'page');
      });
    }

    /* 上下页的入口就是卡片本身，不再铺热区。
       原来有两颗透明 button（#deckUp / #deckDown）盖在容器上下沿，代价是三份：
       多两个绝对定位元素压在卡片上（指针命中多走一层）、要 syncDecks 维护 hidden、
       还会把卡片的 hover 拦掉。堆里的卡片本来就在那儿 —— 直接点它翻转，DOM 零新增。 */

    function layout() {
      if (!posts[0]) return;
      const cs = getComputedStyle(posts[0]);
      // 容器高只量一次：pass 跑两遍期间它不会变
      const boxH = cardsCol ? cardsCol.clientHeight : stack.clientHeight;
      // 读基准角而不是 --ryEnd：滚动动画会改写 --ryEnd，拿它算尺寸会随滚动漂移
      const ry = Math.abs(parseFloat(cs.getPropertyValue('--ryBase'))) || 34;
      const tilt = Math.abs(parseFloat(cs.getPropertyValue('--tiltBase'))) || 8;
      // 读 base 而不是 --stack-gap：后者已经被我们内联改写过，读回来会自我复利
      const gapBase = parseFloat(getComputedStyle(stack).getPropertyValue('--stack-gap-base')) || 76;
      const w = posts[0].offsetWidth;
      // 卡片高度不等（实测 233/260/233）。只有当前页最后一张要整张塞进容器，
      // 其余只露一条边，底部那截本来就被上面那张盖着 —— 按最后一张算最省空间。
      const out = w * Math.cos(ry * Math.PI / 180) * Math.tan(tilt * Math.PI / 180);
      const pad = Math.round(out + 20);
      stack.style.setProperty('--outH', pad + 'px');

      /* 分页之后左列只有 5 张「当前页」要铺开，上下堆的卡片是压紧的（不算进这里的叠距）。
         叠距 = 容器分给 5 张的空间减去首尾留白、最后一张的视觉高、以及给下堆让出的 DECK_PEEK，
         剩余的分给 4 个间隙；不低于 GAP_MIN，保证「一张压一张」还读得出来。
         **这一整套要跑两遍**：第一遍读到的 data-role 还是上一次翻页留下的（首屏时一张都没有），
         拿不到真正的 tail，只能退回 gapBase；applyDeck() 写完 role 之后第二遍才量得准。
         首屏 gap 一直停在 78 左右（而不是算出来的 66）就是这个原因 —— 只跑一遍。 */
      const pass = () => {
        const paged = items.filter(it => it.slot.dataset.role === 'page');
        const tail = paged[paged.length - 1];
        /* 下堆的**整摞可见高度**（不是最后一张的 44）：n 张时 44 + (n-1)*8。
           页卡最后一张的底 = 容器底 - peek，堆顶就从这条线开始往上铺，堆底裁在容器底；
           这样堆恰好填满页卡下面这段空间，既不留背景，也不会越过容器底盖住流星线。
           n 直接由可见集合算，不再等 applyDeck 写 role —— 第一遍就能量准。 */
        const vis = visibleItems();
        const nextCount = Math.max(0, Math.min(DECK_DOWN_MAX, vis.length - getPageStart() - PAGE));
        const peek = nextCount ? DECK_PEEK + (nextCount - 1) * DECK_STEP : 0;
        /* 首张视觉顶是 pad - out，但**卡片外框的底 = --y + offsetHeight**：
           倾斜把外框整体上移 out、又把外框高度多撑出 out，两头正好抵掉，底边只跟 --y 走。
           所以下面填 fill 要减的是 pad（不是 pad - out）—— 拿 firstTop 会白白多减 34px，
           最后一张底边比目标低 34px，正好压进纸堆底下（v=125 那个 34px 重叠就是这么来的）。 */
        if (tail) {
          /* 最后一张只在**内容真的放不下**时才裁（超长正文），常规情况下保持自然高度 ——
             用户口径：页卡恢复原高度，让下堆挪，不让页卡挪。
             可用高度从几何正推：底边 = --y + offsetHeight，--y 从 pad 起算，
             底下要给整摞下堆留 peek（44 + (n-1)*8），中间 4 个间隙不能低于 GAP_MIN：
             availH = boxH - peek - pad - (n-1) * GAP_MIN
             不能沿用旧的「从堆区推 cap」（cap = deckH + TAIL_PEEK + headH）：那个式子和 gap
             互为解，任何 cap 都自洽，于是 cap 给 218 时 196 的卡根本不裁、正文全被堆盖住。 */
          const availH = Math.round(boxH - peek - pad
                                    - Math.max(0, paged.length - 1) * GAP_MIN);
          /* 用 scrollHeight 判「内容比上限高」而不是 offsetHeight：
             cap 一旦生效，offsetHeight 就等于 cap，下一次比较变成「cap > cap」= false，
             于是撤掉上限、高度弹回、再命中 —— cap 每帧开关一次，叠距跟着抖。 */
          if (availH > 120 && tail.post.scrollHeight > availH) {
            tail.post.style.setProperty('--card-cap', availH + 'px');
            tail.post.classList.add('is-capped');
          } else {
            tail.post.style.removeProperty('--card-cap');
            tail.post.classList.remove('is-capped');
          }
        }
        /* h 用 offsetHeight（布局高），不用 rect.height：rect 被 3D 变换撑大 34px，
           那个 34 已经在 --y 的起算点里抵掉了，再算一遍就重复扣。 */
        const h = tail ? tail.post.offsetHeight : posts[0].offsetHeight;
        /* 叠距把整页铺满，但**给整摞下堆留出 peek**（有堆时 = 44 + (n-1)*8，最后一页没有堆就是 0）：
           最后一张页卡的底 = 容器底 - peek，堆顶从这条线往上铺 —— 堆永远盖不到最后一张的任何一行字，
           页卡和堆之间也不会留出背景缝。
           **分母永远按 PAGE 算（不是 n）**：这一年只有 1-2 篇时，若把 4 个间隙摊给 1 个间隙，
           那两张卡会被拉开 300px，页面上像三个大空档；按 5 张的格子算，卡片就保持
           5 张时的间距紧凑排在上面，缺的格子空着 —— 换年份时卡片的密度不会突变。 */
        const fill = (boxH - peek - pad - h) / Math.max(1, PAGE - 1);
        const gap = Math.max(GAP_MIN, fill);
        stack.style.setProperty('--stack-gap', Math.round(gap) + 'px');
        /* 定位交给 applyDeck：它按角色（页 / 上堆 / 下堆 / 翻走的）逐张写 --y，
           这里只负责把尺寸算好（--outH / --stack-gap 是它读的输入）。 */
        applyDeck();
      };
      pass();
      pass();

      onLayoutRail();
      /* 补一帧：窗口高（--lineWin）与虚线的判定读的是刚改过的叠距，同帧读会拿到旧值
         （踩过：改完叠距虚线要等下一次 resize 才更新）。 */
      requestAnimationFrame(() => onLayoutRail());
      /* 首屏还要再补一帧**整段 layout**：第一次调用时卡片刚由 applyCards 摆好，
         上一轮的 --card-cap 还没撤、rect 也还是旧高（实测 h 读到 196 而真实是 230），
         gap 于是偏到 75 —— 必须等这一帧 DOM 稳定后再算一次才收敛到 66。
         用 _patched 守卫只补一次，否则 layout 里的 rAF 会自我循环。 */
      if (!layout._patched) {
        layout._patched = true;
        requestAnimationFrame(() => { layout(); });
      }
    }

    return {
      apply: applyDeck,   // 逐张写落点（读 --outH / --stack-gap，没有就先用默认值）
      layout              // 尺寸与两遍收敛；末段补一帧 layoutRail + 一次自我修补
    };
  }

  /* ---------- 域：指针命中 + 预览（hover 的前半） ----------
     指针进卡片区 → 命中判定（按 it.rel 认人，不看 DOM 顺序）→ 提层 / 放行正文 / 右侧预览。
     三件事都在工厂内：命中（itemOfHit / resolveHover）、状态切换（applyHover）、节流（queueResolve）。
     一帧最多一次命中测试，指针抖动 < 6px 不重算。

     只搬前半：焦点（filterKey / focusPost）与条目高亮（setItemHover）仍留在 initSplit ——
     它们被 applyCards / 翻页 / 搜索大量引用，还要反过来改卡片状态，属于卡片列的公共面，
     不是指针交互的私事。所以这里注入四个回调：fadeOthers / applyFocus / markFront / getFocusPost。

     工厂创建时就把三条监听挂上，末尾那次 markFront() 也一并带进来（原在 initSplit 里紧挨监听）。 */
  function createHover({ stack, prev, rail, items, textOf, getFocusPost, applyFocus, fadeOthers, markFront }) {

    /* 手机轻量档：不挂指针 hover 这一套。
       触屏没有真正的 hover —— 点一下会合成 mouseenter 并**粘住**，卡片停在「已悬停」态；
       而 hover 原本要做的三件事，在窄屏下只剩一件是有用的、且还是坏的：
         · 右半换成该文预览 —— 窄屏早被 previewOff() 关掉了，没有可换的面板；
         · 这张提到最上层并点亮阴影 —— 直接点开就能读，不需要它提前预览；
         · 其余卡片退成半透明（.card-slot.is-faded = opacity:.28）—— 这条最伤：
           手机上的卡堆每张只露一条头部（约 94px），再压到 .28 就只剩个影子，
           翻页时连「下一页有哪几篇」都认不出来。
       所以整块指针交互不挂载（三条监听 + hoverRaf + 预览渲染一并省掉）。
       **markFront() 必须照跑**：它决定哪张卡放行正文
       （.card-slot:not(.is-front) 的 .post__text 是 visibility:hidden），
       跳过它会让所有卡片正文都藏着不显示。它跟 hover 无关，只管「谁完整露着」。
       点击锁定的焦点（applyFocus / fadeOthers）不经过这里，手机上照旧可用。 */
    if (LITE) { markFront(); return; }

    function renderPreview(it) {
      // 同样现取：语言切换后 items 里的文本快照会过期
      it.title = textOf($('.post__heading h3', it.post));
      it.excerpt = textOf($('.post__excerpt', it.post));
      it.detail = textOf($('.post__detail', it.post));
      it.meta = textOf($('.post__meta', it.post));
      prev.innerHTML =
        `<div class="pv" style="--tc:${it.accent}">`
        + `<p class="pv__meta">${it.meta}</p>`
        + `<h3 class="pv__title">${it.title}</h3>`
        + (it.thumb ? `<img class="pv__fig" src="${it.thumb}" alt="${it.alt}">` : '')
        + `<p class="pv__text">${it.excerpt}</p>`
        + (it.detail ? `<p class="pv__sub">${it.detail}</p>` : '')
        + (it.tags ? `<div class="pv__tags">${it.tags}</div>` : '')
        + `</div>`;
    }

    let hovered = null;
    /* 窄屏不加载预览：每次 hover 都要重建一段 HTML、再解一张 16:9 的图，
       而触屏没有真正的 hover（点击后 mouseenter 会粘住），这笔钱不值得花。
       断点与 CSS 里 .rail__pane--preview 的 display:none 必须一致。 */
    const previewOff = () => window.matchMedia('(max-width: 899px)').matches;
    function showPreview(it) {
      if (previewOff()) return;
      if (hovered === it) return;
      hovered = it;
      renderPreview(it);
      rail.classList.add('is-preview');
      prev.setAttribute('aria-hidden', 'false');
    }
    function hidePreview() {
      hovered = null;
      rail.classList.remove('is-preview');
      prev.setAttribute('aria-hidden', 'true');
    }

    let hoverItem = null;              // 现在被指向的是哪一张（null = 没有）
    let hoverRaf = 0, hx = 0, hy = 0;
    let hLastX = -1e9, hLastY = -1e9;  // 上次重算时的指针位置（抖不到 6px 就不重算）

    function itemOfHit(el) {
      const slot = (el && el.closest) ? el.closest('.card-slot') : null;
      if (!slot || !stack.contains(slot) || slot.dataset.role !== 'page') return null;
      for (let i = 0; i < items.length; i++) if (items[i].slot === slot) return items[i];
      return null;
    }
    function resolveHover(x, y) {
      const hits = document.elementsFromPoint(x, y);
      let best = null;
      for (let i = 0; i < hits.length; i++) {
        const it = itemOfHit(hits[i]);
        if (it && (!best || it.rel > best.rel)) best = it;  // 流里越靠后的那张才是这一条的归属者
      }
      return best;
    }

    function applyHover(it) {
      if (it === hoverItem) return;
      if (hoverItem) {
        hoverItem.post.classList.remove('is-hover');
        hoverItem.slot.classList.remove('is-top');
      }
      hoverItem = it;
      if (it) {
        it.post.classList.add('is-hover');
        it.slot.classList.add('is-top', 'is-front');   // 这张变完整可读：提到最上层并放行正文
        fadeOthers(it);
        showPreview(it);
        return;
      }
      // 鼠标离开不能把「点击锁定的焦点」一起清掉：有 focusPost 就恢复它
      if (getFocusPost()) applyFocus();
      else { fadeOthers(null); markFront(); }
      hidePreview();
    }

    function queueResolve(x, y, force) {
      /* 卡片还没入场（线没来）时不判：那时 5 张都在容器外，命中到的只会是位移前的空壳。
         flowState 是进出场唯一状态量（见 applyFlow），比各自维护一个「是否入场」更省事。 */
      if (!flowState || document.body.classList.contains('is-full')) { applyHover(null); return; }
      if (!force && Math.abs(x - hLastX) < 6 && Math.abs(y - hLastY) < 6) return;
      hLastX = x; hLastY = y; hx = x; hy = y;
      if (hoverRaf) return;            // 一帧最多一次命中测试
      hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; applyHover(resolveHover(hx, hy)); });
    }

    stack.addEventListener('pointermove', e => queueResolve(e.clientX, e.clientY, false), { passive: true });
    /* 页面在指针底下滚动时不会发 pointermove，但会发 pointerover（目标元素变了）：
       这里强制重算一次，卡片从指针下滑过去时目标也能跟着换。 */
    stack.addEventListener('pointerover', e => queueResolve(e.clientX, e.clientY, true), { passive: true });
    stack.addEventListener('pointerleave', () => {
      hLastX = hLastY = -1e9;
      applyHover(null);
    });
    markFront();
  }

  function initSplit() {
    const stack = $('#cardStack');
    const rail = $('#rail');
    const line = $('#railTimeline');
    const prev = $('#railPreview');
    if (!stack || !rail || !line || !prev) return;

    /* 贯穿箭头（.flow）挂在 .split 这一层，而不是时间线内部：它要越过时间线的高度
       一直画到容器底、再拐向左，留在 .tl 里会被 .rail 的 overflow 裁掉。 */
    const splitEl = stack.closest('.split') || stack.parentElement;
    const flow = $('#flow');
    /* 折线改贝塞尔之后，这条线是同一个 <svg> 里的三个子路径 + 三条沿弧长的渐变。
       句柄先取好：几何变了只改 d 与渐变坐标（不碰 dash 与线头），滚动每帧只动后者。 */
    // 卡片列的滚动容器：叠层压到 GAP_MIN 还放不下时，由它接住溢出（见 layout()）
    const cardsCol = stack.closest('.split__cards');

    function textOf(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

    /* 1. 每张卡包一层 .card-slot：堆叠定位和「淡出」都用这一层。
          hover 判定挂在卡片自己身上（槽位是 pointer-events:none，否则上层槽位的矩形
          会盖住下层卡片露出来的那条边）。卡片回正是「左移 6px + 向右变宽」，
          新区域完整盖住旧区域，鼠标不会掉出去抖。 */
    const items = [];
    posts.forEach(p => {
      // 列表里有时已经有外层槽（阅读器会为新增文章补卡），直接复用，避免套两层
      let slot = p.parentNode;
      if (!slot || !slot.classList || !slot.classList.contains('card-slot')) {
        slot = document.createElement('div');
        slot.className = 'card-slot';
        // 分页之后位置全部由 --y 表达（见 applyDeck），这里不再写 --i / 原始序号：写了两套定位源只会互相打架
        p.parentNode.insertBefore(slot, p);
      }
      slot.appendChild(p);

      /* 「上一组 / 下一组」不再是一颗浮在纸边上的小字，而是直接占掉那张卡的**标题位**：
         风格与非堆卡片完全一致（同样的字号、同样的左右留白），看得出来「这也是一张卡」。
         四段文案写成 header 的 data-*，CSS 按 data-hint 与 html[data-lang] 挑一条 att-content 显示；
         卡片自己的标题文本一直躺在 DOM 里（只在提示卡上 color:transparent），翻页那一刻立刻回来。 */
      const headOfPost = $('.post__head', p);
      if (headOfPost) {
        headOfPost.dataset.hzUp = '上一组文章';
        headOfPost.dataset.heUp = 'Previous posts';
        headOfPost.dataset.hzDown = '下一组文章';
        headOfPost.dataset.heDown = 'Next posts';
      }

      const timeEl = $('.post__meta time', p);
      const thumb = $('.post__thumb', p);
      const date = p.dataset.date || (timeEl ? timeEl.getAttribute('datetime') : '') || '';
      items.push({
        post: p, slot, date, year: date.slice(0, 4),
        accent: p.dataset.accent || '#8f8cf0',
        title: textOf($('.post__heading h3', p)),
        excerpt: textOf($('.post__excerpt', p)),
        detail: textOf($('.post__detail', p)),
        meta: textOf($('.post__meta', p)),
        thumb: thumb ? thumb.getAttribute('src') : '',
        alt: thumb ? (thumb.getAttribute('alt') || '') : '',
        tags: $('.post__tags', p) ? $('.post__tags', p).innerHTML : ''
      });
    });

    /* 下堆不再铺独立背板：每张下堆卡保留自己的完整纸面，整摞由 .card-stack 的
       clip-path 在容器底平切一刀；第一张（下一张要取走的）压在最前，它的纸面一直铺到
       切口，右下那块三角缺口就由这张纸补齐。 */

    /* 2. 两个尺寸都按实测算：
          outH   = 布局宽·cos(落位角)·tan(倾斜角)，即斜卡右端上翘伸出的那一截，叠层要给它让位；
          叠距   = 父容器（定高）分给卡片的那点空间反推出来的，卡片总高不够就拉开铺满。
          只在 layout 里写，过滤不重算 —— 卡片进出时右半时间线保持不动。 */
    /* 压缩叠距的下限。原来写 72，是怕「一张压一张」读不出来；
       但分页之后一页固定 5 张，容器 560px 装 5 张时算出来的叠距常落在 60~71，
       卡在 72 反而让最后一张露出容器底（实测 587 > 560，tags 被裁）。
       降到 56：既能读出一张压一张，又保证最后一张贴底铺满。 */

    /* ---------- 分页：一页 5 张，上下各一个卡片堆 ----------
       pageStart 是「当前页第一张」在可见集合里的序号（连续量，不一定是 5 的倍数：
       点 deck 走整页 ±5，时间线滚一条走 ±1）。
       每张卡按它和 pageStart 的距离拿一个角色，四种落点全部只靠 --y 表达：
         page  p = pageStart..pageStart+4    展开的 5 张
         prev  p = pageStart-2..-1          上堆，半透明，当「上一页」入口
         gone  p < pageStart-2              翻页时被顶上去的旧卡，偏转放大后完全淡出
         next  p = pageStart+5..+9          下堆，紧堆在底部，当「下一页」入口
       12 张上限 = 5 + 2 + 5：再多就不是「堆」而是一摞纸了，也省掉无用绘制。 */
    const PAGE = 5;          // 一页几张有内容的卡

    /* 时间线域实例。必须放在 PAGE 之后：工厂创建时就会读它（滚轮 / 拖拽 / 槽位都要用）。
       三个回调都是函数声明（已 hoisted），运行时才真正调用。 */
    const lineCtl = createLine({
      line, rail, PAGE,
      onPage: pg => syncCardWindow(pg),
      onDragPaint: () => { flowCtl.sweep(); flowCtl.paint(); },
      onRelease: (t, v) => alignPage(t, v)
    });
    let pageStart = 0;

    /* 卡片堆域实例。pageStart 留在外面（line 与调度层都要写它），只读注入；
       visibleItems 与 layoutRail 都定义在下面，用延迟求值避开 TDZ。 */
    const deckCtl = createDeck({
      stack, cardsCol, items, PAGE,
      visibleItems: () => visibleItems(),
      getPageStart: () => pageStart,
      onLayoutRail: () => layoutRail()
    });


    /* 切语言后卡片文本变了，叠距/溢出/视觉框都要按新高度重来。
       监听挂在这里而不是 applyLang 里：layout 是这个闭包的私有函数，
       在 applyLang（模块级）直接调会 ReferenceError —— 而这错误发生在初始化序列中间，
       会连带让 initSplit / initEvents 全都不执行，整页的点击与搜索一起失效。 */
    document.addEventListener('langchange', () => { requestAnimationFrame(layout); });

    /* 右半的窗口高统一由 applyLine 的 --lineWin 决定（跨年时最多两颗年号一起进窗口，
       所以轨道高按所有窗口的最大值取，不随当前页忽高忽低）。 */
    /* 姿态域实例。放在这里而不是文件末尾：applyFlow 要能直接停弹簧。
       choreoUntil 用 getter 传（延迟求值），实例本身在这句话之后就一直存在。 */
    const tilt = createTilt({ splitEl, stack, getChoreoUntil: () => flowCtl.choreoUntil() });

    /* 贯穿箭头域实例。tilt 与 flow 互相引用（flow 要停弹簧、tilt 要读编舞窗口），
       两边都用延迟求值，所以谁先创建都不影响。 */
    const flowCtl = createFlow({
      flow, splitEl, line, rail,
      stopTilt: () => tilt.stop(),
      onSyncLine: () => lineCtl.sync(),
      onLayoutRail: () => layoutRail()
    });

    function layoutRail() {
      flowCtl.measure();
      const stream = lineCtl.stream();
      if (!stream) { flowCtl.sweep(); flowCtl.paint(); return; }
      /* 窗口高只有一份真相：applyLine() 量出来的 --lineWin（行高逐行累加后的最大值）。
         这里以前还写过一个更小的 --kidsMax（按容器可用高度截断），可条目是绝对定位 +
         overflow:visible，盒矮了并不会少露几行，只会把最后一条画到下一年年号上。
         那套上限已删除 —— 位置正确优先于「矮屏少露一条」这个做不到的假设。 */

      /* 这里原来还有一段「可滚区间画虚线」的计算：按 .tl__stream 的 rect 反算
         --dashTop / --dashH，并在 .rail__pane--line 上挂 has-scroll 让虚线亮起。
         虚线层已整块删除（文章时间线不再提示「这段还能滚」，线只保留一条实描边），
         所以 kR / top / dh / has-scroll 这些量连同 .flow__dash 一起退役。 */

      flowCtl.sweep();
      flowCtl.paint();
    }

    /* 滚动每帧调一次 paintFlow：只写 5 个自定义属性 + 给若干条目切一个类，
       没有布局读写，所以不需要 rAF 队列（scroll 事件本身就是按帧派发的）。
       resize 要整段重算几何。
       这里原本还挂着一只 .tl__kids 的 scroll 监听，把 scrollTop 反算成 pageStart ——
       窗口化之后 kids 根本不滚动，那只监听连同它的 lineSyncing 防回环一起退役。 */
    window.addEventListener('scroll', () => flowCtl.paint(), { passive: true });
    /* 改窗口尺寸会改变标题折行 → 行高、槽位、窗口高都变，所以必须**先摆槽再量**：
       applyLine() 写 --lineWin 与 --slot，layoutRail() 才能按新几何量虚线 / 队列。 */
    window.addEventListener('resize', () => { lineCtl.sync(); layoutRail(); }, { passive: true });
    /* 字载入后标题可能从一行折成两行（同一个坑）：再摆一次槽、量一次窗口高。 */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { lineCtl.sync(); layoutRail(); });
    }

    /* 卡片列「刚好溢出/刚好不溢出」时会多出/少掉一条滚动条，clientWidth 随之 ±8px，
       右侧时间线跟着平移 —— 可几何只在 layout 时量一次，箭头就停在旧 x 上。
       盯住 clientWidth 变化，隔一帧补一次量（同一帧内可能连续触发多次，用 queued 合并）。 */
    if (window.ResizeObserver && cardsCol) {
      let lastW = cardsCol.clientWidth, queued = false;
      const ro = new ResizeObserver(() => {
        if (cardsCol.clientWidth === lastW) return;
        lastW = cardsCol.clientWidth;
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; layoutRail(); });
      });
      ro.observe(cardsCol);
    }

    /* 3. 时间线：一条全局流 —— 所有年份排成一条连续的行列（年号只是流里的一行装饰），
          窗口最多同时显示 PAGE 条；年份不参与筛选，窗口跨年时多颗年号可以同时 active。
          ?year=2025 仍然可用，语义是「把窗口起点挪到这一年的第一条」。
          时间线整体从 items 生成，不另外维护一份数据；包成函数是为了切语言后能整条重建
          （标题是抄出来的快照，不会自己跟着 data-zh/data-en 变）。 */
    let filterKey = null;      // 点了某个条目之后的高亮（null = 没选中任何一条）
    let focusPost = null;      // 点击锁定的是哪一张卡（和 filterKey 一起构成「条目焦点」）

    /* 全局条目流：所有年份一起排成一条时间线（新年在上、旧年在下，年内部保持卡片 DOM 顺序）。
       左侧卡片堆、右侧时间线窗口、滚动条全部读这一份顺序 —— 年份不再是「一次只展开一年」的
       分类开关，只是流里的装饰标记：窗口跨年时两个年号可以同时 is-active。 */
    const yearsOf = () => {
      const out = [];
      items.forEach(it => { if (it.year && out.indexOf(it.year) < 0) out.push(it.year); });
      return out.sort((a, b) => b.localeCompare(a));   // 新 → 旧
    };

    const streamOrder = [];
    yearsOf().forEach(y => items.forEach(it => { if (it.year === y) streamOrder.push(it); }));

    // 可见集合：搜索只隐藏卡片，时间线流要跟着一起重建（见 filter），所以这一份按它取子集
    const visibleItems = () => streamOrder.filter(cardOn);

    /* ?year=2026 仍然可用：不再「只显示这一年」，而是把全局窗口的起点挪到这一年的第一条。
       条数不足一页时由 applyCards 夹回去。 */
    {
      const wanted = new URLSearchParams(location.search).get('year') || '';
      const first = wanted ? streamOrder.findIndex(it => it.year === wanted) : -1;
      if (first > 0) pageStart = first;
    }

    /* ---------- 第二部分：作品集（Apps） ----------
       数据在 js/apps.data.js，目录在 apps/<id>/index.html。
       它是一块**独立区块**（#appsBlock），落在文章区下方，不与文章卡片 / 时间线共用容器：
       左边一列 app 卡片、右边一列作品集自己的时间线（按年号排）。
       流星线从上面那条时间线底部拐向左下 —— 那一拐把右半腾了出来，这块的右半就是它的位置。 */


    /* 年号只有这一份实现：文章时间线与作品集都签它，避免两套年号各自长歪。
       opts.active 决定这一颗年号是否带下划线（作品集：该年展开 = active，默认每年都展开，
       所以可以多年同时 active；文章时间线则是窗口内出现过年份就 active）。
       文章时间线的年号现在也是可点的：点它 = 把窗口起点挪到该年第一条（见 jumpToYear）；
       右边的 .tl__fold 保留 —— 它既是「这里是一个年份段落」的提示，也随 is-active 转向。 */
    const yearHTML = (y, accent, opts = {}) => {
      const tag = opts.tag || 'span';
      const cls = 'tl__year' + (opts.active ? ' is-active' : '');
      /* 文章时间线的年号只当装饰 + 鼠标跳年（keyboard:false），作品集那排才是真正的
         折叠开关，只有它进 Tab 序列。 */
      const a11y = opts.keyboard === false
        ? ` data-key="${y}"`
        : ` role="button" tabindex="0" data-key="${y}"`;
      return `<${tag} class="${cls}"${a11y} style="--yc:${accent}">`
           + `<span class="tl__y">${y}</span>`
           + `<span class="tl__fold" aria-hidden="true"></span>`
           + `</${tag}>`;
    };

    /* 作品集域实例。yearHTML 与 flow 的三个函数用参数注入 —— 工厂内部不碰 items / pageStart。 */
    const apps = createApps({ yearHTML, measureFlow: flowCtl.measure, measureSweep: flowCtl.sweep, paintFlow: flowCtl.paint });


    /* 时间线：所有年份共用一条流。
       每一行（年号 / 条目）都是绝对定位，纵向位置由 applyLine 写的 --slot 决定；
       年号只是流里的装饰 —— 它跟条目一起上滑，不再折叠、也不再切换年份。
       窗口固定显示 5 条条目（PAGE），跨年时两个年号可以同时 is-active。

       年号是**预加载的占位行**：每个年份都先生成一颗年号，不等它的条目进窗口；
       线头扫到才把年号渲染出来（is-lit），没有条目进窗口的年份只保留占位、不 active。 */
    function renderLine() {
      let list = '';
      yearsOf().forEach(y => {
        const its = streamOrder.filter(it => it.year === y && !it.post.classList.contains('is-hidden'));
        /* 这一年被搜索全筛掉：**连年号一起不渲染**。
           留着占位行的话，几颗年号下面没有条目撑着，--slot 全是 0 → 全堆在流顶挤成一团。
           有命中的年份仍照旧：年号占一行、条目跟在后面。 */
        if (!its.length) return;
        const accent = its[0].accent || '#8f8cf0';
        list += `<div class="tl__yearRow" data-year="${y}">`
              + yearHTML(y, accent, { keyboard: false })
              + `</div>`;
        its.forEach(it => {
          it.title = textOf($('.post__heading h3', it.post));
          // data-post 用来唯一定位到一条：同一天可能挂好几篇，光靠日期定不到唯一一条
          list += `<div class="tl__item${it.date === filterKey ? ' is-active' : ''}" role="button"`
                + ` data-key="${it.date}" data-post="${it.post.id}" data-year="${it.year}"`
                + ` style="--tc:${it.accent}">`
                + `<span class="tl__dot"></span>`
                + `<span class="tl__date">${it.date.slice(5) || it.date}</span>`
                + `<span class="tl__title">${it.title}</span>`
                + `</div>`;
        });
      });
      /* 全局只有一颗球：整条流共用它，行程按「总条数 − 一页」算（见 applyLine）。
         环 / 球 / 轨道的层次照旧：轨道 0 → 上半环 1 → 球 2 → 下半环 3。 */
      list += `<span class="tl__bar" aria-hidden="true">`
            + `<span class="tl__track"></span>`
            + `<span class="tl__ring tl__ring--hi"></span>`
            + `<span class="tl__rock"></span>`
            + `<span class="tl__ring tl__ring--lo"></span>`
            + `</span>`;
      line.innerHTML = `<ol class="tl"><li class="tl__stream">${list}</li></ol>`;
    }

    renderLine();
    apps.render();
    // 切语言重建时间线：line 上已经挂着 is-in，新元素一出生就匹配终态规则，
    // transition 只在值「变化」时触发，所以重建后直接是最终样子，不用再等一遍入场延迟。
    // 重建后条目是新的元素（旧的 is-lit 随节点一起丢掉），所以必须重新量一遍布局、
    // 把箭头已经扫过的那些点亮回来，并把滚动位置对回当前页。
    /* 重建之后 lineDraw 要归位到 pageStart：新 DOM 的条目按当前页摆放，
       linePos / lineDraw 还停在旧值上（或半条上）就会错一格。 */
    refreshSplitLine = (reset) => {
      if (reset) pageStart = 0;   // 搜索换了命中集合 = 换了一条新流，从队首重新开始
      renderLine();
      applyCards();
      /* 先把连续位置按到新起点，再走 settleSnap：它会取消可能还在跑的弹簧
         （搜索前刚翻过页的话，旧 target 会把新流又拖回去），然后按新 DOM 重摆槽位。 */
      lineCtl.settleSnap(pageStart);   // 新流从头开始：球直接归位，不从旧行程飞过来
      deckCtl.layout();
      repaintLine();              // 重建后按线头重判新条目（不是一把全亮，保留流星线入场）
    };

    /* 拖动松手后直接把卡片翻到这一页：goPage 有 480ms 节流（防连点把 5 张卡的 --y
       在半路上改向），拖完立刻调用会被它挡掉，所以这条走不节流的直通道。 */
    function alignPage(next, vel0 = 0) {
      const total = visibleItems().length;
      const maxStart = Math.max(0, total - PAGE);
      next = Math.min(maxStart, Math.max(0, next));
      /* 内容先落格（拖动中 lineDraw 是小数），球留在松手位置交给 springBall。 */
      lineCtl.move(next);
      if (next !== pageStart) {
        pageStart = next;
        turning = performance.now();
        applyCards();
      }
      /* 先起球：applyLine 看到 ballSpring 才不会被「外部重置」的短路把球直接对到内容位。 */
      lineCtl.spring(next, vel0);
      lineCtl.sync();
      deckCtl.layout();
    }

    /* 4. 预览面板：内容直接从卡片里取，不额外写一份 */

    /* 5. 左侧卡片的可见集合：全站一张表 —— 所有年份按 streamOrder 的顺序排进同一个页，
          年份不再参与筛选，只在右侧时间线里做装饰。搜索仍然会把卡片隐藏掉。 */
    function cardOn(it) {
      return !it.post.classList.contains('is-hidden');
    }

    /* 正文渲染白名单：当前页的最后一张（天然完整露出，常驻）+ 正在 hover / 选中的那张。
       分页之后多一条规则：最后一张下面还压着「下页堆」时，它下半截是被堆盖住的，
       这时不渲染概述 —— 否则文字从堆缝里漏出来一半，比没有更糟。
       只有滚到最后一页（后面没有堆）它才整张露出来，才给正文。
       其余卡片只画标题条：半透明状态下正文会透到别的卡上，像叠错了层。
       悬停时间线条目时，被指向的那张也要进白名单（否则它被提上来却是一张空壳）。 */
    let hoverKey = null;   // 时间线条目正在指向的日期（null = 没指向）
    function markFront() {
      const vis = visibleItems();
      /* 当前页最后一张恒可读正文 —— 即使后面还压着下堆。
         下堆只有 92px，正文区被它盖住大半，露出来的那截仍然是有信息量的；
         早先「有下堆就整页不渲染正文」虽然省事，但一整页 5 张全是标题条，太干。
         限高交给 layout 里的 --card-cap（否则长正文会把 5 张顶出容器）。 */
      const tail = vis.slice(pageStart, pageStart + PAGE).pop() || null;
      // 同一天可能挂好几篇（2026-11-12 就有 5 篇），条目的 data-key 是日期、定不到唯一一张，
      // 所以取「匹配的里面 DOM 最后的」—— 它叠在最上面，正好是被指出来给人看的那张
      const hitTail = hoverKey ? vis.filter(it => it.date === hoverKey).pop() : null;
      items.forEach(it => it.slot.classList.toggle('is-front',
        it === tail || it === hitTail || it === focusPost));
    }

    function applyCards() {
      const vis = visibleItems();
      // pageStart 夹在 [0, max(0, 总数 - 一页)]：搜索会改变全局总数，
      // 不夹的话会停在空页上（比如从 8 篇筛到只有 1 篇）
      const maxStart = Math.max(0, vis.length - PAGE);
      if (pageStart > maxStart) pageStart = maxStart;
      if (pageStart < 0) pageStart = 0;

      /* 换页后，之前点选的那篇可能已经不在这一页：焦点跟着解除，
         否则新一页的卡会被旧的 .is-faded 一起压暗。 */
      const hadFocus = focusPost;
      if (hadFocus && !vis.slice(pageStart, pageStart + PAGE).includes(hadFocus)) {
        focusPost = null;
        filterKey = null;
        $$('.tl__item', line).forEach(li => li.classList.remove('is-active'));
      }

      deckCtl.apply();    // 逐张写落点（读 --outH / --stack-gap，没有就先用默认值）
      markFront();    // 换页后「最后一张」换人了，正文白名单要跟着换
      if (hadFocus && !focusPost) applyFocus();   // 焦点已解除，把半透明一起撤掉
    }

    /* 翻页：点 deck 走整页 ±5，时间线条目滚一条走 ±1（见 initSplit 里的 kids scroll）。
       turning 期间不吃第二次点击 —— 动画 .62s，连点两次会让 5 张卡的 --y 在半路上改向，
       看上去像卡带。 */
    let turning = 0;
    /* 程序翻页（点 deck / 点「下一组文章」）不走页面滚动，流星线本身不用动；
       但 is-lit 是按线头算的，翻页后必须按**新窗口的槽位**重新判一次，
       否则新进窗口的条目还停在上一窗口的 is-lit=false（整行在、内容透明，
       看起来就是「只滚动、不渲染」）。measureSweep 用 --slot 的目标值，
       所以这里量到的是动画终点，不是还没滑到位的旧坐标；paintFlow 之后
       线头扫过的条目保留亮、没扫到的仍是暗 —— 流星线的入场动画不受影响。 */
    function repaintLine() {
      flowCtl.sweep();
      flowCtl.paint();
    }
    function goPage(delta) {
      const now = performance.now();
      if (now - turning < 480) return;
      const total = visibleItems().length;
      const maxStart = Math.max(0, total - PAGE);
      const next = Math.min(maxStart, Math.max(0, pageStart + delta));
      if (next === pageStart) return;
      turning = now;
      pageStart = next;
      /* 内容直接落格：点 deck 翻 5 张 / 滚轮翻 1 条都不再做位移缓动，
         只让下面的球用弹簧追过去。卡片堆自己的 .62s 翻页动画不变。 */
      lineCtl.move(pageStart);
      applyCards();
      lineCtl.spring(pageStart, 0);
      lineCtl.sync();       // 先把时间线摆进新槽
      deckCtl.layout();          // 新的「最后一张」高度可能不同 → 叠距重算一次
      repaintLine();     // 再按新槽位重判一次线头（不能用过渡中的 rect）
    }

    /* 连续滚轮跨过一条时：卡片堆换一张，和时间线同拍。
       上一条进上堆、下一条从下堆取一张；只改角色 + 落点，不走整页翻的 480ms 节流。 */
    function syncCardWindow(next) {
      const total = visibleItems().length;
      const maxStart = Math.max(0, total - PAGE);
      next = Math.min(maxStart, Math.max(0, next));
      if (next === pageStart) return;
      pageStart = next;
      applyCards();
      deckCtl.layout();
      lineCtl.sync();     // layout 可能改了 --lineWin，槽位要按新窗口高度重排一次
      repaintLine();
    }

    /* 切年份这一段退役了：年份现在只是时间线流里的装饰，不再是一次只展开一年的分类开关。
       侧边栏的 ?year=YYYY 仍然能用，但语义变成「把全局窗口的起点挪到这一年的第一条」
       （见文件前面的 streamOrder 初始化），不再是「只显示这一年」。 */

    /* 点条目：锁定这一篇（再点一次取消）。
       点击 = 和「hover 左侧卡片」同一套视觉：被锁定的那张留在最上层、可读，其余卡片半透明；
       hover 时间线条目仍然只给边框（见 setItemHover），两套入口互不覆盖。
       旧版这里是「只留这一篇」—— 把其它卡片藏掉；全局分页下那样会把页序打出一个洞
       （可见集合剩 1 条，pageStart 只能回到 0），所以保留完整一页，只改透明度与层高。 */
    function applyFocus() {
      if (!focusPost) {
        items.forEach(it => it.slot.classList.remove('is-faded', 'is-top'));
        markFront();
        return;
      }
      items.forEach(it => {
        it.slot.classList.toggle('is-faded', it !== focusPost);
        it.slot.classList.toggle('is-top', it === focusPost);
      });
      markFront();   // focusPost 也要进「可读白名单」，否则高亮的是一张空壳
    }
    function toggleFocus(postId) {
      const it = items.find(x => x.post.id === postId);
      if (!it) return;
      const same = filterKey === it.date && focusPost === it;
      filterKey = same ? null : it.date;
      focusPost = same ? null : it;
      $$('.tl__item', line).forEach(li =>
        li.classList.toggle('is-active', !!filterKey && li.dataset.key === filterKey));
      applyFocus();
    }

    /* ?post=post-N 深链：把目标挪进当前页窗口再锁定。
       只改 pageStart 不动滚动，滚动与展开交给 runPostDeeplink 编排 —— 那样才能
       先让首屏淡出、流星线画出来，再让卡片飞成阅读页。 */
    revealPost = postId => {
      const it = items.find(x => x.post.id === postId);
      if (!it) return null;
      const vis = visibleItems();
      const idx = vis.indexOf(it);
      if (idx >= 0) {
        const maxStart = Math.max(0, vis.length - PAGE);
        const next = Math.min(idx, maxStart);
        if (next !== pageStart) {
          pageStart = next;
          lineCtl.move(pageStart);
          applyCards();
          lineCtl.spring(pageStart, 0);
          lineCtl.sync();
          deckCtl.layout();
          repaintLine();
        }
      }
      toggleFocus(postId);
      return it.post;
    };

    /* 外部改了 pageStart（换年份 / 筛选 / 重建时间线）之后，把内容窗口收回整数、
       球追上新的整数（球可以慢慢弹，内容不等它）。
       springBall 里带「已经到位就一帧结束」的短路，所以平常调用几乎不花时间。 */

    /* 6. 悬停联动：
          · 悬停卡片 → 这张提到最上层并点亮，其余几张一起退成半透明，右半换成该文预览；
          · 点击时间线条目 → 和上一条同一套（锁定的那张留上层可读，其余半透明）；
          · 悬停时间线条目 → 只给边框，不动透明度与层高（见 setItemHover）。
          卡片几何不再随 hover 变化，所以这里不用管 hit 区的抖动。 */
    function fadeOthers(except) {
      // except 为空（鼠标离开）时必须全部撤掉 —— 直接写 it !== except 会让 null 也命中
      items.forEach(it => it.slot.classList.toggle('is-faded', !!except && it !== except));
    }

    /* ---------- 命中判定：按「露出条」而不是按「谁画在最上面」 ----------
       卡片是叠着画的：被 hover 的那张 `.is-top`（z=30）一提起，它的四边形就盖住了下面几张
       「露出来的那一条」（实测第一张的 quad 跨 280px，而错距只有 97px，一张能压住 2–3 条）。
       浏览器按几何命中，于是从上往下扫只能落到 1、3、5 —— 不是事件写错了，是**判定依据**错了。

       这里不问「指针压在哪个元素上」，而是问「指针落在哪一条露出条里」：
       露出条 i = 卡片 i 的顶边 ~ 卡片 i+1 的顶边（同一条斜边，间隔恒等于错距）。
       它恰好等价于「指针下**流里最靠后**的那张一页」（比的是 rel，不是 DOM 下标）——
       因为越靠后的一页落得越低、z 越高，它的顶边就是上一条露出条的下界。
       所以判定**完全不看 z 序**，与被提起的是哪张无关，也就不会「提层 → 命中变了 → 再提层」地自己抖起来
       （这是挤压方案最容易踩的坑）。

       **一定比 rel，不能比 DOM 下标**：DOM 顺序是渲染顺序，流顺序是 vis 里的顺序，两者会分家
       （2026-11-15：Termux 在 DOM 里排第 5、流里排第 3，按下标判会把第 3、4 条都判给它）。

       为什么不加透明命中层：它要维护第二份几何（翻页 / 筛选 / resize / 全屏都要同步），
       而这份几何浏览器本来就有 —— 一次 elementsFromPoint 就够，0 个新节点、0 次布局写入。 */
    /* 指针交互域实例。命中与预览不向外暴露任何方法 —— 三条监听和末尾那次 markFront 都在工厂内，
       创建即完成挂载。四个回调都是函数声明（已 hoisted），getFocusPost 延迟求值。
       位置有讲究：工厂创建时会跑一次 markFront()，它要读 hoverKey / focusPost，
       所以实例化必须排在 hoverKey 声明之后。 */
    createHover({
      stack, prev, rail, items, textOf,
      getFocusPost: () => focusPost,
      applyFocus, fadeOthers, markFront
    });


    function keyOf(li) { return li && li.dataset ? (li.dataset.key || '') : ''; }

    /* 悬停条目 → 只做「点出它是哪一张」：给对应卡片的边框换 accent 色（.is-hl），
       不放行正文之外的东西，也**不**提层、**不**压暗其它卡片。
       早先这里照搬卡片 hover 那一套（is-top 提层 + is-dim 压暗其余），
       鼠标一扫过时间线整列卡就开始闪，且被指向的卡凭空跳到最上层；
       真正被指向的卡现在只需要一条边框就能认出来。
       卡片自己 hover 的 is-hover / is-top / is-faded 仍是原来那套，互不影响：
       两边各自在 mouseleave 清自己的状态。 */
    function setItemHover(key) {
      if (hoverKey === key) return;
      hoverKey = key;
      items.forEach(it => {
        const hit = !!key && it.date === key;
        it.post.classList.toggle('is-hl', hit);
      });
      markFront();   // 被指向的那张要放行正文，否则高亮的是一张空壳
    }

    /* 窗口高（--lineWin）跨年时会变，高度过渡结束后再量一次溢出 / 虚线区间。
       量的是 height 不是旧的 max-height —— 条目流没有折叠态了。 */
    line.addEventListener('transitionend', e => {
      if (e.propertyName === 'height') layoutRail();
    });

    /* 年份现在是可点的跳转：把窗口起点挪到这一年的第一条。
       后面不足一页（first + PAGE 超过总数）时不再硬凑 5 条，而是把窗口落到 maxStart
       —— 球停在轨道底部，窗口仍是最末 5 条；用户再滚动时恢复正常的一页推进。 */
    function jumpToYear(y) {
      const vis = visibleItems();
      const first = vis.findIndex(it => String(it.year) === String(y));
      if (first < 0) return;
      const maxStart = Math.max(0, vis.length - PAGE);
      const next = Math.min(first, maxStart);
      pageStart = next;
      // 年号是程序跳转，不是滚动：球直接落到目标位置（底部），不播弹簧
      lineCtl.jump(pageStart);
      applyCards();
      lineCtl.sync();
      deckCtl.layout();
      repaintLine();
    }

    line.addEventListener('mouseover', e => {
      const li = e.target.closest ? e.target.closest('.tl__item') : null;
      setItemHover(keyOf(li) || null);
    });
    line.addEventListener('mouseleave', () => setItemHover(null));

    /* 年号可点：跳到该年第一条；条目仍是「点 = 锁定这一篇」。
       两套手势互不覆盖 —— 年号只动窗口起点，条目只动高亮 / 卡片焦点。 */
    line.addEventListener('click', e => {
      const year = e.target.closest ? e.target.closest('.tl__year') : null;
      if (year && year.dataset.key) { jumpToYear(year.dataset.key); return; }
      const li = e.target.closest ? e.target.closest('.tl__item') : null;
      if (li) toggleFocus(li.dataset.post);
    });
    line.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const year = e.target.closest ? e.target.closest('.tl__year') : null;
      if (year && year.dataset.key) { e.preventDefault(); jumpToYear(year.dataset.key); return; }
      const li = e.target.closest ? e.target.closest('.tl__item') : null;
      if (!li) return;
      e.preventDefault();
      toggleFocus(li.dataset.post);
    });


    /* 8. 宽度变化（拖窗 / 旋屏）→ 斜出量要重算 */
    let rq = false;
    window.addEventListener('resize', () => {
      if (rq) return;
      rq = true;
      requestAnimationFrame(() => {
        rq = false;
        tilt.rebase();     // 基准角可能随宽度 / 断点变了，重读之后弹簧才有正确的回位目标
        deckCtl.layout();
      });
    });

    /* 9. 入场编排只剩一个开关，现在就在 applyFlow 里（见上文的状态机）：
          卡片堆整组、文章区头部、滚动球都读同一个 flowState；
          线、年号、子条目、作品集仍然只跟流星线的位置走（paintFlow / measureSweep），
          线走多远，条目就亮到哪一条，回滚就原路收回去 —— 同一条线的进度，没有第二套触发源。
          （原来那条 posts-inview 事件通道已删除：状态量在闭包之间只走 flowState + setCardFlow。） */

    /* 上下页热区：点一下就整页翻（±PAGE）。上下堆里那几张卡自己不吃点击
       （.card-slot 是 pointer-events:none，堆里的卡也没开自动命中），所以热区不会和卡片抢。 */
    /* 翻页的点击入口：卡片的角色就是入口（下堆的卡 = 下一页，上堆的卡 = 上一页）。
       capture 阶段拦 —— 必须在 initEvents 那条「点任意卡片进阅读」的冒泡监听之前
       stopPropagation，否则点堆会先被开放成全屏。
       **手机轻量档不挂**：那边是平铺的单列列表（见 mobile-lite.css ④），没有上下堆，
       每张卡都是「打开这一篇」；沿用这条会把 role=next/prev 的卡变成翻页，等于点不动。 */
    if (cardsCol && !LITE) {
      cardsCol.addEventListener('click', e => {
        const slot = e.target.closest && e.target.closest('.card-slot');
        const role = slot && slot.dataset.role;
        if (role !== 'next' && role !== 'prev') return;
        e.preventDefault();
        e.stopPropagation();
        goPage(role === 'next' ? PAGE : -PAGE);
      }, true);
    }

    refreshSplitCards = () => { applyCards(); lineCtl.settle(pageStart); lineCtl.sync(); deckCtl.layout(); repaintLine(); };

    /* 搜索筛作品集：一行 = 一个 app，命中按「名称 / 说明 / 类型 / 日期 / 年份」的文本判
       （行的 textContent 已经把前四样都包了，年份从 data-year 补上）。
       一年一组 —— 组里全筛掉就把整组（连同年号）收掉，否则几颗年号会挤在一起。
       只改显隐，不负责量线：调用方（filter 之后的 refreshSplitLine、或重建后的 apps.render()）
       自己会把 layoutRail 跑一遍。 */
    applyAppsFilter = (needle) => {
      const box = $('#appsGrid');
      if (!box) return false;
      let any = false;
      $$('.appsRow', box).forEach(row => {
        const hay = (row.textContent + ' ' + (row.dataset.year || '')).toLowerCase();
        const hit = !needle || hay.includes(needle);
        row.classList.toggle('is-hidden', !hit);
        if (hit) any = true;
      });
      $$('.appsGroup', box).forEach(g => {
        g.classList.toggle('is-hidden', !g.querySelector('.appsRow:not(.is-hidden)'));
      });
      const note = $('#appsEmpty');
      if (note) note.hidden = !needle || any;
      return any;
    };

    applyCards();
    deckCtl.layout();
    /* 首次布局后再对一次时间线位置：pageStart 可能是被夹紧过的（比如某一年的文章不足 5 篇），
       而 renderLine 生成时还不知道——这里补一次，保证两侧从第一帧起就是同一页。 */
    lineCtl.move(pageStart);
    lineCtl.snap(pageStart);
    lineCtl.sync();
    /* 首屏这一页的条目先点亮，不用等页面滚到分栏才开始扫。
       注意必须放在 layout() 之后：layout 里的 paintFlow 会按当前线头重算 is-lit，
       先点后算会被它按滚动位置（首屏滚动 0）重新抹掉。 */
    if (document.readyState === 'complete') { deckCtl.layout(); repaintLine(); }
    else window.addEventListener('load', () => { deckCtl.layout(); repaintLine(); }, { once: true });

    /* ---------- 手机档：把时间线的年号搬进卡片列表 ----------
       手机上是「线 · 年号 · 卡片」一条纵向流水线（见 mobile-lite.css ④），
       右栏整块不渲染，年号就没人画了。这里按卡片的 data-date 取年份，
       在每一年的第一张卡前面插一行 .tl__year——样式直接复用时间线那颗年号
       （同一份 .tl__y 下划线、同一号字号），所以它不是「另做一套」。
       判据读 matchMedia 实时值（不是 LITE 那个加载时常量）：从桌面把窗口缩到
      手机宽度时补上、拉回去时再撤掉，两条方向都跟得上。
       桌面档必须什么都不插 —— 那边是叠卡片堆，多出几个不参与 --y 布局的兄弟会打乱落点。 */
    const LITE_MQ = window.matchMedia('(pointer: coarse) and (max-width: 900px), (max-width: 600px)');
    function syncInlineYears() {
      const stack = $('#cardStack');
      if (!stack) return;
      $$('.tl__year--inline', stack).forEach(el => el.remove());
      if (!LITE_MQ.matches) return;
      let last = '';
      $$('.card-slot', stack).forEach(slot => {
        const post = $('.post', slot);
        const time = post ? $('.post__meta time', post) : null;
        const date = (post && post.dataset.date) || (time && time.getAttribute('datetime')) || '';
        const year = date.slice(0, 4);
        if (!year || year === last) return;
        last = year;
        const row = document.createElement('div');
        row.className = 'tl__year tl__year--inline';
        row.innerHTML = '<span class="tl__y"></span>';
        $('.tl__y', row).textContent = year;
        stack.insertBefore(row, slot);
      });
    }
    syncInlineYears();
    LITE_MQ.addEventListener('change', syncInlineYears);
  }

  /* ---------- 锚点落点：一套算法，两处入口 ----------
     `#posts`（.feed__head）和 `.appsBlock__title` 的 scroll-margin-top 都是 --landing，
     所以「侧栏链接 / 首屏下箭头」的原生 hash 跳转、以及搜索触发的程序滚动，落点完全一致。 */
  function landingY(el) {
    if (!el) return 0;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + window.scrollY - margin;
  }

  function scrollToEl(el) {
    if (!el) return;
    if (smoothScrollTo) smoothScrollTo(landingY(el));
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 文章深链：?post=post-N / ?article= / ?p= ----------
     URL 带上文章 id 时，页面加载完先走一遍开场（云/日月/标题），再自动往下滚：
     第一段到文章区大标题（首屏淡出 + 卡片入场），第二段到卡片堆（流星线画完），
     最后把指定文章按原路径全屏展开。?post=11 这种纯数字等价于 post-11。
     与已有的 #post-N 锚点不同：锚点只是滚到卡片，深链要连阅读页一起打开。 */
  /* ?post= 的解析：id、纯数字、文章标题（中/英文）都能用。
     标题从卡片 h3 a 的 textContent 与 data-zh/data-en 三处取 —— applyLang 会把
     textContent 换成当前语言，只看它会在另一种语言的标题上漏匹配。
     归一化只吃掉大小写、空白和标点，不碰中英文字符本身。 */
  function resolvePostParam(raw) {
    const r = String(raw || '').trim();
    if (/^\d+$/.test(r)) return 'post-' + r;
    if (/^post-\d+$/i.test(r)) return r.toLowerCase();
    const norm = s => String(s || '').toLowerCase()
      .replace(/[\s\u3000]+/g, '')
      .replace(/[：:·・，,。.、！!？?\-_—()（）\[\]【】《》<>"'“”‘’]/g, '');
    const want = norm(r);
    if (!want) return null;
    const cards = $$('.post');
    const names = p => {
      const a = $('h3 a', p);
      return [p.id, a && a.textContent, a && a.dataset && a.dataset.zh, a && a.dataset && a.dataset.en];
    };
    const exact = cards.find(p => names(p).some(n => norm(n) === want));
    if (exact) return exact.id;
    /* 只写了标题的一部分也认；但多命中就不猜 —— 几篇「直播」会被同一个词捞出来 */
    const partial = cards.filter(p => names(p).some(n => {
      const k = norm(n);
      return k.length > 2 && k.indexOf(want) >= 0;
    }));
    return partial.length === 1 ? partial[0].id : null;
  }

  function runPostDeeplink() {
    const q = new URLSearchParams(location.search);
    const raw = q.get('post') || q.get('article') || q.get('p') || '';
    if (!raw) return;
    const id = resolvePostParam(raw);
    if (!id) {
      console.warn('[deeplink] 找不到文章：' + raw);
      return;
    }
    const post = document.getElementById(id);
    if (!post || !post.classList.contains('post')) {
      console.warn('[deeplink] 找不到文章：' + raw);
      return;
    }
    // 提前拉这一篇的正文：不等用户点，500ms 的展开飞行结束前多半已下完
    if (window.CBloadReaderAssets) window.CBloadReaderAssets(id);
    const target = revealPost ? revealPost(id) : post;

    const play = () => {
      const head = $('#posts');
      if (smoothScrollTo && head) smoothScrollTo(landingY(head));
      else scrollToEl(head);
      setTimeout(() => {
        const split = $('.split');
        if (smoothScrollTo && split) smoothScrollTo(landingY(split) + 80);
        else scrollToEl(split);
      }, 1000);
      setTimeout(() => openFullscreen(target), 1900);
    };
    /* 开场未播完就等它；__cbHero 不存在（无内联脚本的外部环境）则立刻走 */
    if (!window.__cbHero || window.__cbHero.introDone) play();
    else window.addEventListener('hero-intro-final', play, { once: true });
  }

  /* 搜索命中 → 把那一块带到眼前（通用落点）。
     不再写死「滚到文章区」：命中落在哪一块就滚到哪一块的锚点。
     两块按文档顺序排（文章在上、作品集在下），取第一个有命中的；
     以后再加区块，只要往这张表里加一行。
     全站零命中时什么都不做 —— 空态提示（#feedEmpty / #appsEmpty）留在原地告诉用户。 */
  const hitRegions = () => [
    { anchor: $('#posts'),            hit: '.post:not(.is-hidden)' },
    { anchor: $('.appsBlock__title'), hit: '.appsRow:not(.is-hidden)' }
  ];

  function revealFirstHit() {
    const region = hitRegions().find(r => r.anchor && $(r.hit));
    if (!region) return;
    const anchor = region.anchor;
    const margin = parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0;
    /* 锚点已经在落点附近（±48px）就不动；否则上下都跟 —— 这一步只在搜索框打字时触发，
       此刻用户的注意力就在搜索框和结果上，命中换了区块就该跟过去。
       （原来那条「只往下、不往上拽」的守卫会在「先落到页底的作品集、再改词命中文章」时把人
       留在页底，等于没跟。） */
    if (Math.abs(anchor.getBoundingClientRect().top - margin) <= 48) return;
    scrollToEl(anchor);
  }

  function handleAction(action) {
    switch (action) {
      case 'settings':      toggleSidebar(); break;
      case 'close-sidebar': toggleSidebar(false); break;
      case 'info':          toggleSidebar(true, '#about'); break;
      case 'night':         applyTheme(html.dataset.theme === 'night' ? 'day' : 'night'); break;
      case 'lang':          applyLang(html.dataset.lang === 'zh' ? 'en' : 'zh'); break;
      case 'to-posts':      scrollToEl($('#posts')); break;
      case 'to-top':
        if (smoothScrollTo) smoothScrollTo(0);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'to-cover':      scrollToEl($('#top')); break;
      default: break;
    }
  }

  function initEvents() {
    document.addEventListener('click', e => {
      const target = e.target;
      if (!target || !target.closest) return;

      const actionEl = target.closest('[data-action]');
      if (actionEl) { handleAction(actionEl.dataset.action); return; }

      // 侧栏里的锚点：交给浏览器跳转，同时收起抽屉
      if (target.closest('.sidebar a[href^="#"]')) { toggleSidebar(false); return; }

      const choice = target.closest('[data-theme-choice]');
      if (choice) { applyTheme(choice.dataset.themeChoice); return; }

      const langChoice = target.closest('[data-lang-choice]');
      if (langChoice) { applyLang(langChoice.dataset.langChoice); return; }

      // 全屏态：标题行不再当退出区（它现在是一条「目录开关 + 标题 + 退出」的工具栏，
      // 点标题、点日期都会误触退出），退出只认最右端那颗 .post__toggle。
      if (document.body.classList.contains('is-full')) {
        const full = target.closest('.post.is-full');
        if (full && target.closest('.post__toggle')) { e.preventDefault(); closeFullscreen(); }
        return;
      }

      /* 列表态：点卡片任意位置都进全屏（标题链接只阻止锚点跳转）。
         原来这里还有一条「点 .post__toggle 进全屏」的分支 —— 那颗按钮在列表态已经
         display:none（只有全屏态才渲染成退出按钮），永远不会命中，属于死分支，删掉。
         它同时也是旧实现里「图标按钮 + 整卡热区」两套入口并存的痕迹。 */
      const post = target.closest('.post');
      if (post) {
        if (target.closest('a')) e.preventDefault();
        openFullscreen(post);
      }
    });

    const scrim = $('#scrim');
    if (scrim) scrim.addEventListener('click', () => toggleSidebar(false));
  }

  /* ---------- AX 字标：逐笔书写，回到顶部时重写一遍 ----------
     参考 splashscreen.html 的 stroke-dasharray / stroke-dashoffset 描边方式：
     getTotalLength() 动态量出每笔长度（不硬编码），CSS 负责先写 A\ 那一笔、
     带 delay 再落最后一笔 /。这里只负责量长度、择时启动与重播。

     重播做法：掐掉 .is-writing 再同帧加回来（中间强制一次重排），CSS 动画就会
     从 from 重新开始。入场只有笔画，没有整体淡入——字标的可见性由 .badge__mark
     跟 --p 的滚动淡出单独控制，两者互不耦合：向下滚时笔画没画完也照常淡出，
     滚回接近顶部、字标刚淡回来（约 30% 不透明度）时就从第一笔重写；
     只有 AX 已经淡没（y > 600）才重新上膛，避免在清晰可见时把字擦掉重写。 */
  function initAxWriting() {
    const badge = $('#badge');
    if (!badge) return;
    const strokes = $$('.ax-stroke', badge);
    if (!strokes.length) return;

    strokes.forEach(path => {
      let len = 800;
      try { len = Math.ceil(path.getTotalLength()) + 2; } catch (_) { /* 退回保守估算值 */ }
      path.style.setProperty('--len', len + 'px');
    });

    /* 清空笔画但不播动画：只在 AX 已经淡到看不见的时候调用（y>600）。
       为什么要单独有这一步：直接靠 rewrite() 在回滚中途擦掉，
       人就会先看见一个「完整的、半透明的 AX」淡进来，到触发点又被擦掉——
       看上去像字标先闪了一下再消失。提前在看不见的时候清空，
       回滚过程中就只会有空字标在淡入，到触发点直接开始起笔。 */
    const blank = () => {
      badge.classList.remove('is-writing');
      badge.classList.remove('is-replay');
      void badge.offsetWidth;
      badge.classList.add('is-blank');
    };

    // replay=true 时挂 is-replay：第一笔不等 0.5s 开场停顿，触发点立刻起笔
    const rewrite = (replay) => {
      badge.classList.remove('is-writing');
      badge.classList.remove('is-blank');
      badge.classList.toggle('is-replay', !!replay);
      void badge.offsetWidth;         // 强制重排：不加这一下，动画不会从 from 重新开始
      badge.classList.add('is-writing');
    };

    // 首次书写由开场序列在「开场后 1s」触发（hero-intro-done）：那时日月已经落定显形，
    // 笔画叠在实心月亮上，不会跟着日月一起渐显；标题组比它晚一拍（云与日月都落定才浮入）。
    // 兜底：开场序列万一没跑（data-intro 被外部清掉、脚本顺序异常），6s 后照常起笔，
    // 不能让字标永久空白 —— 宁可晚一点，不能没有。
    let started = false;
    const startFirst = () => { if (started) return; started = true; rewrite(true); };
    if (window.__cbHero && window.__cbHero.axDone) startFirst();
    else window.addEventListener('hero-intro-done', startFirst, { once: true });
    setTimeout(startFirst, 6000);

    /* 淡出后再回来：边沿触发，来回多次都会重播。
       上下两个阈值分工不同：
       - y>600 时 AX 已淡没（p≈0.83，opacity 归零）→ 这时才把旧笔画清空、重新上膛；
       - y<400 时字标才淡回到约 30% 不透明度 → 就从这个半透明的位置开始起笔，
         不再等到贴到顶部才写（那时字已基本全亮，起笔会先把字擦掉，很突兀）。 */
    const REPLAY_AT = 400;   // y < 400 开始起笔（字标约 31% 不透明度）
    const ARM_AT    = 600;   // y > 600 AX 已淡没，清空笔画并上膛
    let armed = false;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > ARM_AT) {
        if (!armed) { armed = true; blank(); }
      } else if (y < REPLAY_AT && armed) {
        armed = false;
        rewrite(true);
        /* 标题组不在这里跟着重播：它有自己的条件（已经完全淡出 + 回到 200 以内，
           见 initParallax 末尾）。把它绑到 AX 的 400 上，就会出现
           「只滚到七成、回滚时字还半亮着却又播一遍浮入」——两套亮度打架。 */
      }
    }, { passive: true });
  }

  /* ---------- 开场序列：纯黑夜 → 云浮入（日月同时从最上方落下）→ 标题组浮入 ----------
     只跑一次，不随滚动重播：云与日月属于「世界建立」，重播会让人觉得整页在重启；
     每次回到顶部要重放的招牌动作是标题组浮入 + AX 描边（见 initAxWriting 的滚动分支）。
     时间点必须与 css 里的过渡时长对齐（data-intro 各级的 transition），改时长两边一起改。 */
  function initHeroIntro() {
    const html = document.documentElement;
    // 正常路径：head 内联脚本已经接管开场，这里不能再推一遍 data-intro
    if (window.__cbHero && window.__cbHero.inline) return;
    // 没有开场标记（例如外部环境直接渲染终态）就不推进，避免把页面卡在黑场
    if (!document.getElementById('badge') || html.dataset.intro !== '1') return;
    window.__cbHero = { inline: false, axDone: false, introDone: false };

    const at = (ms, fn) => setTimeout(fn, ms);

    const begin = () => {
      // ① 140ms：云海从左右下角浮入（CSS 1.05s / 1.25s），日月在**同一刻**从视口上方落下，
      //    1.5s、先快后慢、同时从半透明渐显到实心，图层全程不变。两者并行，不排队。
      at(140, () => { html.dataset.intro = '2'; });

      // ② 1140ms（开场后正好 1s）：松开 AX 的按住并起笔。此时日月刚显形（opacity 过渡 1s 收尾），
      //    笔画叠在实心月亮上不会跟着一起淡。标题那批还按着，等云与日月都落定再浮入。
      at(1140, () => {
        html.classList.remove('is-ax-hold');
        window.__cbHero.axDone = true;
        window.dispatchEvent(new Event('hero-intro-done'));
      });

      // ③ 1560ms：云落定（最慢那片 140 + 1250 = 1390ms），日月差 80ms 到位 —— 这一刻撤按住、
      //    标题组依次浮入，视觉上就是月亮落定的同时文字起来。
      at(1560, () => {
        delete html.dataset.intro;              // 回到默认终态：与第 2 级的值相同，不会跳变
        html.classList.remove('is-booting');
        // 搜索栏单独挂一次性类：它属于「世界建立」这一拍，回顶只重播文字与 AX
        html.classList.add('is-dock-rise');
        playHeroRise();
        window.__cbHero.introDone = true;
        window.dispatchEvent(new Event('hero-intro-final'));
      });
    };

    /* 后台标签兜底：document.hidden 时浏览器把 CSS 动画冻在 currentTime=0，
       开场用的 animation-fill-mode: both 会把标题 / 云海 / 日月永远按在 from 帧（不可见）。
       所以不可见时直接给终态（.no-intro），等页面第一次可见再从第 1 级重放开场。
       常驻的背景动画（银河 / 星尘 / 云海）不在这里动，标签可见后浏览器会自己续播。 */
    if (document.hidden) {
      html.classList.add('no-intro');
      delete html.dataset.intro;
      html.classList.remove('is-booting', 'is-ax-hold');
      const onVisible = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', onVisible);
        html.classList.remove('no-intro');
        html.dataset.intro = '1';
        html.classList.add('is-booting', 'is-ax-hold');
        begin();
      };
      document.addEventListener('visibilitychange', onVisible);
      return;
    }

    begin();
  }

  /* 搜索栏的初始落点：与标题组末尾对齐。
     标题组自己用 padding-bottom（= 搜索栏高 + 6px）把搜索栏原来的位置空着，
     所以搜索栏 top 就是「标题组内容底 + 6px」。
     这段只能在 js 里算：搜索栏挂在 .scene 之外（要钉在屏顶、不被文章区盖住），
     拿不到 .scene 上的 --searchH / --capBottom，也就没法在 CSS 里跟 caption 共用同一串表达式。

     这里**直接量真盒子**，不再按 --capBottom 公式推：手机端标题组里多了一行社交按钮
     （.hero__socials），公式推就漏掉它，搜索栏会压在按钮上；量 rect 则自动跟着内容长高。 */
  /* 搜索栏首屏落点（px，相对视口顶）。layoutSearchDock() 量出来写在这里，
     同时仍写一份 --dockTop 给 css 兜底（js 还没跑起来时靠它定位）。
     手机轻量档的 paint 直接读这个数值算 transform，不必每帧回读 style。 */
  let dockTopPx = 0;

  function layoutSearchDock() {
    const dock = $('#searchDock');
    const scene = $('#scene');
    const cap = $('.hero__caption');
    if (!dock || !scene || !cap) return;

    const searchH = parseFloat(getComputedStyle(scene).getPropertyValue('--searchH')) || 44;
    // caption 在滚动中被 translateY(calc(var(--p) * -80px)) 抬起。中途 resize 时
    // 量到的是抬高后的位置，会把落点算高；把 80px·p 补回来才是首屏（p=0）的真实位置。
    const p = parseFloat(getComputedStyle(scene).getPropertyValue('--p')) || 0;
    const padBottom = parseFloat(getComputedStyle(cap).paddingBottom) || 0;
    const contentBottom = cap.getBoundingClientRect().bottom + p * 80 - padBottom;
    // 落点比内容底再低 6px 起、并整体下沉半个搜索栏高（用户要它比文字再低半格）
    const top = contentBottom + 6 + searchH * .5;
    dockTopPx = top;
    dock.style.setProperty('--dockTop', top.toFixed(1) + 'px');
  }

  /* 标题组浮入：摘类 → 强制重排 → 加类，animation 才会从头播。
     首次由开场序列调用；之后「已经完全淡出、又回到顶部区」时由 initParallax 里的监听调用。
     搜索栏不在这批里 —— 它挂在一次性的 is-dock-rise（见 initHeroIntro 1560ms）。

     这里只做两件事：解锁冻结、把 --heroFade 写成**当前位置对应的绝对值**。
     不再把透明度「拨回 1」—— css 的 heroFadeIn 从 0 插值到 `var(--heroFade)`，
     终值就是这个绝对值，所以「对面那一帧该多淡」的答案始终由同一条公式给出。 */
  function playHeroRise() {
    const html = document.documentElement;
    const scene = $('#scene');
    heroFaded = false;
    const fade = Math.max(0, 1 - Math.min(1, window.scrollY / SCENE_RANGE));
    heroFadeLast = fade;
    if (scene) scene.style.setProperty('--heroFade', fade.toFixed(3));
    html.classList.remove('is-hero-rise');
    void html.offsetWidth;
    html.classList.add('is-hero-rise');
  }

  /* 日月滚走时的落点：让月亮圆心在 p=1 时正好被银河斜带穿过。
     以前这里是写死的 90px 下移 —— 但月亮尺寸按视口宽取（min(50vw, 74vh)，300~680），
     top 又跟着 vh 走，而斜带是按自身框的百分比定位的，两边比例完全不同：
     宽屏下月亮又大又低，凑巧接近带心；窄屏下月亮小、位置高，就偏出去一截。
     所以改成按几何反算：斜带中心线（自身框 50% / 58%、rotate(-19deg)）在月亮圆心的
     横坐标处求 y，再和圆心做差，就是需要下移的量。
     `.badge` 在 p=1 时还有 scale(.93)，translate 发生在这个缩放空间里，
     因此下移量要除以这个系数才落得准。 */
  function layoutBadgeDrop() {
    const scene = $('#scene');
    const galaxy = $('.galaxy');
    const badge = $('#badge');
    if (!scene || !galaxy || !badge) return;

    // 相对 .scene 的布局坐标：offset* 反映布局、不含 transform（旋转后的包围盒会失真）
    const rel = el => {
      let x = 0, y = 0, node = el;
      while (node && node !== scene) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
      return { x, y };
    };

    const g = rel(galaxy);
    // 五层渐变的主轴都压在 50% / 58% 附近，取这一条当带心
    const gx = g.x + galaxy.offsetWidth * .5;
    const gy = g.y + galaxy.offsetHeight * .58;
    // CSS 里的 rotate(-19deg)（galaxyDrift 会在 -19~-16 之间摆，落点按起始角算）
    const ang = -19 * Math.PI / 180;
    const dx = Math.cos(ang), dy = Math.sin(ang);

    // 月亮圆心**不能用 offsetLeft**：.badge 靠 `left:50% + translate(-50%)` 居中，
    // offsetLeft 是「中心」而不是左边缘（第一版就是这么错的，算出 247px）。
    // 用 rect 求真实框心：.badge 在 fixed 的 .scene 里，不随滚动跑，p=0 时也没缩放。
    const sr = scene.getBoundingClientRect();
    const br = badge.getBoundingClientRect();
    const bx = br.left + br.width * .5 - sr.left;
    const by = br.top + br.height * .5 - sr.top;
    // 过 (gx,gy)、方向 (dx,dy) 的直线，在 x=bx 处的 y
    const targetY = gy + ((bx - gx) / dx) * dy;

    const SCALE_END = .93;   // 1 - .07：p=1 时 .badge 的缩放
    const drop = (targetY - by) / SCALE_END;
    scene.style.setProperty('--badgeDrop', drop.toFixed(1) + 'px');
  }

  /* ---------- 初始化 ---------- */
  buildStars();
  buildGalaxyStars();
  initAxWriting();
  initHeroIntro();
  layoutSearchDock();
  layoutBadgeDrop();
  // 视口变了，标题组的 clamp 底边跟着变，搜索栏的落点与日月落点也要重量
  window.addEventListener('resize', () => { layoutSearchDock(); layoutBadgeDrop(); }, { passive: true });
  applyTheme(store.get('theme', 'night'));
  applyLang(pickLang(), false);
  // 先包卡片槽位、生成右半时间线，再让 initPosts 按最终布局落位（否则它量到的是旧结构）
  // 必须等 DOMContentLoaded：阅读器会在这一拍为新增文章补卡片，blog.js 排在它后面监听，
  // 等它先把卡片补齐，再统一分包槽位，新增的几条才能和原卡片进同一套分页。
  function bootSplitAndPosts() {
    posts = $$('.post');   // 阅读器可能刚补进新卡，重新取一次，别沿用脚本执行时的旧 NodeList
    initSplit();
    initPosts();
    initEvents();
    initParallax();
    runPostDeeplink();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForAllPostsThenBoot, { once: true });
  } else {
    waitForAllPostsThenBoot();
  }
  // 阅读器会在 DOMContentLoaded 之后再补几条新文章卡片，等它们到齐再分包槽位，
  // 否则晚到的卡永远拿不到分页角色，底部卡片堆也会少一层。
  function waitForAllPostsThenBoot() {
    // 不用写死的篇数兜底：拿不到数据就交给下面的 5s 超时，硬编码只会过期（曾经写过 || 8）
    const target = Object.keys(window.AX_POSTS || {}).length || 0;
    let booted = false;
    const started = Date.now();
    const tick = () => {
      if (booted) return;
      const n = document.querySelectorAll('.post').length;
      if (n >= target || Date.now() - started > 5000) {
        booted = true;
        bootSplitAndPosts();
        return;
      }
      setTimeout(tick, 30);
    };
    tick();
  }
})();
