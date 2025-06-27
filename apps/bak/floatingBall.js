let isDragging = false;
class FloatingBall {
    constructor() {
        this.ball = document.getElementById('floatingBall');
        this.menu = document.getElementById('menu');
        this.toggleBtn = document.getElementById('toggleBtn');
        this.isMenuOpen = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.init();
    }
  
    init() {
      // 事件绑定
      this.ball.addEventListener('click', this.toggleMenu.bind(this));
      this.ball.addEventListener('mousedown', this.startDrag.bind(this));
      // document.addEventListener('mousemove', this.drag.bind(this));
      document.addEventListener('mouseup', this.endDrag.bind(this));
      this.toggleBtn.addEventListener('click', this.toggleBall.bind(this));
      document.addEventListener('click', this.closeMenu.bind(this));
    }
  
    toggleMenu(e) {
        e.stopPropagation();
        
        this.isMenuOpen = !this.isMenuOpen;
        this.menu.classList.toggle('show');
        this.adjustMenuPosition();
    }
  
    adjustMenuPosition() {
      const ballRect = this.ball.getBoundingClientRect();
      const menuWidth = this.menu.offsetWidth;
      const menuHeight = this.menu.offsetHeight;
      
      // 水平方向自适应
      if (ballRect.left + menuWidth > window.innerWidth) {
        this.menu.style.left = 'auto';
        this.menu.style.right = '100%';
      } else {
        this.menu.style.left = '100%';
        this.menu.style.right = 'auto';
      }
  
      // 垂直方向自适应
      if (ballRect.top + menuHeight > window.innerHeight) {
        this.menu.style.top = 'auto';
        this.menu.style.bottom = '0';
      } else {
        this.menu.style.top = '0';
        this.menu.style.bottom = 'auto';
      }
    }
  
    startDrag(e) {
      isDragging = true;
      this.initialX = e.clientX - this.currentX;
      this.initialY = e.clientY - this.currentY;
      this.ball.style.transition = 'none';
    }
  
    endDrag() {
        isDragging = false;
        this.ball.style.transition = 'transform 0.2s';
    }
  
    toggleBall() {
        const isVisible = this.ball.style.display !== 'none';
        this.ball.style.display = isVisible ? 'none' : 'block';
    }
  
    closeMenu(e) {
      if (!this.ball.contains(e.target)) {
        this.menu.classList.remove('show');
        this.isMenuOpen = false;
      }
    }
  }
  
  // 初始化
  new FloatingBall();
  
  // drag fn on index.js