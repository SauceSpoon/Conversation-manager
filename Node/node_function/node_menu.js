// 节点右键菜单：由 node_manager 注入功能（如删除），右击节点时弹出
import { createDeleteNode } from './delete_node.js';
import { createDerivedNode } from './create_derived_node.js';

export class NodeMenu {
  constructor(nodeManager) {
    this.nodeManager = nodeManager;
    this.menuEl = this._buildMenu();
    this._currentUid = null;
    this._bindGlobalClick();
  }

  // 注册功能（以后加"重命名""复制"等都通过这里加）
  _buildItems(uid) {
    return [
      createDerivedNode(this.nodeManager, uid),
      createDeleteNode(this.nodeManager, uid)
    ];
  }

  _buildMenu() {
    const menu = document.createElement('div');
    menu.id = 'node-menu';
    document.body.appendChild(menu);
    return menu;
  }

  _bindGlobalClick() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#node-menu')) this.hide();
    });
  }

  show(uid, clientX, clientY) {
    this._currentUid = uid;
    const items = this._buildItems(uid);

    this.menuEl.innerHTML = items.map((it, idx) =>
      `<div class="node-menu-item" data-idx="${idx}">
        <span class="node-menu-icon">${it.icon || ''}</span>
        <span>${it.name}</span>
      </div>`
    ).join('');

    this.menuEl.style.left = Math.min(innerWidth - 160, clientX) + 'px';
    this.menuEl.style.top = Math.min(innerHeight - items.length * 36 - 8, clientY) + 'px';
    this.menuEl.style.display = 'block';

    this.menuEl.querySelectorAll('.node-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = items[Number(btn.dataset.idx)];
        if (item) item.run();
        this.hide();
        e.stopPropagation();
      });
    });
  }

  hide() {
    this.menuEl.style.display = 'none';
    this._currentUid = null;
  }
}
