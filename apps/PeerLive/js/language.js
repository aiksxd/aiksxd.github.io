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
            "en": "Room Title",
            "zh": "房间标题"
        },
        {
            "en": "URL of img served as Cover",
            "zh": "填入一个URL地址作为封面"
        },
        {
            "en": "Input your Summary there...",
            "zh": "填入房间描述..."
        },
        {
            "en": "Input the room Id...",
            "zh": "输入房间ID..."
        },
        {
            "en": "Input counterpart's Id",
            "zh": "输入对方的ID"
        },
        {
            "en": "Room Title",
            "zh": "房间标题"
        },
    ],
    'placeholder-audience': [
        {
            "en": "input the server ip...",
            "zh": "输入服务器IP..."
        },
        {
            "en": "input the key...",
            "zh": "输入密钥..."
        },
        {
            "en": "input ID OF AIM here...",
            "zh": "在此输入目标ID..."
        },
        {
            "en": "Input your name here...",
            "zh": "在此输入你的名字..."
        },
        {
            "en": "Input message here...",
            "zh": "在此输入你要发送的消息..."
        },
    ],
    'placeholder-host': [
        {
            "en": "Input your Room Title there...",
            "zh": "在此输入你的房间标题..."
        },
        {
            "en": "URL of img served as Cover",
            "zh": "作为封面的图片URL"
        },
        {
            "en": "Input your Summary there...",
            "zh": "在此输入简介..."
        },
        {
            "en": "input the server ip...",
            "zh": "输入服务器IP..."
        },
        {
            "en": "input the key...",
            "zh": "输入密钥..."
        },
        {
            "en": "input ID OF AIM here...",
            "zh": "填入目标ID..."
        },
        {
            "en": "Input Id of NetWork Span...",
            "zh": "输入网络组ID..."
        },
        {
            "en": "Input your name here...",
            "zh": "在此输入你的名字..."
        },
        {
            "en": "Input message here...",
            "zh": "在此输入消息..."
        },
    ],
    'index': [
        {
            "en": "Live Room Setting",
            "zh": "直播间设置"
        },
        {
            "en": "Peer Setting",
            "zh": "对等网络设置"
        },
        {
            "en": "Room Title",
            "zh": "房间标题"
        },
        {
            "en": "Cover URL",
            "zh": "封面URL"
        },
        {
            "en": "Summary",
            "zh": "简介"
        },
        {
            "en": "Options",
            "zh": "选项"
        },
        {
            "en": "pravite",
            "zh": "不公开"
        },
        {
            "en": "Only others with shared URL or room ID are allowed.",
            "zh": "仅允许通过分享链接或房间ID访问的人加入"
        },
        {
            "en": "Room Type",
            "zh": "房间类型"
        },
        {
            "en": "Live",
            "zh": "直播"
        },
        {
            "en": "FiveOnline(external)",
            "zh": "五子棋(外部)"
        },
        {
            "en": "In addition, \n1. you can upload your local photo after creating Room(Room Setting) \n2. you can blank input to use localStorage(default enable in config.js & clean in index setting)",
            "zh": "此外，\n1. 创建房间后可以上传本地图片(房间设置) \n2. 留空可使用localStorage(默认在config.js中启用并在索引设置中清除)"
        },
        {
            "en": "Create Room",
            "zh": "创建房间"
        },
        {
            "en": "echo Historical Connected Peer NetWork Span",
            "zh": "显示历史连接的对等网络名称"
        },
        {
            "en": "Click me to connect the deafult Peer NetWork Span",
            "zh": "点击连接默认对等网络名称"
        },
        {
            "en": "Auto Reconnect",
            "zh": "自动重连"
        },
        {
            "en": "Reconnect to Peer Server",
            "zh": "重新连接到对等服务器"
        },
        {
            "en": "Network",
            "zh": "网络"
        },
        {
            "en": "Create / Join a peer NetWork Span",
            "zh": "创建/加入一个对等网络名称"
        },
        {
            "en": "Only support ' A-z 0-9 - '",
            "zh": "仅支持'A-z 0-9 -'字符"
        },
        {
            "en": "Confirm\n[Enter]",
            "zh": "确认\n[回车]"
        },
        {
            "en": "Room View",
            "zh": "房间视图"
        },
        {
            "en": "Copy Web Link to share",
            "zh": "复制网页链接分享"
        },
        {
            "en": "Host Node",
            "zh": "主机节点"
        },
        {
            "en": "Refresh",
            "zh": "刷新"
        },
        {
            "en": "auto\nJoin",
            "zh": "自动\n加入"
        },
        {
            "en": "Connecting to PeerServer...",
            "zh": "正在连接到对等服务器..."
        },
        {
            "en": "ID -> Room",
            "zh": "ID -> 房间"
        },
        {
            "en": "GoTo",
            "zh": "前往"
        },
        {
            "en": "Rooms List",
            "zh": "房间列表"
        },
        {
            "en": "Create Room",
            "zh": "创建房间"
        },
        {
            "en": "Display Room Type",
            "zh": "显示房间类型"
        },
        {
            "en": "All",
            "zh": "全部"
        },
        {
            "en": "Live",
            "zh": "直播"
        },
        {
            "en": "FiveOnline(external)",
            "zh": "五子棋(外部)"
        },
        {
            "en": "Change Themes",
            "zh": "切换主题"
        },
        {
            "en": "Light",
            "zh": "白天"
        },
        {
            "en": "Dark",
            "zh": "夜间"
        },
        {
            "en": "Open updated Online Page",
            "zh": "打开更新的在线页面"
        },
        {
            "en": "New netWorkName",
            "zh": "新建网络名称"
        },
        {
            "en": "Join a Peer NetWork Span",
            "zh": "加入一个对等网络名称"
        },
        {
            "en": "Connect",
            "zh": "连接"
        },
        {
            "en": "Status: Connecting to PeerServer...",
            "zh": "状态: 正在连接到对等服务器..."
        },
        // {
        //     "en": "Status: ✔ NetWork Span Ready ✔",
        //     "zh": "状态: ✔ 网络组已就绪 ✔"
        // },
        // {
        //     "en": "Create failed: ID has been occupied, trying to connect...",
        //     "zh": "创建失败: ID已被占用，正在尝试连接..."
        // },
        // {
        //     "en": "Failed: name is invalid!",
        //     "zh": "失败: 名称无效!"
        // },
        // {
        //     "en": "Root node can't connect others",
        //     "zh": "网络组根节点不能连接其他节点"
        // }
    ],
    'audience': [
        {
            "en": "room View",
            "zh": "房间视图"
        },
        {
            "en": "Stream Source Menu",
            "zh": "流源菜单"
        },
        {
            "en": "Peer Setting",
            "zh": "对等网络设置"
        },
        {
            "en": "Conference",
            "zh": "会议"
        },
        {
            "en": "Copy Web Link to share",
            "zh": "复制网页链接分享"
        },
        {
            "en": "Host Node",
            "zh": "主机节点"
        },
        {
            "en": "Refresh",
            "zh": "刷新"
        },
        {
            "en": "auto\nJoin",
            "zh": "自动\n加入"
        },
        {
            "en": "Share PC Desktop",
            "zh": "分享PC桌面"
        },
        {
            "en": "Use Display Stream",
            "zh": "使用显示流"
        },
        {
            "en": "Share Local Devices",
            "zh": "分享本地设备"
        },
        {
            "en": "Upload Local Device",
            "zh": "上传本地设备"
        },
        {
            "en": "Camera",
            "zh": "摄像头"
        },
        {
            "en": "Microphone",
            "zh": "麦克风"
        },
        {
            "en": "Input SRS Media Stream url like \"url/key\"(rtmp -> srs -> webrtc)",
            "zh": "输入SRS媒体流URL如\"url/key\"(rtmp -> srs -> webrtc)"
        },
        {
            "en": "share SRS Media Stream",
            "zh": "分享SRS媒体流"
        },
        {
            "en": "Lend Media Stream From Others",
            "zh": "从他人借用媒体流"
        },
        {
            "en": "input ID OF AIM here...",
            "zh": "在此输入目标ID..."
        },
        {
            "en": "lend aim stream( need be accepted )",
            "zh": "借用目标流(需被接受)"
        },
        {
            "en": "Submit\n[Enter]",
            "zh": "提交\n[回车]"
        },
        {
            "en": "Automatic Reconnection",
            "zh": "自动重连"
        },
        {
            "en": "reconnect with original Id",
            "zh": "用原始ID重新连接"
        },
        {
            "en": "Join Conference",
            "zh": "加入会议"
        },
        {
            "en": "What will you Share Local Devices",
            "zh": "你将分享哪些本地设备"
        },
        {
            "en": "Camera",
            "zh": "摄像头"
        },
        {
            "en": "Microphone",
            "zh": "麦克风"
        },
        {
            "en": "Get Local Video",
            "zh": "获取本地视频"
        },
        {
            "en": "Stop Conference Stream",
            "zh": "停止会议流"
        },
        {
            "en": "Confirm public your Local Devices",
            "zh": "确认公开你的本地设备"
        },
        {
            "en": "Public Stream",
            "zh": "公开流"
        },
        {
            "en": "Refresh",
            "zh": "刷新"
        },
        {
            "en": "Setting",
            "zh": "设置"
        },
        {
            "en": "Your Id",
            "zh": "你的ID"
        },
        {
            "en": "Status: Waiting to Connecting to PeerServer...",
            "zh": "状态: 等待连接到对等服务器..."
        },
        {
            "en": "Status: Connecting to Live Room...",
            "zh": "状态: 正在连接到直播间..."
        },
        {
            "en": "Wake Mobile Input",
            "zh": "唤醒移动端输入"
        },
        {
            "en": "Custome Avatar & Name",
            "zh": "自定义头像和名称"
        },
        {
            "en": "Input your name here...",
            "zh": "在此输入你的名字..."
        },
        {
            "en": "Members",
            "zh": "成员"
        },
        {
            "en": "Auto-clean Msgs[max->100]",
            "zh": "自动清理消息[最大100条]"
        },
        {
            "en": "Clean Msgs",
            "zh": "清理消息"
        },
        {
            "en": "Hide Side",
            "zh": "隐藏侧边栏"
        },
        {
            "en": "Change Themes",
            "zh": "切换主题"
        },
        {
            "en": "Light",
            "zh": "白天"
        },
        {
            "en": "Dark",
            "zh": "夜间"
        },
        {
            "en": "Setting",
            "zh": "设置"
        },
        {
            "en": "Play All",
            "zh": "播放全部"
        },
        {
            "en": "Input message here...",
            "zh": "在此输入消息..."
        },
        {
            "en": "Img",
            "zh": "图片"
        },
        {
            "en": "Send",
            "zh": "发送"
        },
    ],
    'host': [
        {
            "en": "Live Room Setting",
            "zh": "直播间设置"
        },
        {
            "en": "Stream Source Menu",
            "zh": "流源菜单"
        },
        {
            "en": "Room View",
            "zh": "房间视图"
        },
        {
            "en": "Peer Setting",
            "zh": "对等网络设置"
        },
        {
            "en": "Conference",
            "zh": "会议"
        },
        {
            "en": "Upload Local Image",
            "zh": "上传本地图片"
        },
        {
            "en": "Copy Web Link to share",
            "zh": "复制网页链接分享"
        },
        {
            "en": "Modify\n[Enter]",
            "zh": "修改\n[回车]"
        },
        {
            "en": "Stop Conference Stream",
            "zh": "停止会议流"
        },
        {
            "en": "Share PC Desktop",
            "zh": "分享PC桌面"
        },
        {
            "en": "Use Display Stream",
            "zh": "使用显示流"
        },
        {
            "en": "Share Local Devices",
            "zh": "分享本地设备"
        },
        {
            "en": "Upload Local Device",
            "zh": "上传本地设备"
        },
        {
            "en": "Camera",
            "zh": "摄像头"
        },
        {
            "en": "Microphone",
            "zh": "麦克风"
        },
        {
            "en": "Input SRS Media Stream ip and stream key",
            "zh": "输入SRS媒体流服务器ip和串流密钥"
        },
        {
            "en": "share SRS Media Stream",
            "zh": "分享SRS媒体流"
        },
        {
            "en": "Lend Media Stream From Others",
            "zh": "从他人借用媒体流"
        },
        {
            "en": "lend aim stream( need be accepted )",
            "zh": "借用目标流(需被接受)"
        },
        {
            "en": "Options",
            "zh": "选项"
        },
        {
            "en": "If not Display the localStream",
            "zh": "如果不显示本地流"
        },
        {
            "en": "enable for saving performance of devices",
            "zh": "启用以节省设备性能"
        },
        {
            "en": "Copy Web Link to share",
            "zh": "复制网页链接分享"
        },
        {
            "en": "Host Node",
            "zh": "主机节点"
        },
        {
            "en": "Refresh",
            "zh": "刷新"
        },
        {
            "en": "Lock the room\n (disconnect to PeerServer)",
            "zh": "锁定房间\n(断开与对等服务器的连接)"
        },
        {
            "en": "reconnect with original Id",
            "zh": "用原始ID重新连接"
        },
        {
            "en": "change/join NetWork Span",
            "zh": "更改/加入网络组"
        },
        {
            "en": "Connect",
            "zh": "连接"
        },
        {
            "en": "Enable Conference",
            "zh": "启用会议"
        },
        {
            "en": "Join Conference",
            "zh": "加入会议"
        },
        {
            "en": "What will you Share Local Devices",
            "zh": "你将分享哪些本地设备"
        },
        {
            "en": "Camera",
            "zh": "摄像头"
        },
        {
            "en": "Microphone",
            "zh": "麦克风"
        },
        {
            "en": "Get Local Video",
            "zh": "获取本地视频"
        },
        {
            "en": "Stop Conference Stream",
            "zh": "停止会议流"
        },
        {
            "en": "Confirm public your Local Devices",
            "zh": "确认公开你的本地设备"
        },
        {
            "en": "Public Stream",
            "zh": "公开流"
        },
        {
            "en": "Refresh",
            "zh": "刷新"
        },
        {
            "en": "Room Setting",
            "zh": "房间设置"
        },
        {
            "en": "Connecting to PeerServer...",
            "zh": "正在连接到对等服务器..."
        },
        {
            "en": "Status: Waiting to Connecting to PeerServer...",
            "zh": "状态: 等待连接到对等服务器..."
        },
        {
            "en": "Custome Avatar & Name",
            "zh": "自定义头像和名称"
        },
        {
            "en": "Members:",
            "zh": "Members:"
        },
        {
            "en": "Auto-clean Msgs[max->100]",
            "zh": "自动清理消息[最大100条]"
        },
        {
            "en": "Clean Msgs",
            "zh": "清理消息"
        },
        {
            "en": "Hide Side",
            "zh": "隐藏侧边栏"
        },
        {
            "en": "Change Themes",
            "zh": "切换主题"
        },
        {
            "en": "Light",
            "zh": "白天"
        },
        {
            "en": "Dark",
            "zh": "夜间"
        },
        {
            "en": "Setting",
            "zh": "设置"
        },
        {
            "en": "Play All",
            "zh": "播放全部"
        },
        {
            "en": "Img",
            "zh": "图片"
        },
        {
            "en": "Send",
            "zh": "发送"
        },
    ]
};

