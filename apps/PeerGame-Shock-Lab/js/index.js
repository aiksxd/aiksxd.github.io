
const loader = document.getElementById('loader');
const overlay = document.getElementById('overlay');
const setting = document.getElementById('setting');
let opponentContainer;
let myContainer;
let teams = {};
let conns = [];
let connIds = [];
let parent_Node;
let myId = '-';
let myTeam = 'a';
let myName = 'New Player';
let myAvatar = '';
let myMove = null;
let roomInfo = [];
let turns = 0;
let opponentId = '';

// opponentContainer.querySelectorAll('.card').forEach(card => {
function init_Game(roomInfo, move) {
    let i = 1;
    turns = 0;
    myMove = move;
    deck = {};
    opponentDeck = {};
    opponent_Played_Card_Date_Index = null;
    played_Card_Date_Index = null;
    playedCard = null;
    duration =  roomInfo.duration;
    document.querySelectorAll('.playerInfo').forEach(dom => {
        dom.innerHTML = '';
    });
    document.querySelectorAll('.cardField').forEach(dom => {
        dom.remove();
    });
    document.querySelectorAll('.container').forEach(dom => {
        dom.remove();
    });
    roomInfo.players.forEach((player, index) => {
        // initalize basic data of player: more detail api todo
        player.heart = 2 * roomInfo.range;
        player.thunder = 1 * roomInfo.range;

        let playerItem = document.createElement("div");
        if (player.avatar) {
            playerItem.innerHTML = `
                <div class="player-avatar" style="background-image:url(${player.avatar})"></div>
                <span class="player-name">${player.name}</span>
                <span id="heart${player.id}" class="cost fas fa-heart">${player.heart}</span>
                <span id="thunder${player.id}" class="cost fas fa-thunder">${player.thunder}</span>
            `;
        } else {
            playerItem.innerHTML = `
                <div class="player-avatar">${player.name.slice(0,0)}</div>
                <span class="player-name">${player.name}</span>
                <span id="heart${player.id}" class="cost fas fa-heart">${player.heart}</span>
                <span id="thunder${player.id}" class="cost fas fa-thunder">${player.thunder}</span>
            `;
        }

        if (player.team === myTeam) {
            // avatar
            document.getElementById('ourInfo').append(playerItem);
            if (!teams[myTeam]) {
                teams[myTeam] = [];
            }
            teams[myTeam].push(player.id);
            // init deck
            deck[player.id] = [];
        } else {
            document.getElementById('opponentInfo').append(playerItem);
            if (!teams[player.team]) {
                teams[player.team] = [];
            }
            teams[player.team].push(player.id);
            // init deck
            opponentDeck[player.id] = [];
        }

        let field = document.createElement('div');
        field.id = "field"+player.id;
        if (player.team === myTeam) {
            field.className = "ourCardField cardField";
            field.innerHTML = '<div class="field-label lan">'+language_Text['index'][28][config.language]+'</div>';
        } else {
            field.className = "opponentCardField cardField";
            field.innerHTML = '<div class="field-label lan">'+language_Text['index'][29][config.language]+'</div>';
        }
        document.body.appendChild(field);
        
        let newContainer = document.createElement('div');
        newContainer.id = "container"+player.id;
        if (player.team === myTeam) {
            newContainer.className = "container ourContainer";
            document.body.appendChild(newContainer);
        } else {
            newContainer.className = "container opponentContainer";
            document.body.appendChild(newContainer);
            // opponentContainer = document.querySelector('#container'+teams[player.team][teams[myTeam].findIndex(id => id ===  myId)]);
            opponentId = player.id;     // todo
            opponentContainer = document.querySelector('#container'+player.id);
        }
        // todo
        document.getElementsByClassName('gameScore')[0].innerHTML = '<h2><span class="score">0</span> : <span class="opponent-score">0</span></h2>';
    });
    myContainer = document.querySelector('#container'+myId);
    switch (roomInfo.mode) {
        case "random":
            let randomIndices = randomInts(roomInfo.range, 'shock');
            drawCard(myId, 'shock', randomIndices);
            // for (let code of randomIndices) {
            //     const cardData = cardDatabase.shock[code];
            //     // 构建费用显示字符串
            //     let costHtml = '';
            //     for (const [resource, amount] of Object.entries(cardData.cost)) {
            //         costHtml += `<div class="cost fas fa-${resource}">${amount}</div>`;
            //     }

            //     // 创建卡牌DOM元素
            //     const cardElement = document.createElement('div');
            //     cardElement.className = 'card';
            //     cardElement.id = 'card' + deck[myId].length;
            //     cardElement.dataset.index = deck[myId].length;

            //     cardElement.innerHTML = `
            //         ${costHtml}
            //         <img src="${cardData.img}" alt="${cardData.name}">
            //         <span class="shortInfo">${cardData.shortInfo}</span>
            //     `;

            //     // 复制 cardData，确保每张卡牌都是独立对象
            //     const card = Object.assign({}, cardData);
            //     card.domId = cardElement.id;
            //     card.index = deck[myId].length;
            //     deck[myId].push(card);
            //     myContainer.appendChild(cardElement);
                
            //     opponentDeck.push('unknown');
            //     opponentContainer.appendChild(unkonwn_Card.cloneNode(true));
            // }
            break;
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
                    opponentContainer.appendChild(card);
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
                opponentContainer.appendChild(opponentCard);
                opponentCard = new Card(opponentCard, 1);
                opponentDeck.push(opponentCard);
                i++;
            }
        default:
        break;
    }
    // init_Cards(myContainer.querySelectorAll('.card'));
    adjust_Card_Style(deck[myId].length, myContainer);
    // adjust_Card_Style(opponentDeck.length, opponentContainer);
    startCountdown(2*duration);
    closeSetting();
}

