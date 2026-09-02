// AI 对话开关（指示灯）
// 职责：
//   1. 管理 isAIEnabled 状态（默认开启）
//   2. 渲染灯 DOM（挂到对话框标题栏）
//   3. 提供 toggle() 方法供外部按键调用
// 边界：不处理按键监听（由 dialog manager 绑定），不处理发送逻辑（由 _handleSend 判断）

export class ProxySwitch {
  constructor() {
    this.isAIEnabled = true;
    this.onToggle = null;
    this._buildDOM();
  }

  _buildDOM() {
    this.el = document.createElement('div');
    this.el.className = 'ai-proxy-switch';
    this.el.title = 'AI 对话开关（T 键切换）';
    this.el.innerHTML = `
      <span class="ai-proxy-light" data-state="on"></span>
      <span class="ai-proxy-label">AI</span>
    `;
  }

  getElement() {
    return this.el;
  }

  toggle() {
    this.isAIEnabled = !this.isAIEnabled;
    this._updateUI();
    this.onToggle?.(this.isAIEnabled);
  }

  _updateUI() {
    const light = this.el.querySelector('.ai-proxy-light');
    if (light) light.dataset.state = this.isAIEnabled ? 'on' : 'off';
  }
}
