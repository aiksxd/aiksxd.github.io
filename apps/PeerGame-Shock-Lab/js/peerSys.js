let roomIds, guests, pop_Doms, temporaryChosedNodes, audiences, audienceIds, conns, connIds, nodesMap, childNodes, rooms, liveHostIds, hereNode = new Array();
let conferee, guest, parent_Node, deliverId, conn, ifHitAim, lastAimId, lastLayerNumber, awaitedNodeId, myid, roomPosition;
let lastPopIndex = 0;
let layers = [0];
let changingparent_NodeConnection = false;
let ifIndex = true;//todo
let ifConnectedAim = false;


function tryConnect(object, id, ifJump, ifAskForMediaStream){
    // object:
    // 0: parent_Node
    // 1: guest
    // 3: hostRoot
    // 4: indexRoot
    switch (object) {
        case 'parent_Node':
            // Close old connection
            if (parent_Node) {
                parent_Node.close();
                // [ mark of sorting, myId, number of who be effected, if keep parent_Node firmly here ]
                // liveSend([3, peer.id, 0, false]);     // remind child node change parent_NodeNode
            }
            parent_Node = peer.connect(id);

            parent_Node.on('open', () => {
                // changingparent_NodeConnection = false;
                parent_Node.send(hereNode);
                document.getElementById("status").textContent="Status:✔ Connected to Live Room Successfully! ✔"
                appearMsg([ 0, null, res_Strings['fn'][0][config['language']], res_Strings['fn'][1][config['language']]]);
            });
            
            // parent_Node.on('error', (err) => {
            //     document.getElementById("status").textContent="Status: Connecting Failed!" + err;
            // });

            // Receive the reply of text: Host --> Guset
            parent_Node.on('data', (data) => {
                // data[0]:
                //  0: msg
                //  1: nodeInfo or indexRoomInfo
                //  2: streaming request
                //  3: for reconnect: Remind the child node to replace the parent_Node node
                //  4: for refresh: apply to the new media Stream for daliver to child
                switch (data[0]) {
                    case 0:
                        // console.log('Received data:', data); // DEBUG
                        deliverId = data[1];
                        data[1] = peer.id;  // make sure msg[2] keep last id of deliver
                        
                        if ( liveSend(data) > 0 ) {
                            console.log("Msg delivered successfully: " + data);
                        }else{console.log('Msg delivered failed');}
                        
                        appearMsg(data);
                        break;
                    case 1:
                        if (nodesMap[11]) {
                            if (!data[11]) {
                                // stop conference
                                let i = 1;  // without first dom [0]
                                while (i < nodesMap[11][0].length) {
                                    if (nodesMap[11][0][i]) {
                                        document.getElementById('conferees'+ nodesMap[11][0][i]).remove();
                                    }
                                    i++;
                                }
                                my_Conferee_Index = null;
                                my_Conferee_Stream_Id = null;
                                if(conference_Stream){
                                    conference_Stream.getTracks().forEach(track => track.stop());
                                }
                                conference_Stream = null;
                                document.getElementById("joinConference").checked = false;
                            }
                        }
                        recorder(data);
                        break;
                    case 3:     // remind reconnect
                        if(data[2] > 0 && data[3] == true){     // test to do
                            // if it isn't the first node without correct parent_Node node
                            // -> didn't auto changing the parent_Node node
                            RemoteVideo.src = null;
                            remoteStream = null;
                            data[2]++;
                            // optional setting
                            // if(data[2]%5 == 0){
                            //     autoJoin(nodesMap, 2, 0);
                            // }
                            liveSend(data);
                            document.getElementById("status").textContent=res_Strings['fn'][2][config['language']];
                            // get the new nodeMap
                            // guest = peer.connect(nodesMap[7])
                            // guest.on('data', (data) => {
                            //     nodesMap = data;
                            //     autoJoin(3, false, true);
                            //     guest.close();
                            // });
                            break;
                        }
                        // changingparent_NodeConnection = true;
                        parent_Node.close();
                        if(document.getElementById('ifAutoReconnect').checked){
                            data[2]++;   // report child nodes await parent_Node autoReConntect room
                            liveSend(data);
                            // get the new nodeMap
                            guest = peer.connect(nodesMap[7]);
                            guest.on('open', () => {});
                            guest.on('data', (data) => {
                                nodesMap = data;
                                autoJoin(max_Child_Nodes, false, true);
                            });
                            peer.on('close', function() { 
                                if (!ifConnectedAim) {
                                    autoJoin(max_Child_Nodes, false, true);
                                }
                            });
                        } else {
                            data[3] = true;
                            liveSend(data);
                        }
                        break;
                    case 4:
                        switch (data[1]) {
                            case 0:    
                                // if deliver without meida stream
                                if(awaitedNodeId){
                                    if(connIds.includes(awaitedNodeId)){
                                        conns[connIds.indexOf(awaitedNodeId)].send([4]);
                                        awaitedNodeId = null;
                                    }
                                } else {
                                    alert(res_Strings['fn'][3][config['language']]);
                                }
                                break;
                            default:
                                // remind new stream
                                parent_Node.send([4, peer.id]);
                                data[1] = peer.id;
                                liveSend(data);
                                break;
                        }
                    case 5:
                        switch (data[1]) {
                            case 1:      // append conferee dom
                                // console.log("parent get:"+data);  // debug
                                deliverId = parent_Node.peer;
                                liveSend(data);
                                if (document.getElementById("joinConference").checked) {
                                    console.log("parent get:"+data[2]);  // debug
                                    let new_Conferee = data[2];     // [index, id, name]
                                    if (new_Conferee[1] === peer.id) {
                                        my_Conferee_Index = new_Conferee[0];
                                        let i = 1;
                                        while (i < nodesMap[11][1].length) {
                                            if (nodesMap[11][1][i] && (nodesMap[11][1][i] !== peer.id)) {
                                                tryConnect(2, nodesMap[11][1][i]);
                                            }
                                            i++;
                                        }
                                        console.log("parent get:"+ my_Conferee_Index);  // debug
                                        append_Conferee_Dom();
                                    } else {
                                        append_Conferee_Dom(new_Conferee);
                                    }
                                }
                                break;
                            case 2:     // delete conferee dom  [5, 2, 1, index, id]
                            switch (data[2]) {
                                case 0:
                                    // if (last_Date === data) {     // clean repeat msg todo
                                    //     break;
                                    // }
                                    parent_Node.send(data);
                                    break;
                                case 1:
                                    deliverId = parent_Node.peer;
                                    liveSend(data);
                                    if (my_Conferee_Index) {
                                        document.getElementById('conferees'+ data[3]).remove();
                                        if (data[4]) {
                                            let i = 0;
                                            while (i < conferee_Nodes.length) {
                                                if (conferee_Nodes[i]) {
                                                    if (conferee_Nodes[i].peer === data[4]) {
                                                        conferee_Nodes[i].close();
                                                        conferee_Nodes.splice(i, 1);
                                                        break;   // bug todo
                                                        i--;
                                                    }
                                                }
                                                i++;
                                            }
                                        }
                                    }
                                default:
                                    break;
                            }
                                break;
                            default:
                                break;
                        }
                        break;
                    default:
                        console.log("unknown data: " + data);
                }
            });

            parent_Node.on('close', () => {
                document.getElementById("status").textContent=res_Strings['fn'][4][config['language']];

                if(document.getElementById("ifAutoReconnect").checked){
                    document.getElementById("status").textContent=res_Strings['fn'][5][config['language']];
                    autoJoin(max_Child_Nodes, false, true);
                    
                }
            });
            break;
        case 'guest':
            if(guest){if(guest.open){
                guest.close();
            }}
            guest = peer.connect(id);
            
            if(ifJump){
                guest.on('open', () => {
                    for(let i=0; i<guests.length; i++){
                        guest = guests[i];
                        guests = new Array();   // break all of conn
                        ifConnectedAim = true;  // break search node
                        switch (nodesMap[3]) {  // room type
                            case 0:
                                if (ifJump === 2) {
                                    if (config['app_Mode']) {
                                        window.parent.postMessage(['jump', app_Info['app_Name'], app_Info['app_Id'], "apps/PeerLive/audience.html?id="+ guest.peer +"&name=&themeIndex="+ config['theme_Index']]);
                                    } else {
                                        window.open("./audience.html?id="+ guest.peer +"&name=&themeIndex="+ config['theme_Index']);
                                    }
                                } else {    // index entry
                                    document.location.href = "./audience.html?id="+ guest.peer +"&name="+ getMyName() + "&themeIndex="+ config['theme_Index'];
                                }
                                break;
                            case 1:
                                alert(res_Strings['fn'][6][config['language']] + "p2pOnlineGame-Tic-Tac-Toe");
                                // if (ifJump === 2) {
                                //     if (config['app_Mode']) {
                                //         window.parent.postMessage(['jump', app_Info['app_Name'], app_Info['app_Id'], "apps/PeerLive/audience.html?id="+ guest.peer +"&name=&themeIndex="+ config['theme_Index']]);
                                //     } else {
                                //         window.open("./P2PGameFiveOnLinePlayer.html?id="+ guest.peer +"&name=&themeIndex="+ config['theme_Index']);
                                //     }
                                // } else {
                                //     document.location.href = "./P2PGameFiveOnLinePlayer.html?id="+ guest.peer +"&name="+ getMyName() + "&themeIndex="+ config['theme_Index'];
                                // }
                                break;
                            default:
                                console.log(res_Strings['fn'][6][config['language']]+ nodesMap[3]);
                                break;
                        }
                        ifConnectedAim = false;
                        // console.log("aim id of node: "+ guest.peer)  // DEBUG
                        break;
                    }
                });
                if(! ifConnectedAim){
                    guests.push(guest);
                }
            } else {
                if(ifAskForMediaStream){
                    guest.on('open', () => {
                        guest.send([2, peer.id, getMyName()]);
                    });
                    
                    peer.on('call', (mediaConnection) => {
                        // Receive the stream
                        mediaConnection.on('stream', (stream) => {
                            localStream = stream;
                            if( ! document.getElementById("ifNotDisplayLocalStream").checked){
                                displayStream(stream);
                            }
                        });
                        mediaConnection.answer(null);
                    });
                } else {        // reconnect & autoJoin() 
                    guest.on('data', (data) => {
                        for(let i=0; i<guests.length; i++){
                            if(guests[i].open){     // maybe useless
                                guest = guests[i];
                                guests = new Array();   // break all of conn
                                nodesMap = data;
                                ifConnectedAim = true;
                                guest.on('data', () => {
                                    ifConnectedAim = false;
                                });

                                break;
                            }
                        }
                    });
                    if(! ifConnectedAim){
                        guests.push(guest);
                    }
                }
            }
            break;
        case 'conferee':
            // if (conferee) {
            //     conferee.close();
            // }
            conferee = peer.connect(id);
            console.log("try to connect(in conference)"+id)//debug
            conferee_Nodes.push(conferee);
            
            conferee.on('open', () => {
            });
            
            conferee.on('data', (data) => {
                switch (data[1]) {
                    case 2:
                        parent_Node.send(data);
                        break;
                    case 3:   // [5,3, my_Conferee_Index, my_Conferee_Stream_Id, myIcon, getMyName()]);
                        // console.log("conference[3]:"+data)  //debug
                        if (data[3]) {      // stream & choose one of img and stream
                            nodesMap[11][3][data[2]] = data[3];
                            if (!parent_Node) {  // for host
                                conferee_Map[3][data[2]] = data[3];
                            }
                            console.log("conference[3]:"+data[3])  //debug
                        } else if (data[4]){    // img
                            document.getElementById('conferees'+ data[2]).getElementsByClassName('confereeIcon')[0].src = data[4];
                            document.getElementById('conferees'+ data[2]).getElementsByClassName('confereeVideos')[0].classList.add('covert');
                            document.getElementById('conferees'+ data[2]).getElementsByClassName('confereeVideos')[0].srcObject = null;
                            document.getElementById('conferees'+ data[2]).removeAttribute('src');   // empty source
                        }
                        if (data[5]){    // name
                            document.getElementById('conferees'+ data[2]).getElementsByClassName('confereeName')[0].textContent = data[5];
                            nodesMap[11][2][data[2]] = data[5];
                            if (!parent_Node) {  // for host
                                conferee_Map[2][data[2]] = data[5];
                                liveSend(nodesMap);
                            }
                        }
                        let source_Id = nodesMap[11][1][nodesMap[11][0].indexOf(data[2])];
                        console.log('get info from'+ source_Id)//debug
                        let i = 0;
                        while (i < conferee_Nodes.length) {
                            if (conferee_Nodes[i]) {
                                if (conferee_Nodes[i].open && (conferee_Nodes[i].peer === source_Id)) {
                                    if (conference_Stream) {
                                        conferee_Nodes[i].send([5,3, my_Conferee_Index, conference_Stream.id, null, getMyName()]);
                                        peer.call(conferee_Nodes[i].peer, conference_Stream);
                                    } else if (myIcon) {
                                        conferee_Nodes[i].send([5,3, my_Conferee_Index, null, myIcon, getMyName()]);
                                    } else {
                                        conferee_Nodes[i].send([5,3, my_Conferee_Index, null, null, getMyName()]);
                                    }
                                    break;
                                }
                            }
                            i++;
                        }
                        break;
                    default:
                        break;
                }
            });

            conferee.on('close', () => {
                if (my_Conferee_Index) {
                    let t = 0;
                    while (t < conferee_Nodes.length) {
                        if (conferee_Nodes[t]) {
                            if (!conferee_Nodes[t].open) {
                                if (nodesMap[11][1].includes(conferee_Nodes[t].peer)) {
                                    if (parent_Node) {
                                        if ((!nodesMap[11][1].includes(nodesMap[7])) && (nodesMap[7] !== conferee_Nodes[t].peer) && parent_Node.open) {
                                            // console.log((!nodesMap[11][1].includes(nodesMap[9])) +"&&"+ nodesMap[7] +"=="+ conferee_Nodes[i].peer)  //debug
                                            parent_Node.send([5, 2, 0, nodesMap[11][0][nodesMap[11][1].indexOf(conferee_Nodes[t].peer)], conferee_Nodes[t].peer]);
                                            console.log('disconnected:'+conferee_Nodes[t].peer+'\nIndex='+nodesMap[11][0][nodesMap[11][1].indexOf(conferee_Nodes[t].peer)])//debug
                                        }
                                    } else {
                                        let delete_index = nodesMap[11][1].indexOf(conferee_Nodes[t].peer);
                                        console.log("close"+delete_index);  //debug
                                        let delete_Conference_Index = nodesMap[11][0][delete_index];
                                        if (delete_index !== -1) {
                                            liveSend([5, 2, 1, delete_Conference_Index, conferee_Nodes[t].peer]);   // dieliver msg to audience yo update date
                                            let i = 0;
                                            while (i < conferee_Map.length) {
                                                conferee_Map[i][delete_index] = null;     // leave blank
                                                i++;
                                            }
                                            nodesMap[11] = conferee_Map;
                                            liveSend(nodesMap);
                                            i = 0;
                                            while (i < conferee_Nodes.length) {
                                                if (conferee_Nodes[i]) {
                                                    if (conferee_Nodes[i].peer === conferee_Nodes[t].peer) {
                                                        conferee_Nodes[i].close();
                                                        conferee_Nodes.splice(i, 1);
                                                        break;   // bug todo
                                                        i--;
                                                    }
                                                }
                                                i++;
                                            }
                                            document.getElementById('conferees'+ delete_Conference_Index).remove();
                                        }
                                    }
                                }
                            }
                        }
                        t++;
                    }
                }
            });
            // alert("try to connect someone in rooms");
            break;
        case 'hostRoot':     // 3: hostRoot
            // Close old connection
            if (root) {
                root.close();
            }

            root = peer.connect(id);

            document.getElementById("status").textContent=res_Strings['fn'][7][config['language']];
                
            root.on('open', () => {
                nodesMap[10] = root.peer;
                root.send(nodesMap);
                document.getElementById("status").textContent=res_Strings['fn'][8][config['language']];
            });
            
            root.on('close', () => {
                document.getElementById("status").textContent=res_Strings['fn'][9][config['language']];
                // if(document.getElementById("ifAutoReconnect").checked){
                //     document.getElementById("status").textContent="Status: Reconnecting to last Root Node...";
                    
                //     tryConnect(0, urlInfo[0], false);
                // }
            });
            break;
        case 'root':     // for Index
            // Close old connection
            if (root) {
                root.close();
            }
            if(connectHistroy.slice(-1)[0] != document.getElementById("peerId").value){
                connectHistroy.push(document.getElementById("peerId").value);
            }
            root = peer.connect(id);
            
            document.getElementById("status").textContent=res_Strings['fn'][7][config['language']];
            setTimeout(function() {
                if (root) {    
                    if (!root.open) {
                        document.getElementById("modifyNetWorkName").textContent=res_Strings['fn'][10][config['language']];
                    }
                }
            }, 3000);
            
            root.on('open', () => {
                if (document.getElementById('modifyNetWorkName').style.opacity == 1) {
                    pop(document.getElementById('modifyNetWorkName'));
                }
                peer_Conn_Lock = false;
                document.getElementById("myid").textContent = res_Strings['fn'][11][config['language']] + peer.id;
                document.getElementById("status").textContent= res_Strings['fn'][12][config['language']];
            });

            // Receive the reply of text: Host --> Guset
            root.on('data', (data) => {
                // Info of rooms from root received
                rooms = data;
                appearRooms();
                console.log("Room list received");
            });

            root.on('close', () => {
                // root = null;
                document.getElementById("status").textContent=res_Strings['fn'][8][config['language']];
                document.getElementById("connectRoot").style.visibility = 'visible';
                // if(document.getElementById("ifAutoReconnect").checked){
                //     document.getElementById("status").textContent="Status: Reconnecting to last Root Node...";
                    
                //     tryConnect(4, connectHistroy.slice(-1)[0], false);
                //     // document.getElementById("status").textContent="Status: Root Reconnection Failed!";
                // }
            });
            break;
        default:
            console.log("unknown object");
            break;
    }
}

// Send Massage and avoid delivering repeatedly
function liveSend (msg){
    let aims = 0;     // count successful times
    let source = NaN;
    if(msg instanceof Array){
        // if(msg[0] && msg[0] instanceof Number && (!msg[1] instanceof Number)){
        if((msg[0] instanceof Number) && (msg[1] instanceof String)){   // [number, idA, ...] => don't send to idA
            source = msg[1];    // mark source id for send data in a single direction
        }
    }
    if(parent_Node){
        if( ! [source, deliverId].includes(parent_Node.peer)){    // Promise a stable sending
            if(parent_Node.open){     // check the data channel
                parent_Node.send(msg);
                aims++;  // count successful times
            }
        }
    }
    if(audiences){
        for(let i=0; i<audiences.length; i++){
            if(audiences[i]){
                if( ! [source, deliverId /*, parent_Node.id */].includes(audiences[i].peer)){
                    if(audiences[i].open){
                        audiences[i].send(msg);
                        aims++;
                    }
                }
            }
        }
    }
    deliverId = null;    // avoid losing text when sending
    return aims;    //if == zero => send failed
}