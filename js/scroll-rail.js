/* 自绘覆盖式滚动条
   原生条在 base.css 里被彻底隐藏（宽 0、无轨道），这里画一枚浮在视口右缘的胶囊滑块：
   - 首页滚 document，阅读态滚 .post.is-full，共用同一条轨道，切换时自动换宿主；
   - 没有轨道底色，滑块直接压在场景 / 卡片上，所以不会再出现「纯色槽」和「条被槽裁掉」；
   - 常驻显示（内容不够长时淡出），hover / 拖动提亮到 accent；
   - 拖动、点击轨道跳转、滚轮在轨道上照常滚页，键盘 / 触摸不受影响。
   依赖：base.css 的 .scroll-rail 样式；body 右侧 10px 内边距（内容宽度不变）。 */
(function () {
  'use strict';

  /* 只在「精确指针 + 可 hover」的设备接管；手机 / 平板保留系统自己的覆盖式滚动条 */
  if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;

  var rail = document.createElement('div');
  rail.className = 'scroll-rail';
  rail.setAttribute('aria-hidden', 'true');
  var thumb = document.createElement('div');
  thumb.className = 'scroll-rail__thumb';
  rail.appendChild(thumb);
  document.body.appendChild(rail);

  var MINGAP = 28;          /* 滑块最短长度 */
  var raf = 0;
  var dragging = false;
  var watched = null;

  /* 当前该跟谁走：阅读态优先跟随卡片，其余跟文档 */
  function fullCard() {
    var list = document.querySelectorAll('.post.is-full');
    for (var i = list.length - 1; i >= 0; i--) {
      /* 飞行 / 收起途中卡片还是槽位尺寸，此时不该拿它当滚动宿主 */
      if (list[i].getBoundingClientRect().width >= window.innerWidth - 2) return list[i];
    }
    return null;
  }

  function target() {
    if (document.body.classList.contains('is-full')) {
      var post = fullCard();
      if (post) {
        return { el: post, top: post.scrollTop, view: post.clientHeight, total: post.scrollHeight };
      }
      return null;                    /* 锁着、又还没通铺：这一段没有可滚的东西 */
    }
    var de = document.documentElement;
    return { el: null, top: window.scrollY || de.scrollTop, view: de.clientHeight, total: de.scrollHeight };
  }

  function paint() {
    raf = 0;
    var t = target();
    if (!t) { rail.classList.add('is-idle'); return; }


    /* 卡片正文注入时高度会变，盯住真正长高的那一层 */
    if (ro) {
      var box = null;
      if (t.el) box = t.el.querySelector('.post__body') || t.el;
      if (box !== watched) {
        if (watched) ro.unobserve(watched);
        if (box) ro.observe(box);
        watched = box;
      }
    }

    var railH = rail.clientHeight || window.innerHeight;
    if (!t.total || t.total <= t.view + 1) {
      rail.classList.add('is-idle');
      return;
    }
    rail.classList.remove('is-idle');

    var th = Math.max(MINGAP, Math.round(t.view / t.total * railH));
    var maxTop = t.total - t.view;
    var top = Math.min(maxTop, Math.max(0, t.top));
    var y = Math.round(top / maxTop * (railH - th));
    thumb.style.height = th + 'px';
    thumb.style.transform = 'translateY(' + y + 'px)';
  }

  function queue() { if (!raf) raf = requestAnimationFrame(paint); }

  /* 指针在轨道上的位置 → 滚动比例（滑块中心对齐指针） */
  function ratioAt(clientY) {
    var railH = rail.clientHeight || window.innerHeight;
    var th = thumb.offsetHeight || MINGAP;
    var y = Math.min(railH - th, Math.max(0, clientY - th / 2));
    return y / Math.max(1, railH - th);
  }

  function applyRatio(r) {
    var t = target();
    if (!t) return;
    var maxTop = t.total - t.view;
    if (maxTop <= 0) return;
    var top = Math.round(r * maxTop);
    if (t.el) t.el.scrollTop = top;
    else window.scrollTo(0, top);
    queue();
  }

  rail.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;          /* 触摸留给页面原生滑动 */
    var t = target();
    if (!t || t.total <= t.view + 1) return;
    dragging = true;
    rail.classList.add('is-dragging');
    try { rail.setPointerCapture(e.pointerId); } catch (err) {}
    applyRatio(ratioAt(e.clientY));
    e.preventDefault();
  });

  rail.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    applyRatio(ratioAt(e.clientY));
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove('is-dragging');
    try { rail.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  /* 轨道盖住了右侧 10px：滚轮要转发给真正的滚动容器 */
  rail.addEventListener('wheel', function (e) {
    var t = target();
    if (!t || t.total <= t.view + 1) return;
    var d = e.deltaY;
    if (t.el) t.el.scrollTop += d;
    else window.scrollBy(0, d);
    e.preventDefault();
    queue();
  }, { passive: false });

  document.addEventListener('scroll', queue, true);   /* 捕获：文档与卡片一起管 */
  window.addEventListener('resize', queue, { passive: true });

  var ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(queue);
    ro.observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);

  /* is-full / 正文注入会换宿主，类名一变就重算 */
  new MutationObserver(queue).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });

  queue();
})();