let res_Strings = {
    'universal': [
        {
            "en": "Members:",
            "zh": "Members:"
        },
        {
            "en": ") ask for your media stream",
            "zh": ") 请求获得你的流媒体"
        },
    ],
    'index': [
        {
            "en": "Connecting to PeerServer...",
            "zh": "正在连接到对等服务器..."
        },
        {
            "en": "Your ID:\n",
            "zh": "你的ID:\n"
        },
        {
            "en": "Status: ✔ Root Node Ready ✔",
            "zh": "状态: ✔ 网络组根节点已创建 ✔"
        },
        {
            "en": "Create failed: ID has been occupied, trying to connect...",
            "zh": "创建失败: ID被占用, 尝试转为连接中..."
        },
        {
            "en": "Failed: name is invalid!",
            "zh": "失败: 无效的名称!"
        },
        {
            "en": "initial ERRORl!",
            "zh": "初始化错误!"
        },
        {
            "en": "Root node can't connect others",
            "zh": "网络组根节点不能连接其他节点"
        },
        {
            "en": "Status: Connecting to Root Node...",
            "zh": "状态: 正在连接至网络组根节点..."
        },
        {
            "en": "No NetWork Span Joined: Please tick 'pravite' or join a Peer NetWork Span at first!",
            "zh": "无网络组：请先加入一个网络组!"
        },
    ],
    'host': [
        {
            "en": "Status: Connecting to NetWork Span...",
            "zh": "状态: 正在连接到网络组..."
        },
        {
            "en": "Status: ✔ Root Node here now(private) ✔",
            "zh": "状态: ✔ 网络组在此(私有) ✔"
        },
    ],
    'fn': [
        {
            "en": "System",
            "zh": "系统",
        },
        {
            "en": "Connected successfully",
            "zh":  "连接成功"
        },
        {
            "en": "Status: awaitng parent_Node node autoReConnect to room( You can also ReConnect by yourself)!",
            "zh": "状态: 等待父节点重连至房间( 你也可以自己重连 )!",
        },
        // {
        //     "en": "Connecting to PeerServer...",
        //     "zh": "正在连接到对等服务器..."
        // },
        // {
        //     "en": "Status: ✔ Connected to Live Room Successfully! ✔",
        //     "zh": "状态: ✔ 成功连接到直播间! ✔"
        // },
        // {
        //     "en": "Status: Connecting to Live Room...",
        //     "zh": "状态: 正在连接到直播间..."
        // },
        // {
        //     "en": "Status: ✔ Root Node here now(private) ✔",
        //     "zh": "状态: ✔ 网络组在此(私有) ✔"
        // },
        // {
        //     "en": "Status: ✔ NetWork Span Ready ✔",
        //     "zh": "状态: ✔ 网络组已就绪 ✔"
        // },
        // {
        //     "en": "Connected successfully",
        //     "zh": "连接成功"
        // },
        {
            "en": "host is not on live",
            "zh": "主播不在直播中"
        },
        {
            "en": "Status: ✘ Room Connection Closed. Please Refresh the Connection! ✘",
            "zh": "状态: ✘ 房间连接已关闭，请刷新连接! ✘"
        },
        {
            "en": "Status: Reconnecting to room...",
            "zh": "状态: 正在重新连接到房间..."
        },
        {   // 6
            "en": "unknown type of room:",
            "zh": "未知房间类型:"
        },
        {
            "en": "Status: Connecting...",
            "zh": "状态: 正在连接..."
        },
        {
            "en": "Status: ✔ Connected to root node of NetWork Span successfully! ✔",
            "zh": "状态: ✔ 成功连接到网络组根节点! ✔"
        },
        {
            "en": "Status: ✘ Root Connection Closed!(Reconnect in Setting) ✘",
            "zh": "状态: ✘ 根连接已关闭!(在设置中重新连接) ✘"
        },
        {
            "en": "Connecting...(Too long time, try others?)",
            "zh": "连接中...(时间过长，尝试其他节点?)"
        },
        {   // 11
            "en": "Your ID:\n",
            "zh": "你的ID:\n"
        },
        {
            "en": "Status: ✔ Connected to root node of NetWork Span successfully! ✔",
            "zh": "状态: ✔ 成功连接到网络组根节点! ✔"
        },
        {
            "en": "Error: try autoJoin() by the nodesMap which wasn't from Root of Room",
            "zh": "错误: 尝试通过非房间网络组的nodesMap进行autoJoin()"
        },
        {   // 14
            "en": "Void content!!!!!!!!!!!!!!",
            "zh": "内容不能为空!!!!!!!!!!!!!!"
        },
        {
            "en": "it can't over",
            "zh": "不能超过"
        },
        {
            "en": "Join the conference at first",
            "zh": "请先加入会议"
        },
        {
            "en": "Host had not open conference",
            "zh": "主播尚未开启会议"
        },
        {   // 18
            "en": "Copy Successfully",
            "zh": "复制成功"
        },
        // {
        //     "en": "img transformed Error!",
        //     "zh": "图片转换错误!"
        // },
        // {
        //     "en": "Error getting local stream:",
        //     "zh": "获取本地流错误:"
        // },
        // {
        //     "en": "Local stream shared",
        //     "zh": "本地流已分享"
        // },
        // {
        //     "en": "Error: void nodesMap",
        //     "zh": "错误: 空的节点映射"
        // },
        // {
        //     "en": "Create failed: ID has been occupied, trying to connect...",
        //     "zh": "创建失败: ID已被占用，正在尝试连接..."
        // },
        // {
        //     "en": "Failed: name is invalid!",
        //     "zh": "失败: 名称无效!"
        // },
        // {
        //     "en": "Root node can't connect others",
        //     "zh": "网络组根节点不能连接其他节点"
        // },
    ]
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