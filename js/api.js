// ----------------------- Universal api -----------------------
function ask_Modify_Config(aim, value) {
    window.parent.postMessage([0, aim, value]);
}
function ask_Modify_Theme(theme_Index) {
    window.parent.postMessage(['theme', theme_Index]);
}
function ask_Modify_Language(lan) {
    window.parent.postMessage(['lan', lan]);
}
function ask_Open_Modal() {
    window.parent.postMessage(['modal']);
}
function ask_Toggle_Immerse_Mode() {
    window.parent.postMessage(['immerse']);
}
function launch_Web_App(app_Name, app_Url, expected_App_Id) {
    window.parent.postMessage(["run", app_Name, app_Url, expected_App_Id]);
}
function pop_Msg(msg) {
    window.parent.postMessage(['msg', msg]);
}
function add_Task(task) {
    window.parent.postMessage(['task', task]);
}
// ----------------------- initialize -----------------------

// if (window.parent.localStorage.language !== config['language']) {
//     config['language'] = window.parent.localStorage.language;
//     if (typeof update_Page_Language === 'function') {
//         update_Page_Language(config['language']);
//     }
// }
// if (window.parent.localStorage.themeIndex !== config['theme_Index']) {
//     config['theme_Index'] = window.parent.localStorage.themeIndex;
//     if (typeof change_Page_Theme === 'function') {
//         change_Page_Theme(config['theme_Index']);
//     }
// }

// ----------------------- App api -----------------------

function post_Msg(msg) {
    window.parent.postMessage(msg);
}

function init_App() {

    // console.log(app_Info['app_Id']);    // ok

    switch (app_Info['run_fn']) {
        case 'tab':
            // console.log(app_Info['app_Icon']);
            post_Msg(['tab', app_Info['app_Name'], app_Info['app_Url'], app_Info['app_Id'], app_Info['app_Icon']])
            break;
        case 'background':
        
            break;
        case 'fullscreen':
        
            break;
    
        default:
            break;
    }
}

window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) { return; }
    // let currentUrl = window.location.origin;
    // let urlIndex = currentUrl.indexOf(language);
    // if (urlIndex !== -1) {
    //     currentUrl = currentUrl.sutargetstring(0, urlIndex - 1);
    // }
    // console.log(event.origin+"=\n"+window.location.origin +"=\n" + event.data);  // debug
    switch (event.data[0]) {
        case 0:     // modify config
            let aim = event.data[1];
            let value = event.data[2];
            config[aim] = value;
            // switch (event.data[1]) {
            //     case 0:
            //         config['use_Local_Storage'] = event.data[2];
                    
            //         break;
            //     case 1:     // switch config['app_Mode'] (msg from window.parent)
            //         if(event.data[2]){
            //             config['app_Mode'] = true;
            //             if (document.getElementById("onlineButton")) {
            //                 document.getElementById("onlineButton").classList.remove("covert");
            //             }
            //             if (document.getElementById("themeController")) {
            //                 document.getElementById("themeController").classList.add("covert");
            //             }
            //         } else {
            //             config['app_Mode'] = false;
            //             if (document.getElementById("onlineButton")) {
            //                 document.getElementById("onlineButton").classList.add("covert");
            //             }
            //             if (document.getElementById("themeController")) {
            //                 document.getElementById("themeController").classList.remove("covert");
            //             }
            //         }
            //         break;
            //     default:
            //         break;
            // }
            break;
        case 'theme': // modify theme
            config['theme_Index'] = event.data[1];
            if (typeof change_Page_Theme === 'function') {
                change_Page_Theme(config['theme_Index']);
            }
            break;
        case 'lan':   // modify language
            config['language'] = event.data[1];
            if (typeof update_Page_Language === 'function') {
                update_Page_Language(config['language']);
            }
            break;
        case 'id':
            app_Info['app_Id'] = event.data[1];
            init_App();
            break;
        default:
            console.warn('Unknown message type:', event.data[0]);
            break;
    }
});

// ----------------------- floatball support -----------------------

const convertCoordinates = (e) => {
    return {
        x: e.clientX,
        y: e.clientY
    };
};

document.addEventListener('mousemove', e => {
    const coords = convertCoordinates(e);
    if (!coords || !parent.sharedMousePosition) return;

    if (performance.now() > parent.sharedMousePosition.lastUpdated) {
        parent.sharedMousePosition.x = e.clientX;
        parent.sharedMousePosition.y = e.clientY;
        parent.sharedMousePosition.lastUpdated = performance.now();
    }
});

// ----------------------- text background -----------------------

// 自动亮度检测（可选）
document.querySelectorAll('.autoTextColor').forEach(aims => {
    const bgColor = getComputedStyle(aims).getPropertyValue('--bg');
    const brightness = calculateColorBrightness(bgColor);
    tag.setAttribute('data-brightness', brightness > 128 ? 'light' : 'dark');
});

function calculateColorBrightness(hex) {
    // 颜色亮度计算逻辑
    const rgb = parseInt(hex.sutargetstring(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ----------------------- PPT -----------------------

const ppt_areas = document.querySelectorAll('.ppt-trigger-area');

ppt_areas.forEach(area => {
    const targets = area.querySelectorAll('.ppt-animation-target');
    const showButton = area.querySelector('.ppt-show');
    const addButton = area.querySelector('.ppt-add');
    const removeButton = area.querySelector('.ppt-remove');
    
    if (showButton) {
        showButton.addEventListener('click', () => {
            const unactiveTargets = Array.from(targets).filter(target =>!target.classList.contains('active'));
            if (unactiveTargets.length > 0) {
                let i = 0;
                while (i < unactiveTargets.length) {
                    unactiveTargets[i].classList.add('active');
                    i++;
                }
            } else {
                const activeTargets = Array.from(targets).filter(target =>target.classList.contains('active'));
                let i = 0;
                while (i < activeTargets.length) {
                    activeTargets[i].classList.remove('active');
                    i++;
                }
            }
        });
    }

    if (addButton) {
        addButton.addEventListener('click', () => {
            const unactiveTargets = Array.from(targets).filter(target =>!target.classList.contains('active'));
            if (unactiveTargets.length > 0) {
                unactiveTargets[0].classList.add('active');
            }
        });
    }

    if (removeButton) {
        removeButton.addEventListener('click', () => {
            const activeTargets = Array.from(targets).filter(target => target.classList.contains('active'));
            if (activeTargets.length > 0) {
                activeTargets[activeTargets.length - 1].classList.remove('active');
            }
        });
    }
});