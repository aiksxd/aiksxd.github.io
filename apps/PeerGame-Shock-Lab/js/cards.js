const cardDatabase = {};
let cardField = [];
let opponentCardField = [];
let deck = {};
let opponentDeck = [];
let opponent_Played_Card_Date_Index = false;
let card = null;
let played_Card_Date_Index = null;
let playedCard = null;
let lastTargetIndex = null;
let lastTargetElement = null;

let play_Card_Availible = true;

let unkonwn_Card = document.createElement('div');
unkonwn_Card.className = 'card unknown-card';
unkonwn_Card.textContent = '?';

let previewCard = document.createElement('div');
previewCard.className = 'preview-card';

// let test;
// class Card {
//     constructor(element, code) {
//         this.element = element;
//         this.index = element.dataset.index;
//         this.value = element.textContent;
//         this.code = code;
//         this.isOnField = false;
//     }
//     // exeFn
//     executeFunction(fnName) {
//         if (this[fnName] && typeof this[fnName] === 'function') {
//             this[fnName]();
//         }
//     }
// }
function parseCardDeck(jsonData) {
    // test = jsonData;
    // 遍历 JSON 数据中的每个类别
    cardDatabase['classNames'] = jsonData.classNames;
    cardDatabase['classNames'].forEach(card_Class_Name => {
        cardDatabase[card_Class_Name] = [];
        jsonData[card_Class_Name].cards.forEach((card) => {
            // 为每张卡牌添加类名属性
            card.cardClass = card_Class_Name;
            // 添加到对应类别的数组中
            cardDatabase[card_Class_Name].push(card);
        });
    });
    return cardDatabase;
}

// 初始化卡组
fetch('cards/cards.json')
    .then(response => response.json())
    .then(parseCardDeck)
    .catch(console.error);

// 查找特定卡牌
function findCardByName(name) {
    for (const cardClass in cardDatabase) {
        const foundCard = cardDatabase[cardClass].find(card => card.name === name);
        if (foundCard) return foundCard;
    }
    return null;
}

// const giftBoxCard = findCardByName("礼物盒");

let loop = [];
const delay = 800; // 每张卡牌激活间隔ms
// 添加卡牌激活函数
function activateCards(playerId, start, end, direction = 'ltr') {
    const card_Doms = document.querySelector('#field'+playerId).querySelectorAll('.playedCard');
    loop = [start, end, direction];
    // activateCards(myId, 0, document.getElementById("field"+myId).children.length - 1, 'ltr');
    while (loop) {
        loop = fn(loop[0], loop[1], loop[2]);
    }

    function fn(start, end, direction) {
        if (direction === 'rtl') {
            // 从右向左激活
            for (let i = end; i >= start; i--) {
                if (card_Doms[i] && costResource(myId, myId, cardField[i])) {
                    setTimeout(() => {
                        card_Doms[i].classList.add('activated');
                        if (stimulate_Card(myId, myId, cardField[i]) === 'ltr') {
                            return [i+1, end, 'ltr'];
                        }

                        setTimeout(() => {
                            card_Doms[i].classList.remove('activated');
                        }, 500);

                    }, (end - i) * delay);
                } else {return false;}
            }
            return false;
        } else {
            // 从左向右激活
            for (let i = start; i <= end; i++) {
                // console.log(card_Doms[i])
                if (card_Doms[i] && costResource(myId, myId, cardField[i])) {
                    setTimeout(() => {
                        card_Doms[i].classList.add('activated');
                        if (stimulate_Card(myId, myId, cardField[i]) === 'rtl') {
                            return [start, i-1, 'rtl'];
                        }

                        setTimeout(() => {
                            card_Doms[i].classList.remove('activated');
                        }, 500);

                    }, (i - start) * delay);
                } else {return false;}
            }
            return false;
        }
    }
}

// update card css
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


