let last_Id = 'homePage';
let immerse_Mode = false;
let iframeIndex = [];

let sharedMousePositionMemory = {x:"0",y:"0"};

// ----------------------- initialize -----------------------
if (localStorage) {
    localStorage.appMode = config['app_Mode'];

    if (localStorage.themeIndex) {
        config['theme_Index'] = localStorage.themeIndex;
        change_Page_Theme(localStorage.themeIndex);
    }

    localStorage.config = config;   // provide config api
}

// ----------------------- fuctions -----------------------
function launch_Web_App(app_Name, app_Url, expected_App_Id) {
    
    let pages = document.getElementsByClassName('pages');

    let newIframe = document.createElement('iframe');
    let i = 0;
    while (i <= config['max_Clone_Apps_Number']) {
        if (expected_App_Id) {
            
        } else {
            expected_App_Id = pages.length;
        }
        if (i) {
            expected_App_Id = expected_App_Id + '_' + i;
        }
        if (!document.getElementById(expected_App_Id)) {
            break;
        }
        i++;
        if (i = config['max_Clone_Apps_Number']) {
            console.log('over max clone number:'+ expected_App_Id +"_"+ i);
            return;
        }
    }
    newIframe.id = expected_App_Id;     //newIframe.id +
    if (app_Url) {
        newIframe.src = app_Url;
    }
    newIframe.classList.add("pages", "covert");
    // pages[pages.length - 1].insertAdjacentElement('afterend', newIframe);
    document.getElementsByClassName('content')[0].appendChild(newIframe)
    iframeIndex[pages.length - 1] = [expected_App_Id, app_Name, app_Url];
    
    showMessage(app_Name + res_Strings['sys'][0][config['language']]);

    newIframe.onload = function() {
        pages[pages.length - 1].contentWindow.postMessage(['id', pages.length - 1], window.location.origin);
        console.log('new app launched: ' + iframeIndex[pages.length - 1])
    };
}

function broadcast_Iframe_Info(msg) {
    let i = 0;
    let iframeWindow = document.querySelectorAll('.pages');
    while (i < (iframeWindow.length)) {
        iframeWindow[i].contentWindow.postMessage(msg, window.location.origin);
        i++;
    }
}

window.addEventListener('message', (e)=>{
    if (e.origin !== window.location.origin) { return; }
    // console.log('receive msg '+ e.data);

    switch (e.data[0]) {    // 0: modify config, 1: new page
        case 0:     // modify config [0, aim, value]
            let aim = e.data[1];
            let value = e.data[2];
            modify_Config(aim, value);
            break;
        case 'jump':    // ['jump', name, id, url]
            let name = e.data[1];
            let id = e.data[2];
            let url = e.data[3];
            if (config['app_Mode']) {
                if (config['enable_Clone_Page']) {
                    launch_Web_App(name, url);
                } else {
                    document.getElementById(id).src = url;
                }
                // console.log(e.data +"\n"+ index);  // debug
            }
            // new page [1, page_Postion]
            // let page_Postion = e.data[1];
            // let url = "./"+ language +"/"+ e.data;
            // if (config['app_Mode']) {
            //     if (config['enable_Clone_Page']) {
            //         changeMenu(add_Shortcut(url, page_Postion, 2));   // multi live menu
            //     } else {
            //         changeMenu(page_Postion);     // original live menu
            //     }
            //     // console.log(e.data +"\n"+ index);  // debug
            // }
            break;
        case 'theme': // modify theme
            config['theme_Index'] = e.data[1];
            localStorage.themeIndex = e.data[1];
            change_Page_Theme(e.data[1]);
            broadcast_Iframe_Info(e.data);
            break;
        case 'lan': // modify language
            config['language'] = e.data[1];
            localStorage.language = e.data[1];
            broadcast_Iframe_Info(e.data);
            break;
        case 'msg': // message from iframe [msg, text]
            showMessage(e.data[1]);
            break;
        case 'task': // task from iframe [task, text]
            addTask(e.data[1]);
            break;
        case 'run':
            launch_Web_App(e.data[1], e.data[2], e.data[3], e.data[4])
            break;
        case 'tab':
            add_Shortcut(e.data[1], e.data[2], e.data[3], e.data[4]);
            break;
        case 'immerse': // toggle Immerse Mode
            toggle_Immerse_Mode(e.data[1], e.data[2]);
            break;
        case 'modal':
            openModal(e.data[1], e.data[2]);
            break;
        default:
            break;
    }
},false);

