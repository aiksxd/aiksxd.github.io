let config = {
    'app_Mode': true,
    'theme_Index': "0",
    'multi_Live_Page': true,
    'use_Local_Storage': true,
    'language': (navigator.language || navigator.userLanguage).substring(0, 2),
};

let app_Info = {
    'app_Name': 'PeerGame-Tic-Tac-Toe',
    'app_Version': "0",
    'app_Icon': '',
    'app_Id': "undefined",
    'run_fn': 'tab',
    'app_Url': 'apps/PeerGame-Tic-Tac-Toe/zh',
}

if (window.parent.localStorage.language) {
    app_Info['app_Url'] = 'apps/PeerGame-Tic-Tac-Toe/' + window.parent.localStorage.language;
}