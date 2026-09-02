// 连线渲染器：在 canvas 上画节点之间的连线（父→子）
import { defaultEdgeStyle } from './edge_config.js';

export class EdgeRenderer {
  constructor(view) {
    this.view = view;
    this.edges = new Map();          // edgeId -> { uid, from, to }
    this._styleOverrides = new Map(); // edgeId -> partial style
    this._globalStyle = { ...defaultEdgeStyle };
    this.nodeManager = null;
    this.canvas = this._buildCanvas();
    this.ctx = this.canvas.getContext('2d');
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildCanvas() {
    const c = document.createElement('canvas');
    c.id = 'edge-layer';
    c.style.position = 'fixed';
    c.style.top = '0';
    c.style.left = '0';
    c.style.zIndex = '2';
    c.style.pointerEvents = 'none';
    document.body.appendChild(c);
    return c;
  }

  resize() {
    const dpr = devicePixelRatio || 1;
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.canvas.style.width = innerWidth + 'px';
    this.canvas.style.height = innerHeight + 'px';
    this.render();
  }

  setNodeManager(nodeManager) {
    this.nodeManager = nodeManager;
  }

  // 添加一条连线
  addEdge(fromUid, toUid) {
    const uid = `${fromUid}->${toUid}`;
    if (this.edges.has(uid)) return;
    this.edges.set(uid, { uid, from: fromUid, to: toUid });
    this.render();
  }

  // 删除涉及某节点的所有连线
  removeEdgesByNode(uid) {
    for (const [key, edge] of this.edges) {
      if (edge.from === uid || edge.to === uid) {
        this.edges.delete(key);
        this._styleOverrides.delete(key);
      }
    }
    this.render();
  }

  // 从数据恢复
  restoreEdges(edgesData) {
    this.edges.clear();
    this._styleOverrides.clear();
    for (const e of edgesData) {
      this.edges.set(e.uid, e);
    }
    this.render();
  }

  // 获取所有连线数据（供存储用）
  getEdges() {
    return Array.from(this.edges.values());
  }

  // ========== 样式接口 ==========

  // 修改全局样式（如 setGlobalStyle({ color: 'red' })）
  setGlobalStyle(partial) {
    this._globalStyle = { ...this._globalStyle, ...partial };
    this.render();
  }

  // 修改单条线样式（如 setEdgeStyle(edgeId, { color: '#1976d2', lineWidth: 3 })）
  setEdgeStyle(edgeId, partial) {
    this._styleOverrides.set(edgeId, { ...this._styleOverrides.get(edgeId), ...partial });
    this.render();
  }

  // 清除单条线覆盖，恢复全局样式
  clearEdgeStyle(edgeId) {
    this._styleOverrides.delete(edgeId);
    this.render();
  }

  // 获取某条线的最终样式（全局 + 覆盖）
  _getEffectiveStyle(edgeId) {
    const override = this._styleOverrides.get(edgeId);
    return override ? { ...this._globalStyle, ...override } : { ...this._globalStyle };
  }

  // ========== 渲染 ==========

  // 计算节点的屏幕中心点
  _getNodeCenter(uid) {
    if (!this.nodeManager) return null;
    const node = this.nodeManager.nodes.get(uid);
    if (!node) return null;
    const w = node.width || 200;
    const h = node.height || 60;
    const sx = (node.x - this.view.offsetX) * this.view.scale + (w * this.view.scale) / 2;
    const sy = (node.y - this.view.offsetY) * this.view.scale + (h * this.view.scale) / 2;
    return { x: sx, y: sy };
  }

  render() {
    if (!this.ctx) return;
    const dpr = devicePixelRatio || 1;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const edge of this.edges.values()) {
      const from = this._getNodeCenter(edge.from);
      const to = this._getNodeCenter(edge.to);
      if (!from || !to) continue;

      const style = this._getEffectiveStyle(edge.uid);
      this._drawEdge(from, to, style);
    }
  }

  _drawEdge(from, to, style) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = style.opacity;
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.arrowColor;
    ctx.lineWidth = style.lineWidth;

    if (style.dash) {
      ctx.setLineDash(style.dash);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);

    let endX = to.x, endY = to.y;
    let cp2x = to.x, cp2y = to.y;

    if (style.curveType === 'line') {
      ctx.lineTo(to.x, to.y);
      endX = to.x; endY = to.y;
    } else if (style.curveType === 'arc') {
      // 弧线：用二次贝塞尔模拟
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = dist * 0.2;
      const perpX = -dy / (dist || 1) * offset;
      const perpY = dx / (dist || 1) * offset;
      ctx.quadraticCurveTo(midX + perpX, midY + perpY, to.x, to.y);
      cp2x = midX + perpX;
      cp2y = midY + perpY;
      endX = to.x; endY = to.y;
    } else {
      // bezier（默认）
      cp2x = to.x;
      cp2y = from.y + (to.y - from.y) * 0.5;
      ctx.bezierCurveTo(from.x, from.y + (to.y - from.y) * 0.5, cp2x, cp2y, to.x, to.y);
      endX = to.x; endY = to.y;
    }

    ctx.stroke();

    // 箭头
    if (style.arrowSize > 0) {
      const angle = Math.atan2(endY - cp2y, endX - cp2x);
      const size = style.arrowSize;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - size * Math.cos(angle - Math.PI / 6),
        endY - size * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - size * Math.cos(angle + Math.PI / 6),
        endY - size * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
