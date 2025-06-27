if (window.parent.localStorage.themeIndex !== config['theme_Index']) {
    config['theme_Index'] = window.parent.localStorage.themeIndex;
    change_Page_Theme(config['theme_Index']);
}

function change_Page_Theme (
    index,
    bg,
    card_bg,
    input_bg,
    text,
    title,
    shadow,
    text_shadow,
    border,
    active_color,
    active_alpha1_color,
    active_alpha2_color
) { // post modify & cusome color todo
    // --active-color: rgb(107,194,53);
    // --border: #81c784;
    // --shadow: #a5d6a7;
    // --text: #1b5e20;
    // --bg: #f1f8e9;
    // --active-alpha1-color:rgba(107, 194, 53, 0.1);
    // --active-alpha2-color:rgba(107, 194, 53, 0.2);

    switch (index) {
        case "1":   // night
            bg = 'rgb(28,33,40)';
            card_bg = 'rgb(0, 0, 0, 0.3)';
            input_bg = 'rgb(28,33,40)';
            title = '#2ecc71';
            text = '#b0b0d0';
            shadow = '#a5d6a7';
            text_shadow = 'rgba(46, 204, 113, 0.4)';
            border = 'rgb(46,46,46)';
            active_color = 'rgb(209,215,224)';
            active_alpha1_color = 'rgb(46,46,46)';
            active_alpha2_color = 'rgb(70,175,75)';
            break;
        default:  // default white
            bg = bg || '#f1f8e9';
            card_bg = card_bg || '(255, 255, 255, 0.2)';
            input_bg = input_bg || 'rgba(255, 255, 255, 0.6)';
            text = text || '#1b5e20';
            title = title || '#1b5e20';
            shadow = shadow || '#a5d6a7';
            text_shadow = text_shadow || 'rgba(255, 255, 255, 0.5)';
            border = border || '#81c784';
            active_color = active_color || 'rgb(107,194,53)';
            active_alpha1_color = active_alpha1_color || 'rgba(107, 194, 53, 0.1)';
            active_alpha2_color = active_alpha2_color || 'rgba(107, 194, 53, 0.2)';
            break;
    }
    document.documentElement.style.setProperty('--bg', bg);
    document.documentElement.style.setProperty('--card-bg', card_bg);
    document.documentElement.style.setProperty('--input-bg', input_bg);
    document.documentElement.style.setProperty('--text', text);
    document.documentElement.style.setProperty('--title', title);
    document.documentElement.style.setProperty('--shadow', shadow);
    document.documentElement.style.setProperty('--text-shadow', text_shadow);
    document.documentElement.style.setProperty('--border', border);
    document.documentElement.style.setProperty('--active-color', active_color);
    document.documentElement.style.setProperty('--active-alpha1-color', active_alpha1_color);
    document.documentElement.style.setProperty('--active-alpha2-color', active_alpha2_color);
}