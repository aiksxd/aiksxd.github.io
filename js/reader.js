/* reader.js —— 文章卡片的阅读页
   ==========================================================
   职责只有四件事：把 md 编译产物接进 .post、按标题层级建左侧目录、
   目录的折叠/跳转/跟随高亮、以及窄屏把目录收成抽屉。

   为什么目录不从 md 里读、而是从渲染后的 DOM 反推：
   md 里不写任何「目录指令」，标题就是唯一事实源 —— 少一个要维护的语法，
   而且编译器只管产出语义化 html，读侧怎么组织导航不被反向耦合。

   为什么注入只做一次：13KB 的 html 每次展开都 parse 一遍，展开动画
   会明显掉帧；.reader 留在 DOM 里，非全屏时 display:none 完全不占位。 */
(() => {
  'use strict';

  const DATA = window.AX_POSTS || {};
  /* 与 blog.js、css/mobile-lite.css 里逐字相同的「手机轻量档」判定。
     这里只用到一件事：手机上阅读页是正文独占一栏，左侧目录改成可唤出的覆盖层，
     所以进来时目录应当是收起的 —— 否则第一屏就被目录占掉 36%。 */
  const LITE = matchMedia('(pointer: coarse) and (max-width: 900px), (max-width: 600px)').matches;
  /* 吸顶标题行高 + 余量，跳转时把这截空出来。
     标题行高度减半（单行标题 + 日期，见 index.css 的 .post.is-full .post__head）后
     从 104 降到 56 —— 这个数和 CSS 里的 scroll-margin-top 是同一件事，改一处要改两处。 */
  const HEAD_OFFSET = 56;
  const $ = (sel, root = document) => root.querySelector(sel);
  /* 语言开关由 blog.js 的 applyLang 写在 html[data-lang] 上。
     这里每次注入都现读、不缓存：切语言要整块换正文，缓存只会拿到旧值。 */
  const isEn = () => (document.documentElement.dataset.lang || 'zh') === 'en';

  /* ---------- 代码高亮 ----------
     vendor/highlight.min.js 是本地文件、defer 加载，file:// 下也能用，不依赖 CDN。
     为什么在这里手动高亮而不是 hljs.highlightAll()：
     正文是**编译期**产出的片段，展开时才注入 DOM —— highlightAll 只在页面加载时扫一遍，
     扫到的是空壳。注入点就在下面这一处，所以「谁注入谁负责高亮」最省事，也不用挂 MutationObserver。
     语言标签取自编译器写在 <pre> 上的 data-lang；
     没写标签的块走 highlightAuto，但 shell 文本被认错时宁可退回纯文本，所以只认「大致像代码」的结果。 */
  const LANG_ALIAS = { sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', cmd: 'dos', bat: 'dos', ps1: 'powershell', js: 'javascript', ts: 'typescript', py: 'python', yml: 'yaml', md: 'markdown' };
  function highlightCodeBlocks(root) {
    const hljs = window.hljs;
    if (!hljs) return;
    root.querySelectorAll('pre.md-code > code').forEach(code => {
      const pre = code.parentElement;
      const raw = (pre.getAttribute('data-lang') || '').toLowerCase();
      const lang = LANG_ALIAS[raw] || raw;
      try {
        if (lang && hljs.getLanguage(lang)) {
          code.innerHTML = hljs.highlight(code.textContent, { language: lang, ignoreIllegals: true }).value;
        } else {
          const auto = hljs.highlightAuto(code.textContent);
          if (auto.relevance >= 6) code.innerHTML = auto.value;   // 认不准就别上色，免得把中文说明染成关键字
        }
      } catch (_) { /* 高亮只是装饰，失败就当纯文本 */ }
    });
  }

  /* ---------- 标题清单 → 层级树 ----------
     md 的标题深度靠 # 的数量表达，但目录的嵌套要看「相对深度」：
     ### 接在 ## 后面才是子ども，接在 # 后面就该平级。用栈按 level 弹，
     不必写死 h2→一级、h3→二级，以后正文改成 h1 开头也不会错。 */
  function toTree(marks) {
    const root = { level: -1, children: [] };
    const stack = [root];
    for (const m of marks) {
      while (stack.length > 1 && stack[stack.length - 1].level >= m.level) stack.pop();
      const node = { ...m, children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root.children;
  }

  /* 编号由「层级路径」拼：1. / 1.1. / 1.1.1. —— 用 index 拼而不是读 h 标签名，
     所以正文改成 h1 开头也只是「第 1 级」的含义变了，编号照旧成立。
     侧栏是设置页式的常驻栏，不再给折叠箭头：条目本身不多（post-7 才 14 条），
     行首那块空白正好留给编号，读者能直接对着「第几节」定位。 */
  function renderTree(nodes, level, list, prefix) {
    const base = prefix || [];
    list.classList.add('toc__list');
    nodes.forEach((n, i) => {
      const no = base.concat(i + 1).join('.');
      const li = document.createElement('li');
      li.className = 'toc__item';
      li.dataset.level = String(level);

      const row = document.createElement('div');
      row.className = 'toc__row';

      const num = document.createElement('span');
      num.className = 'toc__num';
      num.textContent = no + '.';
      num.setAttribute('aria-hidden', 'true');   // 屏幕阅读器念标题就够，编号只是视觉锚点
      row.appendChild(num);

      const link = document.createElement('a');
      link.className = 'toc__link';
      link.href = `#${n.id}`;
      link.textContent = n.text;
      link.dataset.id = n.id;
      row.appendChild(link);

      li.appendChild(row);
      if (n.children.length) li.appendChild(renderTree(n.children, level + 1, document.createElement('ul'), base.concat(i + 1)));
      list.appendChild(li);
    });
    return list;
  }

  /* ---------- 注入 ---------- */
  function ensureReader(post) {
    if (post.dataset.readerReady === '1') return;

    const data = DATA[post.id];
    const body = $('.post__body', post);
    if (!data || !data.html || !body) return;

    /* 英文模式下优先用英文版（编译期由 post-N.en.md 合并进来的 htmlEn），
       没配英文版的篇目退回中文 —— 这就是「双语只是可选字段」的退化路径。 */
    const en = isEn() && !!data.htmlEn;
    const missTip = en ? 'Image failed to load' : '图片没能加载（外链）';

    // 正文
    const doc = document.createElement('div');
    doc.className = 'reader__doc md';
    doc.innerHTML = en ? data.htmlEn : data.html;
    highlightCodeBlocks(doc);

    /* 外链图片挂了就把那张图收成一条提示（样式见 reader.css 的 is-missing / md-img-missing）。
       注入时元素是新建的，src 此刻才开始请求，所以 error 事件一定还接得住；
       另外补一次 complete 判定，避免缓存里已经失败过的图漏掉。
       图有两种形态：独占行被编译器升成 <figure>（收成虚线块），行内图片没有外层容器，
       只能换成一个 <span> 占位 —— 直接在 <img> 上写样式是画不出文字的。 */
    doc.querySelectorAll('img').forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim();
      const markMissing = () => {
        const fig = img.closest('figure');
        if (fig) {
          fig.classList.add('is-missing');
          fig.dataset.missing = missTip;    // 样式里是 attr(data-missing)，文案才跟着语言走
          return;
        }
        const ph = document.createElement('span');
        ph.className = 'md-img-missing';
        ph.textContent = alt ? `${missTip}${en ? ': ' : '：'}${alt}` : missTip;
        img.replaceWith(ph);
      };
      if (img.complete && img.naturalWidth === 0) markMissing();
      else img.addEventListener('error', markMissing, { once: true });
    });

    // 标签：列表卡片里那份 .post__tags 在全屏时被隐藏（摘要让位给正文），
    // 这里复制一份挂到正文末尾，样式直接复用 .post__tags
    const tags = $('.post__tags', post);
    if (tags) {
      const clone = tags.cloneNode(true);
      clone.classList.add('reader__tags');
      doc.appendChild(clone);
    }

    // 目录
    const marks = [...doc.querySelectorAll('h1, h2, h3, h4')].map(h => ({
      level: Number(h.tagName.slice(1)),
      id: h.id,
      text: h.textContent.trim(),
    }));

    const toc = document.createElement('aside');
    toc.className = 'reader__toc';
    toc.id = `toc-${post.id}`;

    const head = document.createElement('div');
    head.className = 'toc__head';
    /* 侧栏自己的「收起」按钮已经去掉：唯一入口是全屏标题栏左端那颗
       .post__toc（见下面），两处都能收起会让人以为侧栏有两条独立状态。 */
    head.innerHTML = `<span class="toc__title">${en ? 'Contents' : '目录'}</span>`;
    toc.appendChild(head);

    const nav = document.createElement('nav');
    nav.className = 'toc__nav';
    nav.setAttribute('aria-label', en ? 'Table of contents' : '文章目录');
    if (marks.length) nav.appendChild(renderTree(toTree(marks), 1, document.createElement('ul')));
    else nav.innerHTML = `<p class="toc__empty">${en ? 'No section headings in this post' : '这篇没有分节标题'}</p>`;
    toc.appendChild(nav);

    // 目录开关：钉在全屏标题栏最左端，是整个阅读页唯一的展开/折叠入口
    const tocBtn = document.createElement('button');
    tocBtn.type = 'button';
    tocBtn.className = 'post__toc';
    tocBtn.setAttribute('aria-controls', toc.id);
    tocBtn.setAttribute('aria-expanded', 'true');
    tocBtn.setAttribute('aria-label', en ? 'Toggle contents' : '展开或折叠目录');
    tocBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>';
    const headEl = $('.post__head', post);
    if (headEl) headEl.insertBefore(tocBtn, headEl.firstChild);

    body.appendChild(toc);
    body.appendChild(doc);
    post.classList.add('has-reader');
    post.dataset.readerReady = '1';

    wireToc(post, doc, toc);
  }

  /* ---------- 目录行为 ---------- */
  /* 只有「展开 / 折叠」两态，宽窄屏统一：侧栏与正文并列（见 reader.css），
     折叠就是把第一列让给正文。以前窄屏是抽屉（is-toc-open），
     抽屉一开就盖住正文、点条目又要自己收起来，和「侧边栏」是两套心智模型。 */
  function setTocOpen(post, open) {
    post.classList.toggle('is-toc-folded', !open);
    const btn = $('.post__toc', post);
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

  /* ---------- 目录跳转的插值滚动 ----------
     不用 scrollTo({behavior:'smooth'})：原生平滑的时长由浏览器按距离自定（1375px 实测
     要 1.5s 才停），中途也没法让用户打断 —— 想停只能整体关掉 scroll-behavior。
     自己插值就把两件事都握住：时长按距离给、easeOutCubic 快起慢收；
     用户一动滚轮/手指就立刻停，不然插值和手指会抢同一个 scrollTop。 */
  let scrollRaf = 0;
  let detachCancel = null;

  function stopScrollAnim() {
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
    if (detachCancel) { detachCancel(); detachCancel = null; }
  }

  function scrollToY(container, targetY) {
    stopScrollAnim();
    const start = container.scrollTop;
    const dist = targetY - start;
    if (Math.abs(dist) < 2) return;                     // 已经在目标上，别放一帧空转
    // 距离越远时间越长，两头都夹住：太短看不出是插值，太长像卡住
    const dur = Math.min(680, Math.max(280, Math.abs(dist) * .42));
    const t0 = performance.now();
    const evs = ['wheel', 'touchstart', 'pointerdown'];
    const cancel = () => stopScrollAnim();
    evs.forEach(ev => container.addEventListener(ev, cancel, { passive: true }));

    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);                 // easeOutCubic
      container.scrollTop = start + dist * e;
      if (t < 1) { scrollRaf = requestAnimationFrame(step); return; }
      scrollRaf = 0;
      stopScrollAnim();                                 // 收尾把打断监听一起摘掉
    };
    scrollRaf = requestAnimationFrame(step);
    detachCancel = () => evs.forEach(ev => container.removeEventListener(ev, cancel));
  }

  function wireToc(post, doc, toc) {
    // 整栏展开 / 折叠：按钮在标题栏最左端
    const btn = $('.post__toc', post);
    if (btn) btn.addEventListener('click', () => setTocOpen(post, post.classList.contains('is-toc-folded')));

    toc.addEventListener('click', e => {
      // 跳转：用卡片自己的滚动容器，不用 scrollIntoView —— 后者会把外层
      // 滚动祖先也一起滚（body 已经被锁住了，但保险起见不给它机会）
      const link = e.target.closest('.toc__link');
      if (!link) return;
      e.preventDefault();
      const id = link.dataset.id;
      const target = doc.querySelector(`#${CSS.escape(id)}`);
      if (!target) return;
      const top = post.scrollTop + target.getBoundingClientRect().top - post.getBoundingClientRect().top - HEAD_OFFSET;
      scrollToY(post, Math.max(0, top));
      // 侧栏是常驻并列的，跳转后不再收起 —— 收起等于把刚点的那一条藏起来
    });

    /* 跟随高亮：取「已经在标题行下方滚过去」的最后一个标题。
       每帧只读 rect 不写样式，读操作共享一次布局，标题数量也就十几个。 */
    const heads = [...doc.querySelectorAll('h1, h2, h3, h4')];
    const links = new Map([...toc.querySelectorAll('.toc__link')].map(a => [a.dataset.id, a]));
    let current = '';
    let queued = false;

    const spy = () => {
      queued = false;
      if (!post.classList.contains('is-full')) return;
      const base = post.getBoundingClientRect().top + HEAD_OFFSET + 12;
      let cur = '';
      for (const h of heads) {
        if (h.getBoundingClientRect().top <= base) cur = h.id;
        else break;
      }
      if (cur === current) return;
      current = cur;
      for (const [id, a] of links) {
        const on = id === cur;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    };

    post.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(spy);
    }, { passive: true });

    // 展开后第一次高亮：正文顶部可能第一屏就有 h2
    requestAnimationFrame(spy);
  }

  /* ---------- 与卡片全屏的接线 ----------
     blog.js 在落位那一拍派发 post:open（此时 is-expanding 还没摘，
     内容仍是 opacity:0），所以注入引发的重排会被淡入盖住，看不到跳字。 */
  document.addEventListener('post:open', e => {
    const post = e.detail;
    if (!post) return;
    ensureReader(post);
    post.classList.remove('is-toc-folded', 'is-toc-open');   // 每次进来都是默认状态
    /* 手机：默认收起。桌面两栏并列、目录占 208px 是导航栏；
       390px 屏上那一栏只剩 129px、正文被压到 217px，正文一行只放得下六七个字，
       表格里的 token 还会直接顶出右边界。收起后正文吃满，内容要目录就点标题栏那颗按钮，
       目录会以覆盖层滑出（见 mobile-lite.css ⑦），盖住正文而不是把它挤窄。 */
    if (LITE) post.classList.add('is-toc-folded');
  });

  document.addEventListener('post:close', e => {
    const post = e.detail;
    if (!post) return;
    // 收起后把折叠态也复位：下次进来是「目录展开」的默认状态。
    // 这一步必须在列表态下做 —— .post:not(.is-full) .reader__toc 已经 display:none，
    // 所以侧栏不会先冒出来再消失
    post.classList.remove('is-toc-folded');
    stopScrollAnim();     // 插值滚到一半被关掉，不能继续往已经收起的卡片里写 scrollTop
  });

  /* ---------- 切语言：整块重建正文 ----------
     正文是编译期写进 data 的 html 字符串，没法就地换字，只能重建节点。
     重建前存 scrollTop、重建后立刻写回：用户是「读到一半才切语言」的场景，
     弹回开头等于把阅读位置弄丢。目录的折叠形态挂在卡片上（is-toc-folded 一个类），
     这个类不清，重建后目录还是刚才的收展状态。 */
  document.addEventListener('langchange', () => {
    const full = $('.post.is-full');
    if (!full || full.dataset.readerReady !== '1') return;
    const keep = full.scrollTop;
    stopScrollAnim();
    // 重建正文时把标题栏那颗目录开关也一起摘掉，否则每切一次语言就多一颗
    full.querySelectorAll('.reader__doc, .reader__toc, .post__toc').forEach(el => el.remove());
    full.classList.remove('has-reader');
    delete full.dataset.readerReady;
    ensureReader(full);
    full.scrollTop = keep;
  });

  // 跨过断点时重置目录形态：宽窄两套列模板不同（208px / 36%），
  // 折叠态留在 old 断点上会让新断点一进来就是收起的
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const full = $('.post.is-full');
      if (full) full.classList.remove('is-toc-folded');
    }, 120);
  }, { passive: true });
})();
