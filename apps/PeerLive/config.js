
let defaultId = 'P2P-Live-Web-Default-ID';

let max_Child_Nodes = 4;

let config = {
    'app_Mode': true,
    'theme_Index': "0",
    'use_Local_Storage': true,
    'use_Clone_Page': true,
    'language': (navigator.language || navigator.userLanguage).substring(0, 2),
};

let app_Info = {
    'app_Id': "",
    'app_Version': "0",
    'app_Language': 'en',
    'app_Url': 'apps/PeerLive',
    'app_Name': 'PeerLive',
    'app_Icon': '<svg class="peerLive" width="150" height="150" viewBox="66 100 55 55"><path class="svgText" d="m87 146 3-16q2-1 2.5 1L90 148q-2 1-2 0Z"/><circle cx="92" cy="125"/><path class="svgText" d="M85 120q9-6 15 2 5 0-1-5-7-6-15.5 1-1 2 1.5 2"/><path class="svgText" d="M80 115q16-11 26 4 2 1 1-3-11-15-29-4 0 3 2 3"/><circle class="svgText" cx="92" cy="125" r="2"/></svg>',
    'run_fn': 'tab',
}