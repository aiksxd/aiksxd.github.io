/**
 * theme.js — 主题控制器
 *
 * 设计令牌在 css/theme.css 中按 [data-theme="dark" | "light"] 分组定义，
 * 本文件只负责决定使用哪一组令牌，并把选择持久化、同步给所有 iframe。
 * 不再逐条 setProperty 覆写 CSS 变量——避免 JS 与 CSS 两处定义打架。
 *
 * 对外接口：
 *   change_Page_Theme(index)  兼容旧签名，'0'/'dark' 深色，'1'/'light' 浅色
 *   apply_Theme(theme)        直接按主题名应用
 *   toggle_Theme()            深浅互换，返回切换后的主题名
 *   get_Theme_Index()         返回当前主题下标字符串
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'theme';
    var DEFAULT_THEME = 'dark';
    var THEMES = ['dark', 'light'];   // 顺序需与 settingPage 下拉的 value 一致

    /** 取得可用的 localStorage：iframe 场景读父窗口，保证全站一致 */
    function get_Store() {
        try {
            if (window.parent && window.parent.localStorage) {
                return window.parent.localStorage;
            }
        } catch (e) { /* 跨域时静默降级 */ }
        try {
            return window.localStorage;
        } catch (e) {
            return null;
        }
    }

    /** 把 '0' / '1' / 'dark' / 'light' 归一化成主题名 */
    function normalize_Theme(value) {
        if (value === 'light' || value === '1' || value === 1) return 'light';
        if (value === 'dark' || value === '0' || value === 0) return 'dark';
        return null;
    }

    function read_Stored_Theme() {
        var store = get_Store();
        if (!store) return null;
        try {
            return normalize_Theme(store.getItem(STORAGE_KEY));
        } catch (e) {
            return null;
        }
    }

    /** 应用主题：写根元素属性 + 同步 config + 持久化 */
    function apply_Theme(theme) {
        var name = normalize_Theme(theme) || DEFAULT_THEME;

        document.documentElement.setAttribute('data-theme', name);

        if (typeof config === 'object' && config !== null) {
            config['theme_Index'] = String(THEMES.indexOf(name));
        }

        var store = get_Store();
        if (store) {
            try {
                store.setItem(STORAGE_KEY, name);
            } catch (e) { /* 隐私模式下写入失败，忽略 */ }
        }
        return name;
    }

    function change_Page_Theme(index) {
        return apply_Theme(index);
    }

    function toggle_Theme() {
        var current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
        return apply_Theme(current === 'dark' ? 'light' : 'dark');
    }

    function get_Theme_Index() {
        var current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
        return String(THEMES.indexOf(current));
    }

    window.change_Page_Theme = change_Page_Theme;
    window.apply_Theme = apply_Theme;
    window.toggle_Theme = toggle_Theme;
    window.get_Theme_Index = get_Theme_Index;

    // 跨窗口主题同步：同源的其他窗口（外壳 / 子 iframe）修改 localStorage.theme 后自动跟随。
    // storage 事件只在「非发起方」窗口上触发，因此不会引发递归回写。
    window.addEventListener('storage', function (e) {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        var name = normalize_Theme(e.newValue);
        if (!name) return;
        var current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
        if (name !== current) {
            document.documentElement.setAttribute('data-theme', name);
        }
    });

    // 初始化：优先沿用已保存的选择，否则落到默认深色
    apply_Theme(read_Stored_Theme());
})();
