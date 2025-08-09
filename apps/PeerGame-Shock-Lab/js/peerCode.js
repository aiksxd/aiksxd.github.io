peer = new Peer({ debug: 2});
let player_Conns = [];
let player_ConnIds = [];

peer.on('open', (id) => {
    myId = id;
    roomInfo.id = myId;
    document.getElementById('currentRoomId').textContent = myId;
});

peer.on('connection', (conn) => {
    connIds.push(conn.peer);
    conns.push(conn);

    conn.on('open', () => {
        console.log('Connection established with:', conn.peer);
    });
    
    // Receive the text: Host <-- Guest
    conn.on('data', (data) => {
        switch (data[0]) {
            case 'want':
                if (conns.length < config['max_Players']) {
                    let source = conns.find(c => c.peer === data[1]);
                    if (source) {
                        source.send(['joined', minTeam]);
                        player_Conns.push(source);
                        player_ConnIds.push(data[1]);

                        let minTeam = 'b';  // todo
                        roomInfo.players[roomInfo.players.length] = { avatar: '', name: data[1], team: minTeam, id: data[2], status: 'not-ready' };
                        updateRoomInfo(roomInfo);
                    } else {
                        console.log('unknown playerId'+data[1]);
                        return;
                    }
                } else {
                    for (let i = config['max_Players'] - 1; i < conns.length; i++) {
                        conns[i].send(['crowded']);
                        conns[i].close();
                        conns.splice(config['max_Players'] - 1, 1);
                        connIds.splice(config['max_Players'] - 1, 1);
                    }
                }
            break;
            case 'avatar':
                let source = roomInfo.players.find(p => p.id === data[1]);
                if (source) {
                    source.avatar = data[2];
                    updateRoomInfo(roomInfo);
                } else {
                    console.log('unknown playerId'+data[1]);
                    return;
                }
            break;
            case 'ready':
                if (data[1] === true) { // more player todo
                    roomInfo.players[1].status = 'ready';
                } else {
                    roomInfo.players[1].status = 'not-ready';
                }
                updateRoomInfo(roomInfo);
                
                if (roomInfo.players.length >= config['min_Players']) {
                    let judgement = true;
                    roomInfo.players.forEach(player => {
                        if (player.status === 'ready') {
                        } else { judgement = false; }
                    });
                    if (judgement) {
                        roomInfo.status = 'playing';
                        updateRoomInfo(roomInfo);
                        setTimeout(() => {
                            let turn = Math.random();
                            conns[0].send(['start', Math.round(1-turn)]);
                            init_Game(roomInfo, Math.round(turn));
                        }, 2000);
                    }
                }
            break;
            case 'played':
                broadcast(data[1], data);
                opponent_Played_Card_Date_Index = data[2];
                const opponentCards = Array.from(opponentContainer.querySelectorAll('.card'));
                document.getElementById('field'+data[1]).append(opponentCards[operate_Card_from_Deck(opponentDeck[data[1]], 'index', opponentDeck[data[1]][opponent_Played_Card_Date_Index].index, false, 'pos-undefined')]);
                adjust_Card_Style(opponentDeck[data[1]].length, opponentContainer);
            break;
            case 'draw':
                broadcast(data[1], data);
                drawCard(data[1], data[2], data[3]);
            break;
            case 'turn_End':
                let player = roomInfo.players.find(p => p.id === data[1]);
                player.status = 'turn_End';
                let judgement = true;
                
                roomInfo.players.forEach(player => {
                    if (player.status !== 'turn_End') {
                    } else { judgement = false; return;}
                });
                
                if (judgement) {
                    turns += 1;
                    broadcast(myId, ['next_Turn', turns + roomInfo.range, turns]);
                    turn_Start(turns + roomInfo.range, turns);
                } else {
                    return;
                }
            break;
            default:
                console.log("unknown data: " + data);
        }
    });

    conn.on('close', () => {
        if (!conns[0].open) {
            if (config['app_Mode']) {
                pop_Msg(res_Strings['card'][18][config.language]);
            } else {
                alert(res_Strings['card'][18][config.language]);
            }
        }
    });
});

