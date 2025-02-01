let language_Text = [
    {
        "en": "Peer Live",
        "zh": "对等直播",
    },
    {
        "en": "Five Online",
        "zh": "在线五子棋",
    },
]
function change_Language(language) {
    let doms = document.getElementsByClassName('lan');
    let i = 0;
    while(i < doms.length){
        if (doms[i]) {
            doms[i].innerText = language_Text[i][language];
        }
        i++;
    }
}