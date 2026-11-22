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

  /* 正文数据不再在首屏同步就绪：posts.data.js / books.data.js / highlight.min.js 已移出
     defer 链，由下面的 loadReaderAssets() 在第一次打开文章时按需插入。所以这里只留一个
     取值函数，不能像以前那样在 IIFE 入口把 window.AX_POSTS 缓存成常量（那时它一定是空的）。
     两套命名空间并列：AX_POSTS 是文章（md2html 产出、按篇拆分），
     AX_BOOKS 是书（book.mjs 产出、正文内联，因为一共就几本）。 */
  const dataOf = id => (window.AX_POSTS || {})[id] || (window.AX_BOOKS || {})[id] || null;
  /* 与 blog.js、css/mobile-lite.css 里逐字相同的「手机轻量档」判定。
     手机上阅读页是正文独占一栏，左侧目录改成左侧滑入的抽屉 + 遮罩，
     所以进来时目录应当是收起的 —— 否则第一屏就被抽屉盖住。
     做成函数而不是一次性常量：桌面↔手机跨断点 resize 时要按当前档位重设目录形态。 */
  const isLite = () => matchMedia('(pointer: coarse) and (max-width: 900px), (max-width: 600px)').matches;
  /* 吸顶标题行高 + 余量，跳转时把这截空出来。
     标题行高度减半（单行标题 + 日期，见 index.css 的 .post.is-full .post__head）后
     从 104 降到 56 —— 这个数和 CSS 里的 scroll-margin-top 是同一件事，改一处要改两处。 */
  const HEAD_OFFSET = 56;
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- 按需加载正文数据 / 代码高亮 ----------
     三级加载：索引（每篇的元数据，几 KB）→ 目标篇的 html（一篇一个文件）→ hljs。
     为什么按篇拆：整站一份 posts.data.js 是 112KB，点开第 1 篇就把 7 篇全下完；
     拆开后首开只下 ~10KB，剩下的等真被点开才拉。
     索引地址取自 CB_ASSETS.posts（?v= 由 tools/build.mjs 按内容写）；
     单篇文件名是固定的、内容会变，没法在 HTML 里挂静态版本号，
     所以它的戳写在索引条目里（entry.v，md2html.mjs 按 html 内容算），这里只负责拼。 */
  const ASSETS = window.CB_ASSETS || {};
  const POSTS_BASE = ASSETS.postsBase || 'js/posts/';
  let indexPromise = null;
  const postPromises = new Map();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (!src) { reject(new Error('reader asset url missing')); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  function loadIndex() {
    if (window.AX_POSTS && Object.keys(window.AX_POSTS).length) return Promise.resolve();
    if (!indexPromise) indexPromise = loadScript(ASSETS.posts);
    return indexPromise;
  }

  /* 书籍索引 48 KB（正文都内联在里面），而打开一篇文章根本用不到它，
     所以不并进 loadIndex()：只在 loadPost 找不到 id 时补拉一次。
     代价是点开书会多一趟，换来的是每篇文章阅读都省掉 48 KB。 */
  let booksPromise = null;
  function loadBooks() {
    if (window.AX_BOOKS || !ASSETS.books) return Promise.resolve();
    if (!booksPromise) booksPromise = loadScript(ASSETS.books);
    return booksPromise;
  }

  function loadPost(id) {
    const entry = dataOf(id);
    if (entry && entry.html !== undefined) return Promise.resolve();
    if (!entry) {
      /* 文章单篇的产物一定在索引里，查不到基本只意味着「这是书，书索引还没到」。
         补拉一次再查；还是没有就当真没有，把错抛给调用方。 */
      if (!postPromises.has(id)) {
        postPromises.set(id, loadBooks().then(() => {
          if (!dataOf(id)) throw new Error('unknown post id: ' + id);
        }));
      }
      return postPromises.get(id);
    }
    if (postPromises.has(id)) return postPromises.get(id);
    const url = POSTS_BASE + encodeURIComponent(id) + '.js'
      + (entry.v ? '?v=' + entry.v : '');
    const p = loadScript(url).then(() => {
      // 加载完还是没有 html：产物坏了。抛出去让调用方按「无正文」处理，别静默留白
      const e = dataOf(id);
      if (!e || e.html === undefined) throw new Error('post html missing: ' + id);
    });
    postPromises.set(id, p);
    return p;
  }

  /* id 可省：只要索引的场合（预取）不传。blog.js 打开卡片时一定会传。 */
  function loadReaderAssets(id) {
    return Promise.allSettled([
      loadIndex().then(() => (id ? loadPost(id) : undefined)),
      window.hljs ? Promise.resolve() : loadScript(ASSETS.hljs)
    ]);
  }
  /* blog.js 在 openFullscreen 开头就会调它（提前 500ms 起飞），深链也会预取。 */
  window.CBloadReaderAssets = loadReaderAssets;

  /* 语言开关由 blog.js 的 applyLang 写在 html[data-lang] 上。
     这里每次注入都现读、不缓存：切语言要整块换正文，缓存只会拿到旧值。 */
  const isEn = () => (document.documentElement.dataset.lang || 'zh') === 'en';

  /* ---------- 代码块装饰：语言徽标 + 复制按钮 ----------
     为什么不用 pre[data-lang] 的 ::after 画标签：伪元素是 pre 的一部分，
     pre 横向溢出时标签会跟着代码一起滚出可视区（长命令行尤其明显）。
     这里把工具条放到 .md-code-wrap（pre 的外层，position:relative）里，
     绝对定位在右上角，滚动的是 pre，工具条不动。
     复制按钮读的是 <code> 的 textContent：highlight 只是把文本拆成 span，
     textContent 拼回去和原文一致，不会混进行号或工具条自己的文字。 */
  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* 老浏览器直接算失败 */ }
      ta.remove();
      return ok;
    };
    /* file:// 打开时不是安全上下文，navigator.clipboard 不存在：退回 execCommand */
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, fallback);
    }
    return Promise.resolve(fallback());
  }

  function syncCopyLabel(btn, en) {
    const label = en ? 'Copy code' : '复制代码';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  function decorateCodeBlocks(root) {
    root.querySelectorAll('pre.md-code').forEach(pre => {
      if (pre.parentElement && pre.parentElement.classList.contains('md-code-wrap')) return;

      const wrap = document.createElement('div');
      wrap.className = 'md-code-wrap';
      pre.replaceWith(wrap);
      wrap.appendChild(pre);

      const bar = document.createElement('div');
      bar.className = 'md-code__bar';
      const lang = (pre.getAttribute('data-lang') || '').trim();
      if (lang) {
        const tag = document.createElement('span');
        tag.className = 'md-code__lang';
        tag.textContent = lang;      // 用 textContent，data-lang 里即便有古怪字符也只会被显示出来
        bar.appendChild(tag);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'md-code__copy';
      btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-copy"/></svg>';
      bar.appendChild(btn);
      wrap.appendChild(bar);
      syncCopyLabel(btn, isEn());

      let timer = 0;
      /* 热区是整颗胶囊（父容器），不只是右边那颗图标：点语言名也复制。
         按钮仍然保留（键盘 Tab / Enter / Space 走的是它，事件照样冒泡到 bar），
         所以这里只挂一个监听，不会重复触发。 */
      bar.addEventListener('click', () => {
        const code = pre.querySelector('code');
        copyText(code ? code.textContent : pre.textContent).then(ok => {
          const en = isEn();
          const use = btn.querySelector('use');
          clearTimeout(timer);
          btn.classList.toggle('is-copied', ok);
          if (use) use.setAttribute('href', ok ? '#i-check' : '#i-copy');
          // 成功/失败都给一条 1.4s 的即时反馈，不弹 toast（阅读页里 toast 太重）
          const tip = ok ? (en ? 'Copied' : '已复制') : (en ? 'Copy failed' : '复制失败');
          btn.title = tip;
          btn.setAttribute('aria-label', tip);
          timer = setTimeout(() => {
            btn.classList.remove('is-copied');
            if (use) use.setAttribute('href', '#i-copy');
            syncCopyLabel(btn, isEn());
          }, 1400);
        });
      });
    });
  }

  /* 高亮 + 装饰总是成对出现：注入正文的地方只调这一个，避免某处忘了装饰
     导致代码块没有复制按钮（书页首节、切语言后的重注入都是这种入口）。 */
  function paintCode(root) {
    highlightCodeBlocks(root);
    decorateCodeBlocks(root);
  }

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

      /* 有 id 才是链接；书籍目录里「这一章没有导言页」的组名只有标签，没有可跳的目标 */
      const link = document.createElement(n.id ? 'a' : 'span');
      link.className = 'toc__link' + (n.id ? '' : ' is-label');
      if (n.id) {
        link.href = `#${n.id}`;
        link.dataset.id = n.id;
      }
      link.textContent = n.text;
      row.appendChild(link);

      li.appendChild(row);
      if (n.children.length) li.appendChild(renderTree(n.children, level + 1, document.createElement('ul'), base.concat(i + 1)));
      list.appendChild(li);
    });
    return list;
  }

  /* ---------- 阅读页顶部的「目录头」（参考图里的红块） ----------
     图标 + 标题 + 元信息装进同一个按钮：按钮范围包含标题，读者才明白
     「点这一栏的标题 = 开合目录」。原先左端只有一颗 30×30 的图标方块、
     还带描边，看起来像「折叠箭头」，既不告诉人点哪里，也没说明点的是目录。
     它同时顶替了标题栏里的标题/日期 —— 阅读态的导航带只剩最右端那颗退出按钮。 */
  function buildTocHead(post, tocId, en) {
    const heading = $('.post__heading', post);
    const titleEl = heading && $('h3', heading);
    const metaEl = heading && $('.post__meta', heading);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'post__tochead';
    btn.setAttribute('aria-controls', tocId);
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', en ? 'Toggle contents' : '展开或折叠目录');

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-list');
    icon.appendChild(use);
    btn.appendChild(icon);

    const txt = document.createElement('span');
    txt.className = 'post__tochead-txt';
    const title = document.createElement('span');
    title.className = 'post__tochead-title';
    title.textContent = titleEl && titleEl.textContent.trim()
      ? titleEl.textContent.trim()
      : (en ? 'Contents' : '目录');
    txt.appendChild(title);
    /* 元信息整块搬过来（保留 data-zh/data-en，切换语言时语言脚本会一起改）。
       外层用 span 而不是 p：button 里只能放 phrasing content，p 会让 HTML 结构失效；
       类名也换掉，原来的 .post__meta 是「可以折行的一行 flex」，塞进 208px 的
       目录头里会撑成两行，把 44px 的带顶开 */
    if (metaEl) {
      const meta = document.createElement('span');
      meta.className = 'post__tochead-meta';
      meta.innerHTML = metaEl.innerHTML;
      txt.appendChild(meta);
    }
    btn.appendChild(txt);
    return btn;
  }

  /* ---------- 注入 ---------- */
  function ensureReader(post) {
    if (post.dataset.readerReady === '1') return;

    const data = dataOf(post.id);
    const body = $('.post__body', post);
    if (!data || !body) return;
    /* 拆包之后正文是「一篇一个文件」，索引里只有元数据，html 要单独拉。
       正常路径（openFullscreen → CBloadReaderAssets(id) → post:open）已经等过了，
       这里兜的是另外两条：切语言重建、以及任何提前触发的边角情况。
       拉失败就静默返回 —— 卡片本身还有摘要，不至于整块空白。 */
    if (!data.html) {
      loadPost(post.id).then(() => ensureReader(post), () => {});
      return;
    }

    /* 书：书籍扫描器已经把目录结构与顺序算好（AX_BOOKS[id].toc），
       走流式那一套 —— 侧栏用它，正文按节追加。判定靠 toc 而不是 id 前缀，
       以后再加一本别的书不用动这里。 */
    if (data.toc && data.slug) { ensureBookReader(post, data, body); return; }

    /* 英文模式下优先用英文版（编译期由 post-N.en.md 合并进来的 htmlEn），
       没配英文版的篇目退回中文 —— 这就是「双语只是可选字段」的退化路径。 */
    const en = isEn() && !!data.htmlEn;
    const missTip = en ? 'Image failed to load' : '图片没能加载（外链）';

    // 正文
    const doc = document.createElement('div');
    doc.className = 'reader__doc md';
    doc.innerHTML = en ? data.htmlEn : data.html;
    paintCode(doc);

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
    /* 侧栏里这一行只有手机档看得见（桌面档被导航带里的 .post__tochead 顶替，
       见下面）；按钮排在「目录」标题之前，和导航带那颗图标上下对齐 */
    head.innerHTML = '<button type="button" class="toc__close" data-zh-aria="收起目录" data-en-aria="Close contents" aria-label="收起目录">' +
      '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>' +
      `<span class="toc__title">${en ? 'Contents' : '目录'}</span>`;
    toc.appendChild(head);

    const nav = document.createElement('nav');
    nav.className = 'toc__nav';
    nav.setAttribute('aria-label', en ? 'Table of contents' : '文章目录');
    if (marks.length) nav.appendChild(renderTree(toTree(marks), 1, document.createElement('ul')));
    else nav.innerHTML = `<p class="toc__empty">${en ? 'No section headings in this post' : '这篇没有分节标题'}</p>`;
    toc.appendChild(nav);

    /* 目录头（参考图的红块）：插进导航带最左一格，整块可点就是开合目录的入口。
       手机档抽屉通高盖住这条带时，侧栏头部仍留一颗 .toc__close 当收起按钮
       （见 .toc__head / 手机档媒体查询）。两处都走同一个 setTocOpen。 */
    const headEl = $('.post__head', post);
    if (headEl) headEl.insertBefore(buildTocHead(post, toc.id, en), headEl.firstChild);

    body.appendChild(toc);
    body.appendChild(doc);
    /* 手机抽屉的遮罩：与目录同一档位（只在手机档 CSS 里 display:block），
       点击即收起。放在 body 里而不是 post 根上，是为了和目录一起被
       langchange 的重建逻辑清掉，切语言不会留下第二层遮罩。 */
    const scrim = document.createElement('div');
    scrim.className = 'toc__scrim';
    scrim.setAttribute('aria-hidden', 'true');
    body.appendChild(scrim);
    post.classList.add('has-reader');
    post.dataset.readerReady = '1';

    wireToc(post, doc, toc);
  }

  /* ---------- 书：一篇可流式加载的长文 ----------
     书籍扫描器（tools/book.mjs）已经把顺序和层级算好了（AX_BOOKS[id].toc），
     阅读页不再去正文里猜标题 —— 直接拿这份清单建侧栏，正文按节往后追加。
     首节内联在 books.data.js 里（点开即有内容），其余按需 <script> 注入：
     file:// 下 fetch 被 CORS 挡死，所以和文章一样走脚本而不是 fetch 片段。
     一本 315 节的书，打开时只多下这一节；滚到接近底部才加载下一节。 */
  const BP_BASE = ASSETS.bookPages || 'js/bookpages/';

  function loadBookPage(slug, entry) {
    const key = slug + '/' + entry.id;
    const got = (window.AX_BP || {})[key];
    if (got) return Promise.resolve(got);
    const url = BP_BASE + encodeURIComponent(slug) + '/' + encodeURIComponent(entry.id) + '.js'
      + (entry.v ? '?v=' + entry.v : '');
    return loadScript(url).then(() => (window.AX_BP || {})[key]);
  }

  function ensureBookReader(post, data, body) {
    const en = isEn();
    const tid = `toc-${post.id}`;

    const doc = document.createElement('div');
    doc.className = 'reader__doc md';

    /* 首节：books.data.js 里的 html 已经是「<h2 id=…> + 正文」 */
    const first = document.createElement('section');
    first.className = 'md-sec';
    first.innerHTML = data.html;
    doc.appendChild(first);

    /* 侧栏：marks 直接来自扫描器的 toc（level 就是嵌套深度，不用再算） */
    const toc = document.createElement('aside');
    toc.className = 'reader__toc';
    toc.id = tid;
    const head = document.createElement('div');
    head.className = 'toc__head';
    head.innerHTML = '<button type="button" class="toc__close" data-zh-aria="收起目录" data-en-aria="Close contents" aria-label="收起目录">'
      + '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>'
      + `<span class="toc__title">${en ? 'Contents' : '目录'}</span>`;
    toc.appendChild(head);

    const nav = document.createElement('nav');
    nav.className = 'toc__nav';
    nav.setAttribute('aria-label', en ? 'Table of contents' : '全书目录');
    nav.appendChild(renderTree(
      toTree(data.toc.map(t => ({ level: t.level, id: t.id, text: t.title }))),
      1, document.createElement('ul')));
    toc.appendChild(nav);

    // 目录头（红块）：与文章页同款，整块可点
    const headEl = $('.post__head', post);
    if (headEl) headEl.insertBefore(buildTocHead(post, tid, en), headEl.firstChild);

    body.appendChild(toc);
    body.appendChild(doc);
    const scrim = document.createElement('div');
    scrim.className = 'toc__scrim';
    scrim.setAttribute('aria-hidden', 'true');
    body.appendChild(scrim);

    /* 首节 + 后面流式追加的节都要过高亮/装饰这一道；
       首节在这里补一次（追加的节在 insertAt 里各自处理） */
    paintCode(doc);

    post.classList.add('has-reader');
    post.dataset.readerReady = '1';

    /* 已加载的节：toc 下标 → section。不用「单指针往前推」——
       目录可以直接跳到第 250 节，指针一跳跃，中间那些节就永远补不上，
       滚动时会撞见一段空白。改成集合：缺哪节、滚到哪儿就补哪节。 */
    const loaded = new Map();
    const inflight = new Map();
    const firstIdx = Math.max(0, data.toc.findIndex(t => t.id === data.first));
    loaded.set(firstIdx, first);

    const insertAt = (idx, entry, page) => {
      const sec = document.createElement('section');
      sec.className = 'md-sec';
      const h2 = document.createElement('h2');
      h2.id = entry.id;
      h2.textContent = page.title || entry.title;
      sec.appendChild(h2);
      const holder = document.createElement('div');
      holder.innerHTML = page.html;
      sec.appendChild(holder);
      /* 插到「下一个已加载的节」之前，没有就接到末尾 ——
         跳读过的书，DOM 顺序也必须还是书的顺序。 */
      let anchor = null;
      for (let i = idx + 1; i < data.toc.length; i++) {
        const s = loaded.get(i);
        if (s) { anchor = s; break; }
      }
      const beforeH = doc.offsetHeight;
      if (anchor) doc.insertBefore(sec, anchor); else doc.appendChild(sec);
      loaded.set(idx, sec);
      paintCode(sec);
      /* 往上补内容会把正在读的那行推下去，补偿 scrollTop；向下补不需要。 */
      if (anchor) post.scrollTop += doc.offsetHeight - beforeH;
      if (post._tocCtl) post._tocCtl.refresh();
    };

    const loadAt = idx => {
      const entry = data.toc[idx];
      if (!entry || !entry.id || loaded.has(idx)) return Promise.resolve(false);
      if (inflight.has(idx)) return inflight.get(idx);
      const p = loadBookPage(data.slug, entry).then(page => {
        inflight.delete(idx);
        if (!page) return false;
        if (!loaded.has(idx)) insertAt(idx, entry, page);
        return true;
      }, () => { inflight.delete(idx); return false; });
      inflight.set(idx, p);
      return p;
    };

    /* 从 from 起按 dir 找第一个「有正文但还没加载」的节 */
    const firstGap = (from, dir) => {
      for (let i = from; i >= 0 && i < data.toc.length; i += dir) {
        if (data.toc[i].id && !loaded.has(i)) return i;
      }
      return -1;
    };

    wireToc(post, doc, toc, {
      headSelector: '.md-sec > h2',
      /* 目录点了还没加载的节：把到目标为止缺的那些一起取下来，再按顺序插入。
         并发取（浏览器同时开 6 条连接），插入必须串行 —— insertAt 靠
         「后面那个已加载的节」定位，乱序插会把书的顺序打散。 */
      onMiss(id, done) {
        const target = data.toc.findIndex(t => t.id === id);
        if (target < 0) { done(); return; }
        const gaps = [];
        for (let i = 0; i <= target; i++) if (data.toc[i].id && !loaded.has(i)) gaps.push(i);
        if (!gaps.length) { done(); return; }
        const pages = new Map();
        let k = 0;
        const worker = () => {
          if (k >= gaps.length) return Promise.resolve();
          const i = gaps[k++];
          return loadBookPage(data.slug, data.toc[i]).then(pg => {
            if (pg) pages.set(i, pg);
            return worker();
          }, () => worker());
        };
        Promise.all(Array.from({ length: Math.min(6, gaps.length) }, worker)).then(() => {
          for (const i of gaps) {
            const pg = pages.get(i);
            if (pg && !loaded.has(i)) insertAt(i, data.toc[i], pg);
          }
          done();
        });
      },
    });

    /* 滚到顶/底附近就补相邻的节；补完若还贴着边界就继续 ——
       否则一次拖到底只会补一节就停住。双向都补：跳读之后往回滚也能接上。 */
    const pump = () => {
      if (post.dataset.readerReady !== '1') return;
      if (post.scrollTop + post.clientHeight >= post.scrollHeight - 700) {
        const i = firstGap(Math.max(...loaded.keys()) + 1, 1);
        if (i >= 0) loadAt(i).then(ok => { if (ok) pump(); });
      }
      if (post.scrollTop < 700) {
        const i = firstGap(Math.min(...loaded.keys()) - 1, -1);
        if (i >= 0) loadAt(i).then(ok => { if (ok) pump(); });
      }
    };
    if (post.dataset.bookBound !== '1') {
      post.dataset.bookBound = '1';
      post.addEventListener('scroll', pump, { passive: true });
    }
  }

  /* ---------- 目录行为 ---------- */
  /* 只有「展开 / 折叠」两态，宽窄屏统一：侧栏与正文并列（见 reader.css），
     折叠就是把第一列让给正文。以前窄屏是抽屉（is-toc-open），
     抽屉一开就盖住正文、点条目又要自己收起来，和「侧边栏」是两套心智模型。 */
  function setTocOpen(post, open) {
    post.classList.toggle('is-toc-folded', !open);
    const btn = $('.post__tochead', post);
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

  /* ---------- 目录行为 ----------
     opts.headSelector：书页的「标题」是每节的节标题，不是正文里的小标题
     （正文小标题没有对应目录项，混进来会把高亮打回空）。
     opts.onMiss(id, done)：目录里点了还没加载的节 —— 书的正文是流式的，
     这一节可能还没注入，交给调用方补齐，补完再 done() 完成跳转。
     返回 refresh()：正文追加后重扫标题与链接（快照过期就点不动新的节）。 */
  function wireToc(post, doc, toc, opts = {}) {
    const HEAD_SEL = opts.headSelector || 'h1, h2, h3, h4';
    const navEl = $('.toc__nav', toc);

    // 整栏展开 / 折叠：入口是导航带最左端那颗「图标 + 标题」的目录头
    const btn = $('.post__tochead', post);
    if (btn) btn.addEventListener('click', () => setTocOpen(post, post.classList.contains('is-toc-folded')));

    /* 遮罩：只负责收起，不吞掉冒泡之外的东西。桌面档 CSS 里它 display:none，
       绑定了也不会触发 —— 同一套逻辑覆盖两档，不为手机另写一套状态。 */
    const scrim = $('.toc__scrim', post);
    if (scrim) scrim.addEventListener('click', () => setTocOpen(post, false));

    /* 侧栏头部的收起按钮：手机档抽屉通高盖住标题栏按钮时用它。
       桌面档 display:none，绑定无效；两档收起都走同一个 setTocOpen。 */
    const closeBtn = $('.toc__close', toc);
    if (closeBtn) closeBtn.addEventListener('click', () => setTocOpen(post, false));

    const jumpTo = target => {
      // 用卡片自己的滚动容器，不用 scrollIntoView —— 后者会把外层滚动祖先也一起滚
      const top = post.scrollTop + target.getBoundingClientRect().top - post.getBoundingClientRect().top - HEAD_OFFSET;
      scrollToY(post, Math.max(0, top));
      /* 桌面并列：侧栏常驻，跳完不收起；手机抽屉盖着正文，必须收。 */
      if (isLite()) setTocOpen(post, false);
    };

    toc.addEventListener('click', e => {
      const link = e.target.closest('.toc__link');
      if (!link) return;
      const id = link.dataset.id;
      if (!id) return;                      // 组标题（span.is-label）不跳
      e.preventDefault();
      const find = () => doc.querySelector(`#${CSS.escape(id)}`);
      const target = find();
      if (target) { jumpTo(target); return; }
      if (opts.onMiss) opts.onMiss(id, () => { const t = find(); if (t) jumpTo(t); });
    });

    /* 跟随高亮：取「已经在标题行下方滚过去」的最后一个标题。
       每帧只读 rect 不写样式，读操作共享一次布局。 */
    let heads = [];
    let links = new Map();
    let current = '';

    const collect = () => {
      heads = [...doc.querySelectorAll(HEAD_SEL)].filter(h => h.id);
      links = new Map([...toc.querySelectorAll('.toc__link[data-id]')].map(a => [a.dataset.id, a]));
    };
    collect();

    const spy = () => {
      if (!post.classList.contains('is-full')) return;
      const base = post.getBoundingClientRect().top + HEAD_OFFSET + 12;
      let cur = '';
      for (const h of heads) {
        if (!links.has(h.id)) continue;     // 正文小标题 / 未被目录收录的节，不参与高亮
        if (h.getBoundingClientRect().top <= base) cur = h.id;
        else break;
      }
      if (cur === current) return;
      current = cur;
      for (const [id, a] of links) {
        const on = id === cur;
        a.classList.toggle('is-active', on);
        if (on) {
          a.setAttribute('aria-current', 'true');
          /* 书的侧栏有 300+ 条，高亮那一行很可能在栏外 —— 把它带回可视区。
             滚的是栏自己的 scrollTop，不调 scrollIntoView（那会把外层容器也滚起来）。 */
          if (navEl) {
            const r = a.getBoundingClientRect(), nr = navEl.getBoundingClientRect();
            if (r.top < nr.top + 10 || r.bottom > nr.bottom - 10) {
              navEl.scrollTop += r.top - nr.top - nr.height / 3;
            }
          }
        } else a.removeAttribute('aria-current');
      }
    };

    /* scroll 监听只绑一次，永远调「当前那份」spy —— 切语言重建正文会换一套
       doc/links，闭包不能是旧的，所以把控制器挂在 post 上而不是闭包变量。 */
    post._tocCtl = { spy, refresh() { collect(); requestAnimationFrame(spy); } };
    if (post.dataset.tocBound !== '1') {
      post.dataset.tocBound = '1';
      let queued = false;
      post.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (post._tocCtl) post._tocCtl.spy();
        });
      }, { passive: true });
    }

    requestAnimationFrame(spy);
    return { refresh() { post._tocCtl.refresh(); } };
  }

  /* ---------- 与卡片全屏的接线 ----------
     blog.js 在落位那一拍派发 post:open（此时 is-expanding 还没摘，
     内容仍是 opacity:0），所以注入引发的重排会被淡入盖住，看不到跳字。 */
  document.addEventListener('post:open', e => {
    const post = e.detail;
    if (!post) return;
    ensureReader(post);
    post.classList.remove('is-toc-folded', 'is-toc-open');   // 每次进来都是默认状态
    /* 手机：默认收起（抽屉从左侧滑入，不挡正文）；桌面：两栏并列默认展开。
       收起态由 is-toc-folded 一个类统一表达：桌面收第一列、手机收抽屉，
       setTocOpen / scrim / 按钮 aria 全部跟着它走，两档操作逻辑完全相同。 */
    if (isLite()) post.classList.add('is-toc-folded');
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
    /* 书只有中文正文（没有 .en 源），而且已经流式加载了好几节 ——
       重建会把它们全丢掉、滚动位置也落空，所以切语言不动书页。 */
    if (window.AX_BOOKS && window.AX_BOOKS[full.id]) return;
    const keep = full.scrollTop;
    stopScrollAnim();
    // 重建正文时把标题栏那颗目录开关也一起摘掉，否则每切一次语言就多一颗
    full.querySelectorAll('.reader__doc, .reader__toc, .toc__scrim, .post__tochead').forEach(el => el.remove());
    full.classList.remove('has-reader');
    delete full.dataset.readerReady;
    ensureReader(full);
    full.scrollTop = keep;
  });

  /* 跨过断点时按当前档位重置目录形态：桌面两栏并列默认展开；
     手机是左侧抽屉，展开会盖住整篇正文，必须收起。
     isLite() 现算而不是用加载时的常量 —— 窗口从桌面拖窄到手机档也要跟着切。 */
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const full = $('.post.is-full');
      if (!full) return;
      full.classList.toggle('is-toc-folded', isLite());
    }, 120);
  }, { passive: true });
})();
