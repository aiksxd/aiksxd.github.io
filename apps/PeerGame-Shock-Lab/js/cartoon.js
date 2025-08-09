const particlesContainer = document.getElementById('particles');
// // 创建粒子效果
// function createParticles(element, isIncrease) {
//     // 清除之前的粒子
//     particlesContainer.innerHTML = '';
    
//     // 粒子颜色
//     const color = isIncrease ? '#7cfc00' : '#ff4d4d';
    
//     // 元素位置
//     const rect = element.getBoundingClientRect();
//     const centerX = rect.left + rect.width / 2;
//     const centerY = rect.top + rect.height / 2;
    
//     // 创建粒子
//     const particleCount = 30;
//     for (let i = 0; i < particleCount; i++) {
//         const particle = document.createElement('div');
//         particle.className = 'particle';
//         particle.style.background = color;
//         particle.style.boxShadow = `0 0 10px ${color}`;
//         particlesContainer.appendChild(particle);
        
//         // 随机位置
//         const angle = Math.random() * Math.PI * 2;
//         const distance = 50 + Math.random() * 100;
//         const startX = centerX;
//         const startY = centerY;
        
//         // 随机大小
//         const size = 2 + Math.random() * 6;
//         particle.style.width = `${size}px`;
//         particle.style.height = `${size}px`;
        
//         // 动画
//         const animation = particle.animate([
//             { 
//                 transform: `translate(${startX}px, ${startY}px) scale(1)`,
//                 opacity: 1
//             },
//             { 
//                 transform: `translate(${startX + Math.cos(angle) * distance}px, 
//                             ${startY + Math.sin(angle) * distance}px) scale(0)`,
//                 opacity: 0
//             }
//         ], {
//             duration: 700 + Math.random() * 600,
//             easing: 'cubic-bezier(0.2, 0, 0.8, 1)'
//         });
        
//         // 动画结束后移除元素
//         animation.onfinish = () => {
//             particle.remove();
//         };
//     }
// }

// 动画数字变化
function animateValue(dom, animation, fn, value) {
    let addClassName;
    if (dom) {
        switch (fn) {
            case 'add':
                dom.textContent = Number(dom.textContent) + value;
                addClassName = 'decrease';
            break;
            case 'minus':
                dom.textContent = Number(dom.textContent) - value;
                addClassName = 'increase';
            break;
            default:
            case 'modify':
                dom.textContent = value;
            break;
        }
    } else {return;}
    dom.classList.add(addClassName);
    dom.classList.add(animation + '-animation');
    // // 创建粒子效果
    // createParticles(dom, isIncrease);
    setTimeout(() => {
        dom.classList.remove(animation + '-animation');
        dom.classList.remove(addClassName);
    }, 1000);
}

// // 按钮事件监听
// addBtn.addEventListener('click', () => {
//     const current = parseInt(dom.textContent);
//     const newValue = current + Math.floor(Math.random() * 200) + 50;
//     animateValue(newValue);
// });

// subtractBtn.addEventListener('click', () => {
//     const current = parseInt(dom.textContent);
//     const newValue = Math.max(0, current - Math.floor(Math.random() * 200) - 50);
//     animateValue(newValue);
// });

// randomBtn.addEventListener('click', () => {
//     const current = parseInt(dom.textContent);
//     const change = Math.floor(Math.random() * 500) - 250;
//     const newValue = Math.max(0, current + change);
//     animateValue(newValue);
// });

// // 初始粒子效果
// setTimeout(() => {
//     createParticles(dom, true);
// }, 500);

/**
 * 在指定元素位置播放GIF动画
 * @param {HTMLElement} cardElement - 卡牌DOM元素
 * @param {string} gifUrl - GIF图片URL
 * @param {number} duration - GIF动画持续时间(毫秒)
 */
function playGifAnimation(card, gifUrl, duration) {
  // 1. 获取卡牌元素的位置和尺寸
  const cardElement = document.getElementById(card.domId);
  if (!cardElement) {
      return;
  }
  const rect = cardElement.getBoundingClientRect();
  
  // 2. 创建GIF容器
  const gifContainer = document.createElement('div');
  gifContainer.style.position = 'absolute';
  gifContainer.style.left = `${window.scrollX + rect.left}px`;
  gifContainer.style.top = `${window.scrollY + rect.top}px`;
  gifContainer.style.width = `${rect.width}px`;
  gifContainer.style.height = `${rect.height}px`;
  gifContainer.style.zIndex = '9999';
  gifContainer.style.pointerEvents = 'none';
  
  // 3. 创建GIF图像
  const gifImage = document.createElement('img');
  gifImage.src = gifUrl;
  gifImage.style.width = '100%';
  gifImage.style.height = '100%';
  gifImage.style.objectFit = 'cover';
  
  // 4. 添加到DOM
  gifContainer.appendChild(gifImage);
  document.body.appendChild(gifContainer);
  
  // 5. 设置移除动画的定时器
  setTimeout(() => {
    document.body.removeChild(gifContainer);
  }, duration);
  
  // 6. 窗口大小变化时重新定位
  const reposition = () => {
    const updatedRect = cardElement.getBoundingClientRect();
    gifContainer.style.left = `${window.scrollX + updatedRect.left}px`;
    gifContainer.style.top = `${window.scrollY + updatedRect.top}px`;
  };
  
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition);
  
  // 7. 清理事件监听器
  setTimeout(() => {
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition);
  }, duration);
}