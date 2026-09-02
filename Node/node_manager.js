import { NodeMenu } from './node_function/node_menu.js';
import { createNodeData, getPathToRoot, getPathText } from './Node_uid_pointer.js';
import { NodeUidDisplay } from './Node_uid_display.js';

export class NodeManager {
  constructor(view) {
    this.view = view;
    this.nodes = new Map();
    this.nodeLayer = document.getElementById('node-layer');
    this.contextMenu = document.getElementById('context-menu');
    this.pendingWorldPos = null;
    this.selectedUid = null;        // 当前选中节点 uid（单选）
    this._pathUids = new Set();     // 当前高亮路径上的所有节点 uid（从根到 selectedUid）
    this.onNodeChange = null;       // 节点增删改/移动/重设大小 → 触发保存
    this.onNodeSelected = null;     // 选中节点变化 → 触发 AI 面板刷新上下文
    this.onNodeDeleted = null;      // 节点删除 → 触发连线清理
    this.onAllNodesCleared = null;  // 清空所有节点 → 触发连线全部清理（批量，比逐个 onNodeDeleted 高效）
    this.uidDisplay = new NodeUidDisplay();  // 路径节点 uid 显示（纯读取检测）
    this.nodeMenu = new NodeMenu(this);
    this._initContextMenu();
  }

