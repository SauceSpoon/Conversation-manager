// 移动工具：激活后左键拖动节点
export class MoveTool {
  constructor(nodeManager, view) {
    this.nodeManager = nodeManager;
    this.view = view;
    this.active = false;
    this._dragging = false;
    this._dragNode = null;
    this._dragEl = null;
    this._startMouseX = 0;
    this._startMouseY = 0;
    this._startNodeX = 0;
    this._startNodeY = 0;
    this._bound = false;
  }

  setActive(active) {
    this.active = active;
    if (active && !this._bound) {
      this._bindEvents();
      this._bound = true;
    }
    // 切换光标
    document.body.style.cursor = active ? 'move' : '';
    document.body.classList.toggle('move-mode', active);
  }

  _bindEvents() {
    // 用捕获阶段，抢在 node_manager 的 stopPropagation 之前拿到事件
    document.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      if (e.button !== 0) return; // 只响应左键

      const nodeEl = e.target.closest('.canvas-node');
      if (!nodeEl) return;
      // 不拦截伸缩条
      if (e.target.closest('.node-resizer-bottom') || e.target.closest('.node-resizer-corner')) return;
      // 不拦截删除按钮
      if (e.target.closest('.node-delete')) return;

      const uid = nodeEl.dataset.uid;
      const node = this.nodeManager.nodes.get(uid);
      if (!node) return;

      e.preventDefault();
      e.stopPropagation();

      this._dragging = true;
      this._dragNode = node;
      this._dragEl = nodeEl;
      this._startMouseX = e.clientX;
      this._startMouseY = e.clientY;
      this._startNodeX = node.x;
      this._startNodeY = node.y;
      nodeEl.classList.add('dragging');
    }, true); // ← true = 捕获阶段

    document.addEventListener('mousemove', (e) => {
      if (!this._dragging || !this._dragNode) return;

      const dx = (e.clientX - this._startMouseX) / this.view.scale;
      const dy = (e.clientY - this._startMouseY) / this.view.scale;

      this._dragNode.x = this._startNodeX + dx;
      this._dragNode.y = this._startNodeY + dy;
      this.nodeManager._updatePosition(this._dragNode);
    });

    document.addEventListener('mouseup', () => {
      if (!this._dragging) return;

      this._dragging = false;
      if (this._dragEl) {
        this._dragEl.classList.remove('dragging');
      }
      this._dragNode = null;
      this._dragEl = null;
      this.nodeManager.onNodeChange?.();
    });
  }
}