// -----------------------SIDEBAR-----------------------

function changeMenu(id) {
    // let sidebar = document.querySelector('.menuContainer');
    // let menus = sidebar.getElementsByClassName("icon");
    // let pages = document.getElementsByClassName("pages");
    // if (index < 0) {
    //     index = menus.length + index;
    //     if (index < 0) {
    //         index = 0;
    //         alert("Error aim menu");    // debug
    //     }
    // }
    // if (!menus[last_Index]) {
    //     last_Index = 0;
    // } else {
    //     pages[last_Index].classList.add("covert");
    //     menus[last_Index].classList.remove("active");
    // }
    // if (!menus[index]) {
    //     popIndex = 0;
    // }
    // last_Index = index;
    // pages[index].classList.remove("covert");
    // menus[index].classList.add("active");
    if (last_Id === id) {
        return;
    }
    let page = document.getElementById(id);
    let menu = document.getElementById('menu-'+id);
    if (page) {
        page.classList.remove("covert");
        if (menu) {
            // console.log('.');
            menu.classList.add("active");
        }

        let last_page = document.getElementById(last_Id);
        if (last_page) {
            last_page.classList.add("covert");
            let last_menu = document.getElementById('menu-'+last_Id);
            if (last_menu) {
                last_menu.classList.remove("active");
            }
        }
        last_Id = id;
        localStorage.setItem('last_Id', last_Id); // save last opened page
    }
}

function add_Shortcut(name, url, id, icon) {
    let index = '';
    let sidebar = document.getElementsByClassName('menuContainer')[0];
    // let len = document.getElementsByClassName(name).length;
    // let new_Dom = document.getElementsByClassName(name)[len - 1].cloneNode(true);
    // let newIframe = document.getElementById(name).cloneNode(true);
    // switch (fn) {
    //     case 0:    // add new [0, name, positon, url]
    //         break;
    //     case 1:    // copy exist [1, name, positon, url]
    let len = document.getElementsByClassName('pages').length - 1;
    
    let new_Dom = document.createElement('section');
    if (icon) {
        new_Dom.innerHTML = icon;
        // console.log(icon)
    } else {
        let img = document.createElement('img');
        img.setAttribute('onerror', "this.src=\'"+url+"/favion.ico\'; this.onerror = null");
        img.setAttribute('src', url+'/icon.png');
        img.setAttribute('alt', name);
        img.setAttribute('loading', "lazy");
        new_Dom.appendChild(img);
    }

// clone
    // let new_Dom = document.getElementsByClassName(name)[len - 1].cloneNode(true);
    // let newIframe = document.getElementById(name).cloneNode(true);
    
    // let newIframe = document.createElement('iframe');
    // newIframe.id = newIframe.id + len;
    // if (url) {
    //     newIframe.src = url;
    // }
    // let newContentDiv = document.createElement('div');
    // newContentDiv.appendChild(newIframe);
    // newContentDiv.classList.add("iframeContainer", "covert");

    new_Dom.setAttribute('onclick', "changeMenu("+ (id) + ")");
    new_Dom.id = 'menu-' + id;
    new_Dom.classList.add(name, 'icon');
    new_Dom.classList.remove('active');  //
    // document.getElementsByClassName('content')[0].getElementsByTagName('div')[len - 1].insertAdjacentElement('afterend', newContentDiv);
    let class_Number = [document.querySelectorAll('.' + name)].length - 1;
    if (class_Number) {
        document.getElementsByClassName(name)[len - 1].insertAdjacentElement('afterend', new_Dom);
        
        if (class_Number < 2) {  // old len(hasnot updated)
            document.getElementsByClassName(name)[len].classList.add('covert');
        } else {
            document.getElementsByClassName(name)[len - 1].classList.remove('covert');
        }
    } else {
        sidebar.appendChild(new_Dom);
    }
    index = len;
    //         break;
    //     default:
    //         break;
    // }
    return index;
}

