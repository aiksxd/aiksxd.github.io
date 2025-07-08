window.onload = () => {
    if (window.parent.localStorage.language && window.parent.localStorage.language !== app_Info['app_Language'] && typeof update_Page_Language === 'function') {
        config['language'] = window.parent.localStorage.language;
        update_Page_Language(config['language']);
    }
}

let support_Languages = ['en', 'zh'];
let language_Text = {
    'placeholder-index': [
        {
            "en": "Enter your name...",
            "zh": "输入你的名字..."
        },
        {
            "en": "Enter the room ID...",
            "zh": "输入房间ID..."
        },
    ],
    'index': [
        {
            "en": "Custome",
            "zh": "自定义"
        },
        {
            "en": "Join Room",
            "zh": "加入房间"
        },
        {
            "en": "Room ID",
            "zh": "房间 ID"
        },
        {
            "en": "Join Game",
            "zh": "加入游戏"
        },
        {
            "en": "Online Rooms",
            "zh": "当前在线房间"
        },
        {
            "en": "Refresh",
            "zh": "刷新列表"
        },
        {
            "en": "Create Room",
            "zh": "创建房间"
        },
        {   // 7
            "en": "Card Number Range: [0 -",
            "zh": "卡牌数字范围: [0 -"
        },
        {
            "en": "Game Mode:",
            "zh": "游戏模式:"
        },
        {
            "en": "Asymmetry",
            "zh": "非对称"
        },
        {
            "en": "Asymmetric Deck",
            "zh": "卡组不对称"
        },
        {
            "en": "Symmetry",
            "zh": "对称"
        },
        {
            "en": "Same Deck",
            "zh": "卡组相同"
        },
        {
            "en": "Room Status:",
            "zh": "房间状态:"
        },
        {
            "en": "Waiting to create",
            "zh": "待创建"
        },
        // {
        //     "en": "Room ID:",
        //     "zh": "房间 ID:"
        // },
        {
            "en": "Players:",
            "zh": "玩家数量"
        },
        {
            "en": "Game Mode:",
            "zh": "游戏模式"
        },
        // {
        //     "en": "Not selected",
        //     "zh": "未选择"
        // },
        {
            "en": "Create Room",
            "zh": "创建房间"
        },
        {
            "en": "Room Info",
            "zh": "房间信息"
        },
        {
            "en": "Room ID:",
            "zh": "房间 ID:"
        },
        {
            "en": "Room Status:",
            "zh": "房间状态:"
        },
        {
            "en": "Card Number Range:",
            "zh": "卡牌数字范围:"
        },
        {
            "en": "Players:",
            "zh": "玩家数量:"
        },
        {
            "en": "Game Mode:",
            "zh": "游戏模式:"
        },
        {
            "en": "Exit Room",
            "zh": "退出房间"
        },
    ]
};

let res_Strings = {
    'card': [
        {
            "en": "Without online room, create new one",
            "zh": "暂无在线房间，请创建一个新房间"
        },
        {
            "en": "Asymmetric",
            "zh": "非对称"
        },
        {
            "en": "Symmetric",
            "zh": "对称"
        },
        {
            "en": "Please select a game mode first!",
            "zh": "请先选择游戏模式！"
        },
        {
            "en": "Asymmetric Deck",
            "zh": "卡组不同，胜率相同"
        },
        {
            "en": "Same Deck",
            "zh": "卡组相同"
        },
        {
            "en": "Create Room",
            "zh": "创建房间"
        },
        {   // 7
            "en": "It cann't over",
            "zh": "它不能超过"
        },
        {
            "en": "Join Game",
            "zh": "加入游戏"
        },
        {
            "en": "Please enter a valid room ID!",
            "zh": "请输入有效的房间 ID！"
        },
        {
            "en": "Connection failed!",
            "zh": "连接失败！"
        },
        {
            "en": "Room is full!",
            "zh": "房间已满！"
        },
        {
            "en": "Join successfully!",
            "zh": "加入成功"
        },
        {
            "en": "Joining...",
            "zh": " 加入中..."
        },
        {   // 14
            "en": "ready",
            "zh": "已准备"
        },
        {
            "en": "not-ready",
            "zh": "未准备"
        },
        {
            "en": "Waiting...",
            "zh": "等待玩家..."
        },
        {
            "en": "Ready Status",
            "zh": "准备状态"
        },
        {   // 18
            "en": "Opponent player lost connection",
            "zh": "对方已断线"
        },
        {
            "en": "Exit Room",
            "zh": "退出房间"
        },
        {
            "en": "Waiting",
            "zh": "等待中"
        },
        {
            "en": "Playing",
            "zh": "游戏中"
        },
    ],
};

// Usage example for dynamic language switching:
// Replace all displayed text with:
// res_Strings[index][config['language']]

// For example, replace:
// alert("Error getting local stream:" + err);
// With:
// alert(res_Strings[22][config['language']] + err);

// Replace:
// document.getElementById("status").innerHTML = "Status: Connecting to PeerServer...";
// With:
// document.getElementById("status").innerHTML = res_Strings[5][config['language']];

function change_Language(lan, part) {
    if (!support_Languages.includes(lan)) {
        lan = 'en'; // Default to English if unsupported language
    }
    let i = 0;
    document.querySelectorAll('.lan').forEach(dom => {
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