  _initContextMenu() {
    document.body.addEventListener('contextmenu', (e) => {
      const nodeEl = e.target.closest('.canvas-node');
      // 点在节点上：弹出节点菜单
      if (nodeEl) {
        e.preventDefault();
        const uid = nodeEl.dataset.uid;
        this.nodeMenu.show(uid, e.clientX, e.clientY);
        return;
      }
      if (e.target.closest('#sidebar')) return;
      if (e.target.closest('#bottom-toolbar')) return;
      e.preventDefault();
      this.pendingWorldPos = {
        x: e.clientX / this.view.scale + this.view.offsetX,
        y: e.clientY / this.view.scale + this.view.offsetY
      };
      this.contextMenu.style.left = e.clientX + 'px';
      this.contextMenu.style.top = e.clientY + 'px';
      this.contextMenu.style.display = 'block';
    });

    this.nodeLayer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item) return;
      if (item.dataset.action === 'create-node' && this.pendingWorldPos) {
        this.createNode(this.pendingWorldPos.x, this.pendingWorldPos.y);
      }
      this._hideMenu();
    });

    document.addEventListener('click', () => this._hideMenu());
  }

  _hideMenu() {
    this.contextMenu.style.display = 'none';
  }

  // 选中某节点（传 null 则取消选中）
  // 效果：选中节点本身深蓝色高亮；从根到选中节点路径上的所有节点淡蓝色标记
  selectNode(uid) {
    if (this.selectedUid === uid) return;

    // ① 清除旧路径所有节点的 in-path 样式 + 隐藏 uid 标签
    for (const oldPathUid of this._pathUids) {
      const oldEl = this.nodeLayer.querySelector(`[data-uid="${oldPathUid}"]`);
      if (oldEl) {
        oldEl.classList.remove('in-path');
        this.uidDisplay.hide(oldEl);
      }
    }
    this._pathUids.clear();

    // ② 清除旧选中节点的样式
    if (this.selectedUid) {
      const oldSel = this.nodeLayer.querySelector(`[data-uid="${this.selectedUid}"]`);
      if (oldSel) oldSel.classList.remove('selected');
    }

    this.selectedUid = uid;

    if (uid) {
      // ③ 计算新路径（根 → 当前），给路径节点加 in-path + 显示 uid 标签
      const path = getPathToRoot(uid, this.nodes);
      for (const n of path) {
        this._pathUids.add(n.uid);
        const el = this.nodeLayer.querySelector(`[data-uid="${n.uid}"]`);
        if (el) {
          el.classList.add('in-path');
          this.uidDisplay.show(el);
        }
      }
      // ④ 选中节点加 selected（优先级高于 in-path，视觉上更深）
      const newSel = this.nodeLayer.querySelector(`[data-uid="${uid}"]`);
      if (newSel) newSel.classList.add('selected');
    }

    this.onNodeSelected?.(uid);
  }

  // 获取从根到某节点的路径节点数组（根在前）
  getNodePath(uid = this.selectedUid) {
    if (!uid) return [];
    return getPathToRoot(uid, this.nodes);
  }

  // 获取从根到某节点的 AI 格式化文本（默认前缀 "user在节点xx的内容："）
  // options 透传给 getPathText：{ nodeTemplate, separator }
  getNodePathText(uid = this.selectedUid, options = undefined) {
    if (!uid) return '';
    return getPathText(uid, this.nodes, options);
  }

  createNode(worldX, worldY, uid = null, content = '', parentUid = null) {
    const node = createNodeData(worldX, worldY, uid, content, parentUid);
    this.nodes.set(node.uid, node);
    this._renderNode(node, !uid);
    this.onNodeChange?.();
    return node;
  }

  _renderNode(node, focus = true) {
    const el = document.createElement('div');
    el.className = 'canvas-node';
    el.dataset.uid = node.uid;

    const content = document.createElement('div');
    content.className = 'node-content';
    content.contentEditable = true;
    content.spellcheck = false;
    if (node.content) {
      content.textContent = node.content;
    }
    content.addEventListener('input', () => {
      node.content = content.textContent;
      this.onNodeChange?.();
    });
    content.addEventListener('mousedown', (e) => e.stopPropagation());
    // 节点内滚动只滚动节点内容，不触发画布缩放
    content.addEventListener('wheel', (e) => e.stopPropagation(), true);

    const resizerBottom = document.createElement('div');
    resizerBottom.className = 'node-resizer-bottom';
    resizerBottom.title = '拖动调整高度';

    const resizerCorner = document.createElement('div');
    resizerCorner.className = 'node-resizer-corner';
    resizerCorner.title = '拖动调整宽高';

    // 节点选中：点击节点任何位置（包括内容区）立刻高亮选中
    // resize 手柄的 mousedown 已 stopPropagation，不会冒泡到 el.click，所以不会误触发
    el.addEventListener('click', () => {
      this.selectNode(node.uid);
    });

    el.appendChild(content);
    el.appendChild(resizerBottom);
    el.appendChild(resizerCorner);
    // 创建 uid 显示标签（默认隐藏，选中路径时才显示）
    this.uidDisplay.createLabel(node, el);
    this.nodeLayer.appendChild(el);

    // 恢复节点时，同步样式（选中态 & 路径态）
    if (this.selectedUid === node.uid) {
      el.classList.add('selected');
    }
    if (this._pathUids && this._pathUids.has(node.uid)) {
      el.classList.add('in-path');
    }

    this._updatePosition(node);
    this._addResizeHandlers(node, el, resizerBottom, resizerCorner);
    if (focus) content.focus();
  }

  _addResizeHandlers(node, el, bottomHandle, cornerHandle) {
    let startMouseX = 0, startMouseY = 0;
    let startW = 0, startH = 0;
    let direction = null;

    const onMouseMove = (e) => {
      const dx = (e.clientX - startMouseX) / this.view.scale;
      const dy = (e.clientY - startMouseY) / this.view.scale;

      if (direction === 'bottom') {
        node.height = Math.max(44, startH + dy);
      } else if (direction === 'corner') {
        node.width = Math.max(140, startW + dx);
        node.height = Math.max(44, startH + dy);
      }
      this._applySize(el, node);
    };

    const onMouseUp = () => {
      el.classList.remove('resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      direction = null;
      this.onNodeChange?.();
    };

    const startResize = (dir) => (e) => {
      e.stopPropagation();
      e.preventDefault();
      direction = dir;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startW = node.width;
      startH = node.height;
      el.classList.add('resizing');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    bottomHandle.addEventListener('mousedown', startResize('bottom'));
    cornerHandle.addEventListener('mousedown', startResize('corner'));
  }

  _applySize(el, node) {
    el.style.width = node.width + 'px';
    el.style.height = node.height + 'px';
  }

  deleteNode(uid) {
    this.nodes.delete(uid);
    const el = this.nodeLayer.querySelector(`[data-uid="${uid}"]`);
    if (el) el.remove();
    // 若删掉的是当前选中节点，或它在当前路径上 → 统一清空选中+路径（自动触发回调）
    if (this.selectedUid === uid || this._pathUids.has(uid)) {
      this.selectNode(null);
    }
    // 通知外部清理相关连线
    if (this.onNodeDeleted) this.onNodeDeleted(uid);
    this.onNodeChange?.();
  }

  // 清空所有节点（批量，比循环调 deleteNode 高效）
  // 职责：清 DOM、清 nodes Map、清选中态/路径、通知连线全部清理、保存空状态
  // 由 clear_all_node.js 编排（含 confirm 确认）后调用
  clearAll() {
    // ① 先保存所有 uid（级联清理用）
    const uids = Array.from(this.nodes.keys());
    this._lastAllUids = uids;
    // ② 移除所有节点 DOM
    for (const uid of uids) {
      const el = this.nodeLayer.querySelector(`[data-uid="${uid}"]`);
      if (el) el.remove();
    }
    // ② 清状态
    this.nodes.clear();
    this._pathUids.clear();
    this.selectedUid = null;
    // ③ 通知连线全部清理（批量，只 render 一次）
    this.onAllNodesCleared?.();
    // ④ 选中态变化 → 关闭 AI 对话框
    this.onNodeSelected?.(null);
    // ⑤ 保存空状态（走现有 onNodeChange → localStorage 链路）
    this.onNodeChange?.();
  }

  restoreNodes(data) {
    for (const n of data) {
      if (!this.nodes.has(n.uid)) {
        const node = {
          uid: n.uid,
          x: n.x,
          y: n.y,
          content: n.content || '',
          width: n.width || 200,
          height: n.height || 60,
          parentUid: n.parentUid || null
        };
        this.nodes.set(n.uid, node);
        this._renderNode(node, false);
      }
    }
    this.updateAllPositions();
  }

  _updatePosition(node) {
    const el = this.nodeLayer.querySelector(`[data-uid="${node.uid}"]`);
    if (!el) return;
    const sx = (node.x - this.view.offsetX) * this.view.scale;
    const sy = (node.y - this.view.offsetY) * this.view.scale;
    el.style.transform = `translate(${sx}px, ${sy}px) scale(${this.view.scale})`;
    this._applySize(el, node);
    // 节点位置变了，连线也要跟着刷新
    if (window._edgeRenderer) window._edgeRenderer.render();
  }

  updateAllPositions() {
    for (const node of this.nodes.values()) {
      this._updatePosition(node);
    }
  }
}