function display_menu() {
    document.querySelector('.sidebar-toggle-btn').classList.toggle('collapsed');
    document.querySelector('.sidebar').classList.toggle('collapsed');
    document.querySelector('.content').classList.toggle('hiddenContent');
}
// document.querySelector('.sidebar-toggle-btn').addEventListener('hover', () => {
//     setTimeout(() => {

//     }, 1000);
// });

// ----------------------- Remind & Hung up tasks-----------------------

let tooltip = document.getElementById('tooltip');
let idleTimer;
let isIdle = false;
let messageQueue = [];
const MESSAGE_LIMIT = 10;

// 鼠标位置跟踪

// 共享内存存储
window.sharedMousePosition = { 
    x: 0, 
    y: 0,
    lastUpdated: performance.now() // 添加时间戳用于冲突处理
};

// 父窗口鼠标监听
const handleParentMove = e => {
    if (document.querySelector(".sidebar").offsetHeight < document.querySelector(".sidebar").offsetWidth) {
        sharedMousePosition.x = e.clientX;
        sharedMousePosition.y = e.clientY;
    } else {
        sharedMousePosition.x = e.clientX - document.querySelector(".sidebar").offsetWidth;
        sharedMousePosition.y = e.clientY;
    }
    sharedMousePosition.lastUpdated = performance.now();
    // console.log('handleParentMove');
};
document.addEventListener('mousemove', handleParentMove);

// 渲染同步系统
const updatePosition = () => {
    
    let x,y;
    
    if (!(
        sharedMousePositionMemory.x !== JSON.stringify(sharedMousePosition.x) 
        ||
        sharedMousePositionMemory.y !== JSON.stringify(sharedMousePosition.y)
    )) {
        requestAnimationFrame(updatePosition);
        return;
    }
    sharedMousePositionMemory.x = JSON.stringify(sharedMousePosition.x);
    sharedMousePositionMemory.y = JSON.stringify(sharedMousePosition.y);
    // console.log('updatePosition');

    clearTimeout(idleTimer);
    if(isIdle) handleWake();
    // 重置空闲计时器
    idleTimer = setTimeout(() => {
        if (!immerse_Mode) {
            isIdle = true;
            messageQueue.forEach(msg => msg.classList.remove('hide'));
            tooltip.querySelector('.task-queue').style.display = 'block';
        }
    }, 3000);

    if (document.querySelector(".sidebar").offsetHeight < document.querySelector(".sidebar").offsetWidth) {
        x = sharedMousePosition.x;
        y = sharedMousePosition.y;
    } else {
        x = sharedMousePosition.x + document.querySelector(".sidebar").offsetWidth;
        y = sharedMousePosition.y;
    }
    if (x + tooltip.offsetWidth > window.innerWidth) {
        tooltip.style.left = `${x - tooltip.offsetWidth}px`;
    } else {
        tooltip.style.left = `${x}px`;
    }
    if (y + tooltip.offsetHeight > window.innerHeight) {
        tooltip.style.top = `${y - tooltip.offsetHeight}px`;
    } else {
        tooltip.style.top = `${y}px`;
    }
    requestAnimationFrame(updatePosition);
    // this.currentX = e.clientX - this.initialX;
    // this.currentY = e.clientY - this.initialY;

    // // 边界限制
    // const maxX = window.innerWidth - this.ball.offsetWidth;
    // const maxY = window.innerHeight - this.ball.offsetHeight;
    
    // this.currentX = Math.min(Math.max(0, this.currentX), maxX);
    // this.currentY = Math.min(Math.max(0, this.currentY), maxY);

    // this.ball.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
};
updatePosition();