function init_Cards(card, playerId) {
    if (playerId === myId) {
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
            if (!isDragging || card.parentElement !== myContainer) return;
            
            // 计算新位置
            offsetX = clientX - startX + lastPosition.x;
            offsetY = clientY - startY + lastPosition.y;
            
            card.style.left = `${offsetX}px`;
            card.style.top = `${offsetY}px`;
            
            // 检查是否在游戏区域
            const mouseX = clientX;
            const mouseY = clientY;
            const containerRect = myContainer.getBoundingClientRect();
            const myField = document.querySelector('#field'+myId).getBoundingClientRect();
            
            if (isInArea(mouseX, mouseY, containerRect)) {
                card.classList.remove('playing');
                if (document.getElementById('preview-card')) {
                    document.getElementById('preview-card').remove();
                }
                updateCardPositionInContainer(card, mouseX, containerRect);
            } else if (isInArea(mouseX, mouseY, myField)) {
                card.classList.add('playing');
                if (!document.getElementById('preview-card')) {
                    let tempCard = previewCard.cloneNode();
                    tempCard.id = 'preview-card';
                    document.querySelector('#field'+myId).appendChild(tempCard);
                }
            } else {    // same card stack todo
                card.classList.remove('playing');
                if (document.getElementById('preview-card')) {
                    document.getElementById('preview-card').remove();
                }
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
            
            if (document.getElementById('preview-card')) {
                document.getElementById('preview-card').remove();
            }
            // 检查是否在游戏区域
            const myField = document.querySelector('#field'+myId).getBoundingClientRect();
            if (isInArea(clientX, clientY, myField)) {
                // 动态调整间距
                const fieldCards = document.querySelector('#field'+myId).querySelectorAll('.playedCard');
                const newGap = 15 - fieldCards.length * 2;
                document.querySelector('#field'+myId).style.gap = `${newGap}px`;
                
                // 添加动画效果
                card.style.transition = 'all 0.5s ease';
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0.8';
                
                setTimeout(() => {
                    card.style.transition = '';
                    card.style.transform = '';
                    card.style.opacity = '';
                }, 500);

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
    } else {    // opponent team card init
        const handleDragStart = () => {
            // 显示卡片信息
            document.querySelector('.cardInfo').style.opacity = '1';
            if (document.querySelector('#field'+myId+' .field-label')) {
                document.querySelector('#field'+myId+' .field-label').style.opacity = '1';
            }
        };
        const handleDragEnd = () => {
            if (document.querySelector('#field'+myId+' .field-label')) {
                document.querySelector('#field'+myId+' .field-label').style.opacity = '0';
            }
            setTimeout(() => {
                document.querySelector('.cardInfo').style.opacity = '0';
            }, 500);
        };
        // 鼠标事件
        card.addEventListener('mouseover', e => {
            e.preventDefault();
            handleDragStart();
        });
        document.addEventListener('mouseup', e => {
            handleDragEnd();
        });
    }
}

// 辅助函数：检查坐标是否在区域内
function isInArea(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// 辅助函数：更新卡牌在容器中的位置
function updateCardPositionInContainer(card, mouseX, containerRect) {
    const card_Doms = Array.from(myContainer.querySelectorAll('.card'));
    const cardIndex = Array.from(myContainer.children).indexOf(card);
    
    if (cardIndex === -1) return;
    
    const cardCount = card_Doms.length;
    const relativeX = mouseX - containerRect.left;
    const containerWidth = containerRect.width;
    
    // 计算目标位置
    let targetIndex = Math.floor(relativeX / (containerWidth / Math.max(1, cardCount)));
    targetIndex = Math.min(targetIndex, cardCount - 1);
    
    // 如果位置变化则移动卡牌
    if (lastTargetIndex !== null && lastTargetIndex !== targetIndex) {
        if (lastTargetIndex < targetIndex) {
            myContainer.insertBefore(card_Doms[cardIndex], card_Doms[targetIndex].nextSibling);
        } else if (lastTargetIndex > targetIndex) {
            myContainer.insertBefore(card_Doms[cardIndex], card_Doms[targetIndex]);
        }
        adjust_Card_Style(card_Doms.length, myContainer);
    }
    
    lastTargetIndex = targetIndex;
    lastTargetElement = card;
}

// 辅助函数：处理卡牌出牌
function handleCardPlay(card_Element) {
    // console.log(costResource(myId, deck[myId][card_Element.dataset.index]))
    let card = deck[myId][card_Element.dataset.index];
    if (!play_Card_Availible || !costResource(myId, myId, card)) {
        card_Element.style.left = "unset";
        card_Element.style.top = "unset";
        card_Element.classList.remove('playing');
        return;
    }
    // if (!play_Card_Availible) return;
    // if (playedCard !== null) {
    //     if (opponent_Played_Card_Date_Index !== null && played_Card_Date_Index !== null) {
    //         return;
    //     }
    //     // replace card todo(fix receiver exe repeatly)
    //     card.classList.remove('playing');
    //     // let mediaValue = playedCard.textContent;
    //     // playedCard.textContent = card.textContent;
    //     // card.textContent = mediaValue;
    //     return;
    // }
    const card_Doms = Array.from(myContainer.querySelectorAll('.card'));
    const cardIndex = Array.from(myContainer.children).indexOf(card_Element);
    
    if (cardIndex === -1) return;
    // for (const [resource, amount] of Object.entries(deck[myId][card_Element.dataset.index].cost)) {
    //     if (roomInfo.players.find(p => p.id === myId)[resource] < amount) {
    //         card_Element.style.left = "unset";
    //         card_Element.style.top = "unset";
    //         card_Element.classList.remove('playing');
    //         return;
    //     } else {
    //         // console.log(resource, amount)
    //         update_Player_Data(myId, resource, 'minus', amount);
    //     }
    // }
    
    played_Card_Date_Index = card_Element.dataset.index;
    
    // 发送游戏数据
    if (parent_Node) {
        parent_Node.send(['played', myId, played_Card_Date_Index, card]);
    } else if (conns[0]) {
        conns[0].send(['played', myId, played_Card_Date_Index, card]);
    }
    let card_Dom = card_Doms[cardIndex];
    card_Dom.setAttribute('style', "");
    card_Dom.classList.remove('playing');
    card_Dom.classList.remove('card');
    card_Dom.classList.add('playedCard');
    document.querySelector('#field'+myId).appendChild(card_Element);
    operate_Card_from_Deck(deck[myId], 'index', deck[myId][played_Card_Date_Index].index, 'field', false);
    adjust_Card_Style(card_Doms.length, myContainer);

    card_Dom.classList.add('activated');

    stimulate_Card(myId, myId, cardField[cardField.length - 1]);

    checkCostAvailible();
    // card_Doms[cardIndex].remove();
    
    // // 创建出牌区域元素
    // playedCard = document.createElement('div');
    // playedCard.className = 'card';
    // playedCard.childNodes = card.childNodes;
    // document.querySelector('.own-zone').appendChild(playedCard);
    
    // 检查对手是否已出牌
    // if (opponent_Played_Card_Date_Index) {
    //     updateGameResult(deck[myId][played_Card_Date_Index], opponentDeck[opponent_Played_Card_Date_Index]);
    // }
}

function stimulate_Card(sourceId, targetId, card){
    const { func, args } = card.invoke;
    let i = 0;
    let t;
    while (i < func.length) {
        if (cardEffects[func[i]]) {
            // cardEffects[func](...args);
            // console.log(args);
            if(t = cardEffects[func[i]](sourceId, targetId, args[i], card)){
                return t;
            }
        } else {
            console.error(`unknown effect: ${func[i]}`);
        }
        i++;
    }
    if(t){
        console.log(t);
        return t;
    }
}

function operate_Card_from_Deck(deck, referrence, value, operate, repeatly, feedback) {
    let i = 0;      // this deck is deck['id']
    let t = [-1];
    while (i < deck.length) {
        if (deck[i] !== undefined) {
            t[0]++;
        } else {
            i++;
            continue;
        }
        if (deck[i][referrence] === value) {
            switch (operate) {
                case 'field':
                    cardField.push(deck[i]);
                    deck[i] = undefined;
                break;
                case 'unset':
                    deck[i] = undefined;
                break;
                default:
                break;
            }
            if (!repeatly) {
                switch (feedback) {
                    case 'position':
                        return i;   // return the position in deck
                    case 'pos-undefined':
                        return t[0];   // return the position in default sort of card_Doms
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
function drawCard(targetId, card_Class, card_Codes) {
    // console.log(card_Codes)
    let player = roomInfo.players.find(p => p.id === targetId);
    if (targetId === myId) {
        if (parent_Node) {
            parent_Node.send(['draw', targetId, card_Class, card_Codes]);
        } else if (conns[0]) {
            broadcast(myId, ['draw', targetId, card_Class, card_Codes]);
        }
    }
    if (player.team === myTeam) {
        for (let code of card_Codes) {
            const cardData = cardDatabase[card_Class][code];

            // 构建费用显示字符串
            let costHtml = '';
            for (const [resource, amount] of Object.entries(cardData.cost)) {
                costHtml += `<div class="cost fas fa-${resource}">${amount}</div>`;
            }

            // 创建卡牌DOM元素
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.id = 'card' + deck[targetId].length;
            cardElement.dataset.index = deck[targetId].length;

            cardElement.innerHTML = `
                ${costHtml}
                <img src="${cardData.img}" alt="${cardData.name}">
                <span class="shortInfo">${cardData.shortInfo}</span>
            `;

            // 复制 cardData，确保每张卡牌都是独立对象
            const card = Object.assign({}, cardData);
            card.var = {};
            card.domId = cardElement.id;
            card.index = deck[targetId].length;
            deck[targetId].push(card);
            let targetContainer = document.querySelector('#container'+targetId);
            targetContainer.appendChild(cardElement);

            if (targetId === myId) {
                init_Cards(cardElement, myId);
            }
            adjust_Card_Style(deck[targetId].length, targetContainer);
        }
    } else {
        opponentDeck[targetId].push('unknown');
        let targetContainer = document.querySelector('#container'+targetId);
        targetContainer.appendChild(unkonwn_Card.cloneNode(true));
        adjust_Card_Style(opponentDeck[targetId].length, targetContainer);
    }
}

function checkCostAvailible() {
    if (deck[myId].length === 0) {
        play_Card_Availible = false;
        turn_Settlement();
    }
    let i = 0;
    let costs = {};
    let resourceNames = [];
    let player = roomInfo.players.find(p => p.id === myId);
    while (i < deck[myId].length && play_Card_Availible) {
        if (!deck[myId][i]) {
            i++;
            continue;
        }
        for (const [resource, amount] of Object.entries(deck[myId][i].cost)) {
            costs[resource] = amount;
            resourceNames.push(resource);
        }
        resourceNames.forEach(resourceName => {
            if(player[resourceName] < costs[resourceName]){
                play_Card_Availible = false;
            }
        });
        i++;
    }
    if (!play_Card_Availible) {
        turn_Settlement();
    }
}