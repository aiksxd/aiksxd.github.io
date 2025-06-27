window.onload = () => {
    if (window.parent.localStorage.language && window.parent.localStorage.language !== app_Info['app_Language'] && typeof update_Page_Language === 'function') {
        config['language'] = window.parent.localStorage.language;
        update_Page_Language(config['language']);
    }
}
let support_Languages = ['en', 'zh'];
let language_Text = {
    'placeholder-homePage': [
        {
            "en": "Search for apps or content...",
            "zh": "搜索应用或内容..."
        },
    ],
    'homePage': [
        {
            'en': "Apps",
            'zh': "应用",
        },
        {
            'en': "All",
            'zh': "全部",
        },
        {
            'en': "Starred",
            'zh': "收藏",
        },
        {
            'en': "News",
            'zh': "新闻",
        },
        {
            'en': "New dog meme creater launched",
            'zh': "新的狗头生成器发布",
        },
        {
            'en': "Click me to learn more...",
            'zh': "点击了解更多...",
        },
        {
            'en': "Run in app list and open in sidebar. You can import your own img to create new meme.",
            'zh': "在应用列表中运行并在侧边栏打开。您可以导入自己的图片来创建新的表情包。",
        },
        {
            'en': "Add New App",
            'zh': "添加新应用",
        },
    ],
    'settingPage': [
        {
            "en": "Main",
            "zh": "主设置",
        },
        {
            "en": "App manager",
            "zh": "应用管理",
        },
        {
            "en": "Change Theme",
            "zh": "切换主题",
        },
        {
            "en": "Light",
            "zh": "白天",
        },
        {
            "en": "Night",
            "zh": "夜间",
        },
        {
            "en": "Enable Local Storage",
            "zh": "启用本地缓存",
        },
        {
            "en": "unavailable in inPrivate window",
            "zh": "在隐私窗口中不可用",
        },
        {
            "en": "Clean Local Storage!",
            "zh": "清除本地缓存！",
        },
        {
            "en": "App Mode",
            "zh": "应用模式",
        },
        {
            "en": "unavailable as files:// (at least e.g. http://127.0.0.1)",
            "zh": "以文件形式读取不可用files:// (至少为本地服务器http://127.0.0.1)",
        },
        {
            "en": "Enable Clone Page",
            "zh": "启用克隆页面",
        },
        {
            "en": "Language:",
            "zh": "语言:",
        }
    ],
}
let res_Strings = {
    'sys': [
        {
            "en": " is running",
            "zh": "正在运行",
        },
    ],
    'tags': [
        {
            "en": "SRS",
        },
        {
            "en": "AI",
        },
        {
            "en": "WebRTC",
        },
        {
            "en": "mdbook",
        },
    ],
    'tag-messages': [
        {
            "en": "A midea stream server",
            "zh": "一个流媒体服务器"
        },
        {
            "en": "Crafted by AI",
            "zh": "由AI制作"
        },
        {
            "en": "Browser Real-Time Communication Technology",
            "zh": "浏览器实时通讯技术"
        },
        {
            "en": "You will open a online page",
            "zh": "您将打开一个在线页面"
        },
        {
            "en": "open blog project",
            "zh": "开源博客项目"
        },
    ],
    'apps': {
        'name': [
            {
                "en": "Blog",
                "zh": "博客",
            },
            {
                "en": "PeerLive",
                "zh": "点对点直播",
            },
            {
                "en": "FiveOnline",
                "zh": "在线五子棋"
            },
            {
                "en": "DogHead Generator",
                "zh": "狗头生成器"
            },
            {
                "en": "Info",
                "zh": "关于",
            },
            {
                "en": "Exam",
                "zh": "考试",
            },
            {
                "en": "ppt",
                "zh": "幻灯片",
            },
            {
                "en": "demo",
                "zh": "演示",
            },
        ],
        'description': [
            {
                "en": "my blog in here",
                "zh": "我的博客在这里",
            },
            {
                "en": "easy contact",
                "zh": "轻松联系",
            },
            {
                "en": "online game",
                "zh": "在线游戏",
            },
            {
                "en": "create your memes",
                "zh": "制作你的表情包",
            },
            {
                "en": "about us",
                "zh": "关于我们",
            },
            {
                "en": "support importing exams",
                "zh": "可导入题库",
            },
            {
                "en": "ppt API showcase",
                "zh": "幻灯片API展示",
            },
            {
                "en": "test",
                "zh": "测试",
            },
        ],
        'keywords': [
            ["live", "contact", "stream"],
            ["game", "online", "five in a row"],
            ["meme", "dog", "generator", "doggy"],
            ["info", "about"],
            ["exam", "test"],
            ["ppt", "slide", "presentation"],
            ["demo", "test"]
        ],
    }
};

function change_Language(lan, part) {
    if (!support_Languages.includes(lan)) {
        lan = 'en'; // Default to English if unsupported language
    }
    let i = 0;
    document.querySelectorAll('.lan').forEach(dom => {
        // console.log(i);
        dom.textContent = language_Text[part][i][lan];
        i++;
    });
}

function translate_Attribute(lan, attribute, part) {
    if (!support_Languages.includes(lan)) {
        lan = 'en'; // Default to English if unsupported language
    }
    let i = 0;
    document.querySelectorAll('input['+attribute+']').forEach(dom => {
        dom.setAttribute(attribute, language_Text[part][i][lan]);
        i++;
    });
}

function addAppLanguageResource(appName, appDescription, appKeywords) {
    res_Strings.apps.name.push(appName);
    res_Strings.apps.description.push(appDescription);
    res_Strings.apps.keywords.push(appKeywords);
}

function translate_App_List(lan, fn, index) {
    switch (fn) {
        case 'all':
            let i = 0;
            document.querySelectorAll('.app-lan').forEach(dom => {
                // console.log(i);
                dom.textContent = res_Strings['apps']['name'][i][lan];
                i++;
            });
            i = 0;
            document.querySelectorAll('.app-description').forEach(dom => {
                // console.log(i);
                dom.textContent = res_Strings['apps']['description'][i][lan];
                i++;
            });
            break;
        case 'new': // new one added(TODO)
            const appCards = document.querySelectorAll('.app-grid > label');
            if (appCards.length > index) {
                const newCard = appCards[index];
                const appName = newCard.querySelector('.app-lan');
                const appDesc = newCard.querySelector('.app-description');
                
                appName.textContent = res_Strings.apps.name[index][lan];
                appDesc.textContent = res_Strings.apps.description[index][lan];
            }
            break;
    
        default:
            break;
    }
}