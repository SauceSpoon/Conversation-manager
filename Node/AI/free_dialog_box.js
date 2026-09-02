// 自由文本框：AI 对话框的输入区（textarea + 发送按钮）
// 职责：
//   1. 管理输入框 DOM 和发送按钮
//   2. 处理 Enter 发送 / Shift+Enter 换行
//   3. 通过 onSubmit(text) 回调把用户输入交出去
// 边界：不做业务逻辑（不调 AI、不写节点 content），只管"输入 + 发送事件"
// 由 AIDialogManager 创建并挂载到对话框底部
// 用法：
//   import { FreeDialogBox } from './free_dialog_box.js';
//   const box = new FreeDialogBox();
//   box.onSubmit = (text) => { ... };
//   container.appendChild(box.getRootElement());

export class FreeDialogBox {
  constructor() {
    this.onSubmit = null;  // (text) => void，由 AIDialogManager 注入业务逻辑
    this._buildDom();
    this._bindEvents();
  }

  _buildDom() {
    const root = document.createElement('div');
    root.className = 'ai-dialog-input-area';
    root.innerHTML = `
      <div class="ai-dialog-attach-mount"></div>
      <textarea class="ai-dialog-input" placeholder="输入消息，Enter 发送，Shift+Enter 换行" rows="2"></textarea>
      <button class="ai-dialog-send">发送</button>
    `;
    this.rootEl = root;
    this.inputEl = root.querySelector('.ai-dialog-input');
    this.sendBtn = root.querySelector('.ai-dialog-send');
    this.attachMount = root.querySelector('.ai-dialog-attach-mount');
  }

  _bindEvents() {
    const submit = () => {
      const text = this.inputEl.value.trim();
      if (!text) return;
      this.inputEl.value = '';
      // 只把文本交出去，业务逻辑由 AIDialogManager 在 onSubmit 里处理
      this.onSubmit?.(text);
    };
    this.sendBtn.addEventListener('click', submit);
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });
  }

  // 供 AIDialogManager 把输入区挂到对话框 DOM 里
  getRootElement() {
    return this.rootEl;
  }

  getValue() {
    return this.inputEl.value;
  }

  setValue(text) {
    this.inputEl.value = text;
  }

  // 供 file_facade 挂载附件 UI
  getAttachMount() {
    return this.attachMount;
  }

  clear() {
    this.inputEl.value = '';
  }

  focus() {
    this.inputEl.focus();
  }
}