function tryToConnect(object, id) {
    switch (object) {
        case 'parent':
            if (parent_Node) {
                parent_Node.close();
                // [ mark of sorting, myId, number of who be effected, if keep parent_Node firmly here ]
                // liveSend([3, peer.id, 0, false]);     // remind child node change parent_NodeNode
            }
            parent_Node = peer.connect(id);

            parent_Node.on('open', () => {
                parent_Node.send(['want', myName, myId]);
            });
    
            parent_Node.on('data', (data) => {
                switch (data[0]) {
                    case 'joined':
                        conns[0] = false;   // prevent other connecting player & affecting judgement
                        // style test
                        if (config['app_Mode']) {
                            pop_Msg('Connect successfully');
                        }
                        myTeam = data[1];
                        parent_Node.send(['avatar', myId, myAvatar]);

                        joinRoomBtn.innerHTML = '<i class="fas fa-check"></i> '+ res_Strings['card'][12][config.language];
                        joinRoomBtn.style.background = 'linear-gradient(135deg, #00c853, #1b5e20)';
                        document.getElementById('createRoomSection').classList.add('hide');
                        document.getElementById('roomInfoSection').classList.add('show');
                        document.getElementById('readyContainer').classList.add('show');
                    break;
                    case 'update':  // update RoomInfo
                        roomInfo = data[1];
                        updateRoomInfo(data[1]);
                    break;
                    case 'crowded':
                        if (config['app_Mode']) {
                            pop_Msg(res_Strings['card'][11][config.language]);
                        } else {
                            alert(res_Strings['card'][11][config.language]);
                        }
                        joinRoomBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> '+ res_Strings['card'][11][config.language];
                        joinRoomBtn.style.background = 'linear-gradient(135deg, #ff5252, #b71c1c)';
                        setTimeout(() => {
                            joinRoomBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> '+ res_Strings['card'][8][config.language];
                            joinRoomBtn.style.background = 'linear-gradient(135deg, #21cbf3, #1976D2)';
                        }, 3000);
                    break;
                    case 'start':
                        init_Game(roomInfo, data[1]);
                    break;
                    case 'played':
                        opponent_Played_Card_Date_Index = data[2];
                        const opponentCards = Array.from(opponentContainer.querySelectorAll('.card'));
                        document.getElementById('field'+data[1]).append(opponentCards[operate_Card_from_Deck(opponentDeck[data[1]], 'index', opponentDeck[data[1]][opponent_Played_Card_Date_Index].index, false, 'pos-undefined')]);
                        adjust_Card_Style(opponentDeck[data[1]].length, opponentContainer);
                    break;
                    case 'draw':
                        drawCard(data[1], data[2], data[3]);
                    break;
                    case 'next_Turn':
                        turn_Start(data[1], data[2]);
                    break;
                    default:
                        console.log("unknown data: " + data);
                }
            });

            parent_Node.on('close', () => {
                if (config['app_Mode']) {
                    pop_Msg(res_Strings['card'][18][config.language]);
                } else {
                    alert(res_Strings['card'][18][config.language]);
                }
                joinRoomBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> '+ res_Strings['card'][8][config.language];
                joinRoomBtn.style.background = 'linear-gradient(135deg, #21cbf3, #1976D2)';
                document.getElementById('createRoomSection').classList.remove('hide');
                document.getElementById('roomInfoSection').classList.remove('show');
                document.getElementById('readyContainer').classList.remove('show');
            });

            parent_Node.on('error', (err) => {
                console.error('Connection error:', err);
                joinRoomBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> '+ res_Strings['card'][10][config.language];
                joinRoomBtn.style.background = 'linear-gradient(135deg, #ff5252, #b71c1c)';
                setTimeout(() => {
                    joinRoomBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> '+ res_Strings['card'][8][config.language];
                    joinRoomBtn.style.background = 'linear-gradient(135deg, #21cbf3, #1976D2)';
                }, 3000);
            });
            break;
    
        default:
            break;
    }
}

function broadcast(sourceId, msg) {
    player_Conns.forEach(conn => {
        if (conn.peer !== sourceId) {
            conn.send(msg);
        }
    })
}