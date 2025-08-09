let healMultiplier = 1;
let dmgMultiplier = 1;

function costResource(sourceId, targetId, card) {
    let costs = {};
    let isEnough = true;
    let resourceNames = [];
    let player = roomInfo.players.find(p => p.id === targetId);

    for (const [resource, amount] of Object.entries(card.cost)) {
        costs[resource] = amount;
        resourceNames.push(resource);
    }
    // // check enough resource
    // resourceNames.forEach(resourceName => {
    //     // console.log(player[resourceName] +'<'+ costs[resourceName]);
    //     if(player[resourceName] < costs[resourceName]){
    //         return false;
    //     }
    // });
    // // consume
    // resourceNames.forEach(resourceName => {
    //     player[resourceName] -= costs[resourceName];
    //     animateValue(document.getElementById(resourceName+targetId), 'grow', 'minus', costs[resourceName]);
    // });
    // return true;
    
    // check enough resource
    resourceNames.forEach(resourceName => {
        // console.log(player[resourceName] +'<'+ costs[resourceName]);
        if(player[resourceName] < costs[resourceName]){
            isEnough = false;
        }
    });
    if (isEnough) {
        // consume
        resourceNames.forEach(resourceName => {
            player[resourceName] -= costs[resourceName];
            animateValue(document.getElementById(resourceName+targetId), 'grow', 'minus', costs[resourceName]);
        });
        return true;
    } else {
        return false;
    }
}

const cardEffects = {
    healTarget: (sourceId, targetId, args, card) => {
        let costs = {};
        for (const [resource, amount] of Object.entries(card.cost)) {
            costs[resource] = amount;
        }
        const healAmount = costs['thunder'] * healMultiplier * 0.5;
        roomInfo.players.find(p => p.id === targetId)['heart'] += healAmount;
        animateValue(document.getElementById('heart'+targetId), 'scale', 'add', healAmount);
    },
    drawCard: (sourceId, targetId, args, card) => {
        if (args[0] === 'all') {
            let i = 0;
            while (i < args[1]) {
                let randomClassName = cardDatabase['classNames'][randomInts(1, 'classNames')];
                let randomIndices = randomInts(1, randomClassName);
                drawCard(targetId, randomClassName, randomIndices);
                i++;
            }
        } else {
            drawCard(targetId, card_Class, card_Codes);
        }
    },
    damageTarget: (sourceId, targetId, args, card) => {
        targetId = opponentId;  // todo
        // 2. 直接使用 card.cost (避免冗余拷贝)
        const costs = card.cost;

        // 3. 核心计算逻辑
        let damageAmount = 0;
        const [action, ...groups] = args; // 解构参数

        switch (action) {
            case 'custome':
                for (const group of groups) {
                    const [operator, ...operands] = group;
                    const values = operands.map(operand => {
                        const [type, multiplier] = operand;
                        // 优先从costs取值，其次从card.var
                        const baseValue = costs[type] ?? card.var?.[type] ?? 0;
                        return baseValue * multiplier;
                    });

                    // 操作符处理
                    damageAmount += operator === 'multiply'
                        ? values.reduce((acc, val) => acc * val, 1)
                        : values.reduce((acc, val) => acc + val, 0);
                }
            break;

            case 'thunder':
                damageAmount = costs.thunder * (args[1] || 1);
            break;

            case 'fixed':
                damageAmount = args[1] * (args[2] || 1); // 明确乘数位置
            break;
        }
        roomInfo.players.find(p => p.id === targetId)['heart'] -= damageAmount;
        animateValue(document.getElementById('heart'+targetId), 'scale', 'minus', damageAmount);
    },
    setValue: (sourceId, targetId, args, card) => {
        switch (args[0]) {
            case 'set':
                card.var[args[0]] = args[1];
            break;
            case 'add':
                if (!card.var[args[0]]) {
                    card.var[args[0]] = 0;
                }
                card.var[args[0]] += args[1];
            break;
            case 'minus':
                if (!card.var[args[0]]) {
                    card.var[args[0]] = 0;
                }
                card.var[args[0]] -= args[1];
            break;
        
            default:
            break;
        }
    },
    playGifAnimation: (sourceId, targetId, args, card) => {
        playGifAnimation(
            card, 
            args[0],
            args[1]
        )
    },
    bounce: (sourceId, targetId, args, card) => {
        return args[0];
    }
};