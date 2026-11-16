/* 作品集（第二部分）的数据源。
   目录在 apps/<id>/index.html，这里只登记「怎么展示」：日期、名称、一句话说明、类型标签、强调色，
   以及图标 —— 老站首页（父目录 homePage.html）里每个 app 的图标是**内联 svg**（少数是 png），
   这里把原始 path 抄过来，`viewBox` 跟着原图走（有 24 / 20 / 16 / 470×490 几套，不能统一缩放），
   渲染时按 --tc 上色（path 用 fill: currentColor）。没有原始图标的退回类型缩写（目前没有这种条目）。
   card2024 是例外：老站那颗是纯 CSS 画的（渐变底 + 两张斜牌 + 四角划痕 + 署名），没有 path 可抄，
   按同一造型重画成 `apps/card2024/icon.svg`，走 `icon` 字段（和 doggy / 井字棋的 png 同一条路）。
   日期是推断值：card2024 名字自带 2024；PeerLive / PeerGame 系列与旧站 PeerLive、PCPE 那几篇同期，
   blog 对齐迁移前最后那篇 post-5（2024-08-25）；doggy / exam / ppt-showcase / info
   是 2025 年那批。拿到准确日期只改这一个文件，时间线会自动重排。
   （2026-11-14：LaTeXInput 条目下线；apps/PeerGame-Shock-Lab 目录此前已删。）
   （2026-11-14：Shock-Lab 下线，条目删除；apps/PeerGame-Shock-Lab 目录此前已删。）
   （2026-11-15：LaTeXInput / PeerGame-Tic-Tac-Toe 两条下线。后者 hub.html 是 0 字节，
     没有 index.html 入口，点开必然 404；apps/ 下两个目录都还在，未删。） */
