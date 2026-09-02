// 菜单栏管理器
// 用法：
//   import { SidebarManager } from './Menu/sidebar_manager.js';
//   const sidebar = new SidebarManager();
//   sidebar.addButton('导入 JSON', () => { ... });
//   sidebar.addFooterButton('⚙ 设置');
//   sidebar.onWidthChange(() => { ... });

export class SidebarManager {
  constructor() {
    this.widthChangeCallbacks = [];
    this._buildDOM();
    this._initResizer();
  }

  _buildDOM() {
    this.wrap = document.createElement('div');
    this.wrap.id = 'sidebar-wrap';

    this.sidebar = document.createElement('div');
    this.sidebar.id = 'sidebar';

    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.textContent = '画布';

    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'sidebar-items';

    this.footer = document.createElement('div');
    this.footer.className = 'sidebar-footer';

    this.sidebar.appendChild(header);
    this.sidebar.appendChild(this.itemsContainer);
    this.sidebar.appendChild(this.footer);

    this.resizer = document.createElement('div');
    this.resizer.id = 'sidebar-resizer';
    this.resizer.title = '拖动调整宽度';

    this.wrap.appendChild(this.sidebar);
    this.wrap.appendChild(this.resizer);
    document.body.appendChild(this.wrap);
  }

  _initResizer() {
    let dragging = false;
    let startX = 0;
    let startW = 0;

    this.resizer.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startW = this.sidebar.offsetWidth;
      this.resizer.classList.add('active');
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
      e.stopPropagation();
    });

    addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const newW = Math.max(120, Math.min(480, startW + delta));
      this.sidebar.style.width = newW + 'px';
    });

    addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      this.resizer.classList.remove('active');
      document.body.style.cursor = '';
      this.widthChangeCallbacks.forEach(cb => cb(this.sidebar.offsetWidth));
    });
  }

  // 添加普通菜单按钮（顶部区域）
  addButton(label, callback) {
    const btn = document.createElement('button');
    btn.className = 'sidebar-btn';
    btn.textContent = label;
    btn.addEventListener('click', callback);
    this.itemsContainer.appendChild(btn);
    return btn;
  }

  // 添加底部按钮（如设置）
  addFooterButton(label, callback) {
    const btn = document.createElement('button');
    btn.className = 'sidebar-btn';
    btn.textContent = label;
    if (callback) btn.addEventListener('click', callback);
    this.footer.appendChild(btn);
    return btn;
  }

  // 获取侧边栏元素（供子模块定位用）
  getSidebarEl() {
    return this.sidebar;
  }

  // 宽度变化时回调
  onWidthChange(cb) {
    this.widthChangeCallbacks.push(cb);
  }
}