function update_Player_Data(id, resource, fn, value) {
    const player = roomInfo.players.find(p => p.id === id);
    if (player) {
        switch (fn) {
            case 'minus':
                player[resource] -= value;
            break;
            case 'add':
                player[resource] += value;
            break;
            default:
            case 'modify':
                player[resource] = value;
            break;
        }
        // console.log(resource + id)
        document.getElementById(resource + id).textContent = player[resource];
    }
}

function updateGameResult(myCard, opponentCard) {
    // console.log(myCard.value +" & "+ opponentCard.value);
    // document.getElementById('tempCard').classList.add('active');
    // setTimeout(() => {
    //     document.getElementById('tempCard').textContent = opponentCard.value;
    // }, 2000);
    // logic of result
    let result;
    if (myCard.value === opponentCard.value) {
        result = 'draw';
    } else if (parseInt(myCard.value) < parseInt(opponentCard.value)) {
        result = 'lose';
    } else {
        result = 'win';
    }
    
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
        // document.getElementById('myCardField').innerHTML = '<div class="field-label lan">'+language_Text['index'][28][config.language]+'</div>';
        // document.getElementById('opponentCardField').innerHTML = '<div class="field-label lan">'+language_Text['index'][29][config.language]+'</div>';
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
// // 示例调用函数（需在全局实现）
// function gainResources(resourceType, amount) {
//   console.log(`获得资源: ${amount} ${resourceType}`);
// }

// function healTarget(target, amount) {
//   console.log(`治疗目标: ${target}, 恢复 ${amount} 生命值`);
// }

// function summonUnit(unitType, attack, health) {
//   console.log(`召唤单位: ${unitType} (${attack}/${health})`);
// }

function randomInts(n, className) {
    return Array.from({length: n}, () => Math.floor(Math.random() * cardDatabase[className].length));
}

function turn_Settlement() {
    document.querySelector('#progress-line').classList.add('wait');
    document.querySelector('.dash-line').classList.add('active');
    document.querySelector('.shock-btn .fa-thunder').classList.add('active');
    document.querySelector('.shock-btn').disabled = true;
    activateCards(myId, 0, document.querySelector('#field'+myId).children.length - 1, 'ltr');

    if (parent_Node) {
        parent_Node.send(['turn_End', myId]);
    }
}

function turn_Start(startThunder, drawNumber) {
    document.querySelector('#progress-line').classList.remove('wait');
    resetCountdown();
    document.querySelector('.dash-line').classList.remove('active');
    document.querySelector('.shock-btn .fa-thunder').classList.remove('active');

    roomInfo.players.forEach(player => {
        player['thunder'] = startThunder;
        animateValue(document.getElementById('thunder'+player.id), 'glow', 'modify', startThunder);
    });
    cardEffects['drawCard'](myId, myId, ['all', drawNumber], undefined);

    startCountdown(duration);
    document.querySelector('.shock-btn').disabled = false;
    play_Card_Availible = true;
}
function test(r) {
    myId='w';
    roomInfo = {
        id: 'null',
        status: 'waiting',
        duration: 10000,
        range: r,
        mode: 'random',
        players: [
            { name: myName, avatar: myAvatar, status: "ready", team: myTeam, id: myId },
            { name: "空位", status: "empty", team: 'b', id: "a" }
            // { name: "空位", status: "empty", id: "b" }
        ]
    };
    openSetting();
    init_Game(roomInfo, 1);
}