function handleWake() {
  isIdle = false;
//   // 清除任务队列
//   const taskQueue = tooltip.querySelector('.task-queue');
//   taskQueue.style.display = 'none';
//   taskQueue.innerHTML = '';
  
  // 延迟隐藏消息
  setTimeout(() => {
    messageQueue.forEach(msg => msg.classList.add('hide'));
  }, 300);
}

function createMessageElement(text) {
  const msg = document.createElement('div');
  msg.className = 'message';
  msg.innerHTML = text;
  
  // 自动移除动画
    setInterval(() => {
        if (!isIdle) {
            clearInterval(this);
            msg.classList.add('hide');
            msg.addEventListener('transitionend', () => msg.remove());
        }
    }, 5000);
  return msg;
}

function showMessage(text) {
  const container = tooltip.querySelector('.message-container');
  const messages = container.querySelectorAll('.message');
  
//   // 执行数量限制
//   if (messages.length >= MESSAGE_LIMIT) {
//     messages[0].classList.add('hide');
//     messages[0].addEventListener('transitionend', () => {
//       messages[0].remove();
//     });
//   }
    const msg = createMessageElement(text);
    container.appendChild(msg);
}

function addTask(text) {
  const task = document.createElement('div');
  task.className = 'message task';
  task.innerHTML = text;
  if (!isIdle) {
      task.classList.add('hide');
  }
  tooltip.querySelector('.task-queue').appendChild(task);
  messageQueue.push(task);
}

// 初始化工具提示
tooltip.style.display = 'block';

// ----------------------- Screen Effect -----------------------

function toggle_Immerse_Mode(focus_App, value) {

    immerse_Mode = value || !immerse_Mode;
    if (immerse_Mode) {
        document.querySelector('.sidebar-toggle-btn').classList.toggle('collapsed');
        document.querySelector('.sidebar').classList.toggle('collapsed');
        document.querySelector('.content').classList.toggle('hiddenContent');
        alert('immerse:true')//debug
    } else {
        display_menu();
    }
}

function openModal() {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    
    overlay.style.display = 'flex';
    modal.classList.remove('closing');

    document.addEventListener('keydown', handleEsc);
}

function closeModal() {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    
    modal.classList.add('closing');
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
    
    document.removeEventListener('keydown', handleEsc);
}

function handleEsc(e) {
    if (e.key === 'Escape') closeModal();
}

document.getElementById('overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('overlay')) {
        closeModal();
    }
});

// -----------------------Config-----------------------

function modify_Config(aim, value) {
    switch (aim) {
        case 'use_Local_Storage':
        case 'app_Mode':
        case 'enbale_Local_Storage':
            break;
        case 'enable_Clone_Page':
            // // hide cloned Apps
            // if (!config[aim]) {
            //     let len = document.getElementsByClassName('cloneApps').length;
            //     if (len > 1) {
            //         document.getElementsByClassName('cloneApps')[len - 1].classList.remove('covert');
            //     }
            // }
            break;
        default:
            console.warn('Unknown config aim: ' + aim + ' = ' + value);
            return;
    }
    console.log('Config Modified: ' +aim + '(' + config[aim] + ') =' + value);
    config[aim] = value;
    localStorage.getItem[aim] = value;
    broadcast_Iframe_Info([0, aim, value]);
}

function copy_Config() {
    navigator.clipboard.writeText(JSON.stringify(obj))
        .then(() => {
            remind();
        })
        .catch(err => {
            console.error('ERROR:', err);
        });
}

function import_Config() {
    try {
        let clipboardData = navigator.clipboard.readText();
        
        try {
            config = JSON.parse(clipboardData);
        } catch (error) {
            alert('剪贴板内容不是有效的JSON字符串');
            return;
        }
        
        remind('成功转换为JS对象:', jsObject);
        modify_Config()
    } catch (error) {
        alert('无法访问剪贴板内容，请确保您的浏览器支持此功能并且您已授予必要的权限。');
    }
}