window.APPS = [
  { id: 'card2024', year: 2024, date: '2024-12-20', name: 'Card-2024', kind: 'GAME', accent: '#8f8cf0',
    desc: '对称 / 非对称牌堆的联机卡牌对战，自带房间列表与建房表单。',
    descEn: 'Online card duels with symmetric or asymmetric decks; room list and create-room form built in.',
    icon: 'apps/card2024/icon.svg' },
  { id: 'PeerLive', year: 2024, date: '2024-11-16', name: 'PeerLive', kind: 'LIVE', accent: '#63d6c6',
    desc: 'P2P 直播站：填房间标题、封面与简介即可开播，观众凭房间号直连。',
    descEn: 'A P2P live site: set a room title, cover and blurb to go live; viewers join directly by room number.',
    svg: { vb: '0 0 24 24', d: [
      'M5 23c-2.2 0-4-1.8-4-4v-8h2v4.5c.6-.3 1.3-.5 2-.5 2.2 0 4 1.8 4 4s-1.8 4-4 4m0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m19 2h-2C22 9.6 14.4 2 5 2V0c10.5 0 19 8.5 19 19m-5 0h-2c0-6.6-5.4-12-12-12V5c7.7 0 14 6.3 14 14m-5 0h-2c0-3.9-3.1-7-7-7v-2c5 0 9 4 9 9'
    ] } },
  { id: 'doggy', year: 2025, date: '2025-11-02', name: '图像合成编辑器', nameEn: 'Image Compositor', kind: 'TOOL', accent: '#a4d67e',
    desc: '上传底图 / 顶层图套模板（狗头、安全出口），拖动缩放后导出 GIF。',
    descEn: 'Upload a base and an overlay, pick a template (dog head, exit sign), drag and scale, then export a GIF.',
    icon: 'apps/doggy/icon.png' },
  { id: 'exam', year: 2025, date: '2025-09-18', name: '智能判断题练习', nameEn: 'True·False Drill', kind: 'TOOL', accent: '#f5c86a',
    desc: '导入本地题库刷判断题，记积分与剩余题数。',
    descEn: 'Import a local question bank and work through true/false items; keeps score and questions left.',
    svg: { vb: '0 0 470 490', d: [
      'M449.25 0H40.85c-11.2 0-20.4 9.2-20.4 20.4v449.2c0 11.2 9.2 20.4 20.4 20.4h408.3c11.2 0 20.4-9.2 20.4-20.4V20.4c.1-11.2-9.1-20.4-20.3-20.4m-20.4 449.2H61.35V40.8h367.5z',
      'M130.75 132.7h228.7c11.2 0 19.4-9.2 19.4-20.4s-9.2-20.4-20.4-20.4h-227.7c-11.2 0-20.4 9.2-20.4 20.4s9.1 20.4 20.4 20.4m0 112.3h228.7c11.2 0 19.4-9.2 19.4-20.4s-9.2-20.4-20.4-20.4h-227.7c-11.2 0-20.4 9.2-20.4 20.4s9.1 20.4 20.4 20.4m229.7 61.3-30.1 30.8-30.1-30.8c-7.1-8.2-20.4-8.2-28.6 0-8.2 7.1-8.2 20.4 0 28.6l30.4 31.1-30.4 31.1c-8.2 8.2-8.2 20.4 0 28.6 4.1 4.1 15.3 11.7 28.6 0l30.1-30.8 30.1 30.8c12.4 11.7 24.5 4.1 28.6 0 8.2-7.1 8.2-20.4 0-28.6l-30.5-31.1 30.4-31.1c8.2-8.2 8.2-20.4 0-28.6-8.1-8.2-20.4-8.2-28.5 0'
    ] } },
  { id: 'ppt-showcase', year: 2025, date: '2025-06-12', name: '公式动画演示', nameEn: 'Formula Animation', kind: 'DEMO', accent: '#c9a6f2',
    desc: '用 MathJax 把递推式逐帧铺开的演示页。',
    descEn: 'A demo page that lays a recurrence out step by step with MathJax.',
    svg: { vb: '0 0 16 16', d: [
      'M2.5 6.5V6H2v.5zm4 0V6H6v.5zm7-3h.5v-.207l-.146-.147zm-3-3 .354-.354L10.707 0H10.5zM2.5 7h1V6h-1zm.5 4V8.5H2V11zm0-2.5v-2H2v2zm.5-.5h-1v1h1zm.5-.5a.5.5 0 0 1-.5.5v1A1.5 1.5 0 0 0 5 7.5zM3.5 7a.5.5 0 0 1 .5.5h1A1.5 1.5 0 0 0 3.5 6zm3 0h1V6h-1zm.5 4V8.5H6V11zm0-2.5v-2H6v2zm.5-.5h-1v1h1zm.5-.5a.5.5 0 0 1-.5.5v1A1.5 1.5 0 0 0 9 7.5zM7.5 7a.5.5 0 0 1 .5.5h1A1.5 1.5 0 0 0 7.5 6zM11 6v5h1V6zm-1 1h3V6h-3zM2 5V1.5H1V5zm11-1.5V5h1V3.5zM2.5 1h8V0h-8zm7.646-.146 3 3 .708-.708-3-3zM2 1.5a.5.5 0 0 1 .5-.5V0A1.5 1.5 0 0 0 1 1.5zM1 12v1.5h1V12zm1.5 3h10v-1h-10zM14 13.5V12h-1v1.5zM12.5 15a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM1 13.5A1.5 1.5 0 0 0 2.5 15v-1a.5.5 0 0 1-.5-.5z'
    ] } },
  { id: 'info', year: 2025, date: '2025-05-04', name: 'About us', kind: 'PAGE', accent: '#b9c0d8',
    desc: '旧站的表情包式关于页，留作版面实验的存档。',
    descEn: "The old site's meme-style about page, kept as an archive of a layout experiment.",
    svg: { vb: '0 0 20 20', d: [
      'M10 20C5 20 0 15.523 0 10S5 0 10 0s10 5 10 10-5 10-10 10m0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16m0-10a1 1 0 0 1 1 1v5a1 1 0 0 1-2 0V9a1 1 0 0 1 1-1m0-1a1 1 0 1 1 0-2 1 1 0 0 1 0 2'
    ] } }
];
