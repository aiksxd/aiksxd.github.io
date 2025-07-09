
const loader = document.getElementById('loader');
const gameField = document.getElementById('gameField');
const container = document.getElementsByClassName('container')[0];
const oppositeContainer = document.getElementsByClassName('oppositeContainer')[0];
const overlay = document.getElementById('overlay');
const setting = document.getElementById('setting');
let conns = [];
let connIds = [];
let parent_Node;
let deck = [];
let opponentDeck = [];
let myId = "-";
let myName = "New Player";
let myAvatar = "";
let myTurn = null;
let opponent_Played_Card_Date_Index = false;
let roomInfo = [];
let card = null;
let played_Card_Date_Index = null;
let playedCard = null;
let lastTargetIndex = null;
let lastTargetElement = null;

let unkonwn_Card = document.createElement('div');
unkonwn_Card.className = 'card';
unkonwn_Card.textContent = '?';

class Card {
    constructor(element, code) {
        this.element = element;
        this.index = element.dataset.index;
        this.value = element.textContent;
        this.code = code;
        this.isOnField = false;
    }
    
    // exeFn
    executeFunction(fnName) {
        if (this[fnName] && typeof this[fnName] === 'function') {
            this[fnName]();
        }
    }
}

function init_Cards() {
    const cards = container.querySelectorAll('.card');
    
    cards.forEach(card => {
        // 初始化变量
        let isDragging = false;
        let startX, startY;
        let offsetX, offsetY;
        let lastPosition = {x: 0, y: 0};
        
        // 通用事件处理器
        const handleDragStart = (clientX, clientY) => {
            isDragging = true;
            startX = clientX;
            startY = clientY;
            card.classList.add('dragging');
            card.style.left = `${startX - card.offsetWidth}px`;
            card.style.top = `${startY - card.offsetHeight}px`;
            
            // 显示卡片信息
            document.querySelector('.cardInfo').style.opacity = '1';
            document.querySelector('.field-label').style.opacity = '1';
            
            // 存储初始位置
            lastPosition = {
                x: card.offsetLeft,
                y: card.offsetTop
            };
        };

        const handleDragMove = (clientX, clientY) => {
            if (!isDragging) return;
            
            // 计算新位置
            offsetX = clientX - startX + lastPosition.x;
            offsetY = clientY - startY + lastPosition.y;
            
            card.style.left = `${offsetX}px`;
            card.style.top = `${offsetY}px`;
            
            // 检查是否在游戏区域
            const mouseX = clientX;
            const mouseY = clientY;
            const containerRect = container.getBoundingClientRect();
            const battleField = gameField.getBoundingClientRect();
            
            if (isInArea(mouseX, mouseY, containerRect)) {
                card.classList.remove('playing');
                updateCardPositionInContainer(card, mouseX, containerRect);
            } else if (isInArea(mouseX, mouseY, battleField)) {
                card.classList.add('playing');
            } else {
                card.classList.remove('playing');
            }
        };

        const handleDragEnd = (clientX, clientY) => {
            if (!isDragging) return;
            isDragging = false;
            card.classList.remove('dragging');
            
            // 隐藏信息
            setTimeout(() => {
                document.querySelector('.field-label').style.opacity = '0';
                document.querySelector('.cardInfo').style.opacity = '0';
            }, 500);
            
            // 检查是否在游戏区域
            const battleField = gameField.getBoundingClientRect();
            if (isInArea(clientX, clientY, battleField)) {
                handleCardPlay(card);
            } else {
                // 返回原位
                card.style.left = 'unset';
                card.style.top = 'unset';
            }
            
            lastTargetIndex = null;
            lastTargetElement = null;
        };

        // 鼠标事件
        card.addEventListener('mousedown', e => {
            e.preventDefault();
            handleDragStart(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', e => {
            handleDragMove(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', e => {
            handleDragEnd(e.clientX, e.clientY);
        });

        // 触摸事件
        card.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handleDragStart(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('touchmove', e => {
            const touch = e.touches[0];
            handleDragMove(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('touchend', e => {
            const touch = e.changedTouches[0];
            handleDragEnd(touch.clientX, touch.clientY);
        });
    });
}

// 辅助函数：检查坐标是否在区域内
function isInArea(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// 辅助函数：更新卡牌在容器中的位置
function updateCardPositionInContainer(card, mouseX, containerRect) {
    const originalContainer = card.parentElement;
    const cards = Array.from(originalContainer.querySelectorAll('.card'));
    const cardIndex = Array.from(originalContainer.children).indexOf(card);
    
    if (cardIndex === -1) return;
    
    const cardCount = cards.length;
    const relativeX = mouseX - containerRect.left;
    const containerWidth = containerRect.width;
    
    // 计算目标位置
    let targetIndex = Math.floor(relativeX / (containerWidth / Math.max(1, cardCount)));
    targetIndex = Math.min(targetIndex, cardCount - 1);
    
    // 如果位置变化则移动卡牌
    if (lastTargetIndex !== null && lastTargetIndex !== targetIndex) {
        if (lastTargetIndex < targetIndex) {
            originalContainer.insertBefore(cards[cardIndex], cards[targetIndex].nextSibling);
        } else if (lastTargetIndex > targetIndex) {
            originalContainer.insertBefore(cards[cardIndex], cards[targetIndex]);
        }
        adjust_Card_Style(cards.length, container);
    }
    
    lastTargetIndex = targetIndex;
    lastTargetElement = card;
}

// 辅助函数：处理卡牌出牌
function handleCardPlay(card) {
    if (playedCard !== null) {
        if (opponent_Played_Card_Date_Index !== null && played_Card_Date_Index !== null) {
            return;
        }
        // replace card todo(fix receiver exe repeatly)
        card.classList.remove('playing');
        // let mediaValue = playedCard.textContent;
        // playedCard.textContent = card.textContent;
        // card.textContent = mediaValue;
        return;
    }
    
    const originalContainer = card.parentElement;
    const cards = Array.from(originalContainer.querySelectorAll('.card'));
    const cardIndex = Array.from(originalContainer.children).indexOf(card);
    
    if (cardIndex === -1) return;
    
    played_Card_Date_Index = card.dataset.index;
    
    // 发送游戏数据
    if (parent_Node) {
        parent_Node.send(['played', played_Card_Date_Index]);
    } else if (conns[0]) {
        conns[0].send(['played', played_Card_Date_Index]);
    }
    
    // 从手牌移除
    cards[cardIndex].remove();
    adjust_Card_Style(cards.length, container);
    
    // 创建出牌区域元素
    playedCard = document.createElement('div');
    playedCard.className = 'card';
    playedCard.textContent = card.textContent;
    document.querySelector('.own-zone').appendChild(playedCard);
    
    // 检查对手是否已出牌
    if (opponent_Played_Card_Date_Index) {
        updateGameResult(deck[played_Card_Date_Index], opponentDeck[opponent_Played_Card_Date_Index]);
    }
}

function adjust_Card_Style(length, container) {
    container.querySelectorAll('.card').forEach((card, index) => {
        if (length % 2 === 0) {
            card.style.setProperty('--i', (index - (length / 2)) + 1);
        } else {
            card.style.setProperty('--i', index - ((length - 1) / 2));
        }
        document.documentElement.style.setProperty('--t', `${(36/length).toFixed(2)}deg`);
    });
}

// oppositeContainer.querySelectorAll('.card').forEach(card => {
function init_Game(roomInfo, turn) {
    let i = 1;
    myTurn = turn;
    deck = [];
    opponentDeck = [];
    opponent_Played_Card_Date_Index = null;
    played_Card_Date_Index = null;
    playedCard = null;
    container.innerHTML = "";
    oppositeContainer.innerHTML = "";
    document.getElementsByClassName('opponent-zone')[0].innerHTML = '';
    document.getElementsByClassName('own-zone')[0].innerHTML = '';
    document.getElementsByClassName('gameScore')[0].innerHTML = '<h2><span class="score">0</span> : <span class="opponent-score">0</span></h2>';
    closeSetting();
    switch (roomInfo.mode) {
        case "asymmetric":
            let jugde = 0;
            if (turn == 1) {
                jugde = 1;
            }
            while (i <= roomInfo.range) {
                let card = document.createElement('div');
                card.className = 'card';
                card.textContent = i;
                if (i % 2 === jugde) {
                    card.dataset.index = deck.length;
                    container.appendChild(card);
                    card = new Card(card, 1);
                    deck.push(card);
                } else {
                    card.dataset.index = opponentDeck.length;
                    oppositeContainer.appendChild(card);
                    card = new Card(card, 1);
                    opponentDeck.push(card);
                }
                i++;
            }
            break;
        case "symmetric":
            while (i <= roomInfo.range) {
                let card = document.createElement('div');
                card.className = 'card';
                card.textContent = i;

                let opponentCard = card.cloneNode(true);
                
                card.dataset.index = deck.length;
                container.appendChild(card);
                card = new Card(card, 1);
                deck.push(card);

                opponentCard.dataset.index = opponentDeck.length;
                oppositeContainer.appendChild(opponentCard);
                opponentCard = new Card(opponentCard, 1);
                opponentDeck.push(opponentCard);
                i++;
            }
        default:
            break;
    }
    init_Cards();
    adjust_Card_Style(deck.length, container);
    adjust_Card_Style(opponentDeck.length, oppositeContainer);
}

function remove_Card_from_Deck(deck, referrence, value, repeatly, feedback) {
    let i = 0;
    let t = [-1];
    while (i < deck.length) {
        if (deck[i] !== undefined) {
            t[0]++;
        } else {
            i++;
            continue;
        }
        if (deck[i][referrence] == value) {
            deck[i] = undefined;
            if (!repeatly) {
                switch (feedback) {
                    case 'position':
                        return i;   // return the position in deck
                    case 'pos-undefined':
                        return t[0];   // return the position in default sort of cards
                    case 'array':
                        t.push(i);
                        break;
                    default:
                        break;
                }
            }
        }
        i++;
    }
    if (feedback === 'array') {
        return t.slice(1);
    }
}

function updateGameResult(myCard, opponentCard) {
    // console.log(myCard.value +" & "+ opponentCard.value);
    document.getElementById('tempCard').classList.add('active');
    setTimeout(() => {
        document.getElementById('tempCard').textContent = opponentCard.value;
    }, 2000);
    // logic of result
    let result;
    if (myCard.value === opponentCard.value) {
        result = 'draw';
    } else if (parseInt(myCard.value) < parseInt(opponentCard.value)) {
        result = 'lose';
    } else {
        result = 'win';
    }
    remove_Card_from_Deck(deck, 'index', myCard.index, false);
    const opponentCards = Array.from(oppositeContainer.querySelectorAll('.card'));
    opponentCards[remove_Card_from_Deck(opponentDeck, 'index', opponentCard.index, false, 'pos-undefined')].remove();
    adjust_Card_Style(opponentDeck.length, oppositeContainer);
    
    // 创建新的比赛结果section
    const gameResult = document.createElement('section');
    gameResult.className = 'gameResult';
    
    // 创建卡牌元素
    const playerSpan = document.createElement('span');
    playerSpan.className = 'tinyCard';
    playerSpan.textContent = myCard.value;
    
    const opponentSpan = document.createElement('span');
    opponentSpan.className = 'tinyOppositeCard';
    opponentSpan.textContent = opponentCard.value;
    
    // 创建SVG容器
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    
    // 创建圆形背景
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '20');
    circle.setAttribute('cx', '40');
    circle.setAttribute('cy', '40');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '4');
    svg.appendChild(circle);
    
    // 创建胜负图标
    switch (result) {
        case 'win':
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tick.setAttribute('class', 'tick');
            tick.setAttribute('fill', 'none');
            tick.setAttribute('stroke', '#68E534');
            tick.setAttribute('stroke-width', '6');
            tick.setAttribute('stroke-linecap', 'round');
            tick.setAttribute('stroke-linejoin', 'round');
            tick.setAttribute('d', 'm18 33 19 18 38-33');
            svg.appendChild(tick);
        break;
        case 'lose':
            const cross1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            cross1.setAttribute('class', 'cross');
            cross1.setAttribute('fill', 'none');
            cross1.setAttribute('stroke', 'red');
            cross1.setAttribute('stroke-width', '6');
            cross1.setAttribute('stroke-linecap', 'round');
            cross1.setAttribute('stroke-linejoin', 'round');
            cross1.setAttribute('d', 'm20 20 40 40');
            svg.appendChild(cross1);
            
            const cross2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            cross2.setAttribute('class', 'cross2');
            cross2.setAttribute('fill', 'none');
            cross2.setAttribute('stroke', 'red');
            cross2.setAttribute('stroke-width', '6');
            cross2.setAttribute('stroke-linecap', 'round');
            cross2.setAttribute('stroke-linejoin', 'round');
            cross2.setAttribute('d', 'm60 20 -40 40');
            svg.appendChild(cross2);
        break;
        case 'draw':
            const draw = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            draw.setAttribute('class', 'draw');
            draw.setAttribute('fill', 'none');
            draw.setAttribute('stroke', 'yellow');
            draw.setAttribute('stroke-width', '6');
            draw.setAttribute('stroke-linecap', 'round');
            draw.setAttribute('stroke-linejoin', 'round');
            draw.setAttribute('d', 'm20 40h40');
            svg.appendChild(draw);
        break;
    }
    
    // 组装元素
    gameResult.appendChild(playerSpan);
    gameResult.appendChild(document.createTextNode('_'));
    gameResult.appendChild(opponentSpan);
    gameResult.appendChild(svg);
    
    setTimeout(() => {
        document.getElementsByClassName('own-zone')[0].innerHTML = '';
        document.getElementsByClassName('opponent-zone')[0].innerHTML = '';
        opponent_Played_Card_Date_Index = null;
        played_Card_Date_Index = null;
        playedCard = null;
        
        switch (result) {
            case 'win':
                document.querySelector('.score').textContent = parseInt(document.querySelector('.score').textContent) + 1;
            break;
            case 'lose':
                document.querySelector('.opponent-score').textContent = parseInt(document.querySelector('.opponent-score').textContent) + 1;
            break;
            case 'draw':
            break;
            default:
                return;
        }
        const gameScore = document.querySelector('.gameScore');
        const firstResult = gameScore.querySelector('.gameResult');
        if (firstResult) {
            gameScore.insertBefore(gameResult, firstResult);
        } else {
            gameScore.appendChild(gameResult);
        }
    }, 4300);
}








if (config['use_Local_Storage'] && localStorage) {
    if (localStorage.myAvatar) {
        myAvatar = localStorage.myAvatar;
        document.getElementById("myAvatar").style.backgroundImage = "url("+myAvatar+")";
        document.getElementById("myAvatar").textContent = "";
    }
    if (localStorage.myName) {
        document.getElementById("myName").setAttribute('value', localStorage.myName);
        myName = localStorage.myName;
    }
    if (localStorage.cardRange) {
        document.getElementById("cardRange").value = localStorage.cardRange;
    }
}

// transform Img into Base64
function uploadAvatar(){
    let file = document.getElementById("uploadAvatar").files[0];
    let reader = new FileReader();
    if(file){
        if(file.size <= 1048576){
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                myAvatar = reader.result;
                // if (document.getElementById("myAvatar").src !== myAvatar) {
                //     update_Conferee_Info();
                // }
                document.getElementById("myAvatar").style.backgroundImage = "url("+myAvatar+")";
                document.getElementById("myAvatar").textContent = "";
                if (config['use_Local_Storage'] && localStorage) {
                    localStorage.myAvatar = myAvatar;
                }
            }
        } else {
            alert(res_Strings['card'][7][config['language']] + " 1MB");
        }
    } else {
        alert("File transformed error!");
    }
}


function openSetting() {
    overlay.style.display = 'flex';
    setting.classList.remove('closing');

    document.addEventListener('keydown', handleEsc);
}
function handleEsc(e) {
    if (e.key === 'Escape') closeSetting();
}

function closeSetting() {
    setting.classList.add('closing');
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
    
    document.removeEventListener('keydown', handleEsc);
}

document.getElementById('overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('overlay')) {
        closeSetting();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    hideLoader();
    openSetting();
});

function hideLoader() {
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
    }, 1000);
}
function startLoader() {
    loader.style.opacity = '1';
    loader.style.display = 'flex';
}

document.getElementById('copyURL').addEventListener('click', function() {
    navigator.clipboard.writeText(roomInfo.id)
        .then(() => {
            if (config['app_Mode']) {
                pop_Msg('Copy successfully');
            } else {
                alert('Copy successfully');
            }
        })
        .catch(err => {
            console.error('ERROR:', err);
        });
});