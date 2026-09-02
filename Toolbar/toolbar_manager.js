export class ToolbarManager {
  constructor() {
    this.activeTool = null;
    this.listeners = [];
    this.toolbar = document.getElementById('bottom-toolbar');
  }

  // 注册一个工具按钮
  // icon: 文字或HTML（如 '✢'、'<svg>...</svg>'）
  // toolName: 工具标识（如 'move'、'connect'）
  addTool(icon, toolName) {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn';
    btn.innerHTML = icon;
    btn.title = toolName;
    btn.addEventListener('click', () => this.setActive(toolName));
    this.toolbar.appendChild(btn);
    return btn;
  }

  // 添加分隔线
  addDivider() {
    const div = document.createElement('div');
    div.className = 'toolbar-divider';
    this.toolbar.appendChild(div);
    return div;
  }

  // 设置当前激活工具
  setActive(toolName) {
    if (this.activeTool === toolName) {
      // 再次点击取消选中
      this.activeTool = null;
    } else {
      this.activeTool = toolName;
    }
    // 更新按钮高亮
    const buttons = this.toolbar.querySelectorAll('.toolbar-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.title === this.activeTool);
    });
    // 通知监听者
    this.listeners.forEach(cb => cb(this.activeTool));
  }

  // 获取当前工具
  getActive() {
    return this.activeTool;
  }

  // 监听工具切换
  onToolChange(callback) {
    this.listeners.push(callback);
  }
}
