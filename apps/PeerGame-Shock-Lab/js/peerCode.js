peer = new Peer({ debug: 2});
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
                    conns[0].send(['entry']);
                } else {
                    conns[1].send(['crowded']);
                    conns[1].close();
                    conns.splice(1, 1);
                    connIds.splice(1, 1);
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
                        } else { judgement = false}
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
            case 'info':    // join successfully
                roomInfo.players[roomInfo.players.length] = { avatar: data[1], name: data[2], id: data[3], status: 'not-ready' };
                conns[0].send(['joined']);
                updateRoomInfo(roomInfo);
            break;
            case 'played':
                opponent_Played_Card_Date_Index = data[1];
                // tempCard.id = "tempCard";
                // let tempCard = unkonwn_Card.cloneNode(true);
                // document.getElementById('opponentCardField').append(tempCard);
                const opponentCards = Array.from(opponentContainer.querySelectorAll('.card'));
                document.getElementById('opponentCardField').append(opponentCards[remove_Card_from_Deck(opponentDeck, 'index', opponentDeck[opponent_Played_Card_Date_Index].index, false, 'pos-undefined')]);
                adjust_Card_Style(opponentDeck.length, opponentContainer);
                // if (played_Card_Date_Index) {
                //     updateGameResult(deck[played_Card_Date_Index], opponentDeck[opponent_Played_Card_Date_Index]);
                // }
            break;
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
                parent_Node.send(['want', peer.id]);
            });
    
            parent_Node.on('data', (data) => {
                switch (data[0]) {
                    case 'entry':
                        conns[0] = false;   // prevent other connecting player & affecting judgement
                        parent_Node.send(['info', myAvatar, myName, myId]);
                    break;
                    case 'joined':
                        // style test
                        if (config['app_Mode']) {
                            pop_Msg('Connect successfully');
                        }

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
                        opponent_Played_Card_Date_Index = data[1];
                        // tempCard.id = "tempCard";
                        // let tempCard = unkonwn_Card.cloneNode(true);
                        // document.getElementById('opponentCardField').append(tempCard);
                        const opponentCards = Array.from(opponentContainer.querySelectorAll('.card'));
                        document.getElementById('opponentCardField').append(opponentCards[remove_Card_from_Deck(opponentDeck, 'index', opponentDeck[opponent_Played_Card_Date_Index].index, false, 'pos-undefined')]);
                        adjust_Card_Style(opponentDeck.length, opponentContainer);
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
