// 节点 uid 显示模块（纯读取检测）
// 职责：在路径高亮节点的底部显示/隐藏 uid 标签
// 边界：只操作 DOM 显隐，不碰节点数据（nodes Map）、不碰 parentUid 关系
// 调用方：node_manager.js
//   - _renderNode 时调 createLabel 创建标签（默认隐藏）
//   - selectNode 时调 show/hide 控制路径节点的 uid 显隐

export class NodeUidDisplay {
  // 为节点创建 uid 标签（默认隐藏，选中路径时才显示）
  // 参数：
  //   node —— 节点数据对象（取 node.uid 作为显示文本）
  //   el   —— 节点容器 DOM 元素（标签追加到其内部）
  createLabel(node, el) {
    const label = document.createElement('div');
    label.className = 'node-uid-label';
    label.textContent = node.uid.slice(0, 8);  // 只显示前 8 位，完整 uuid 太长
    label.style.display = 'none';
    el.appendChild(label);
  }

  // 显示某节点的 uid 标签
  show(el) {
    if (!el) return;
    const label = el.querySelector('.node-uid-label');
    if (label) label.style.display = 'block';
  }

  // 隐藏某节点的 uid 标签
  hide(el) {
    if (!el) return;
    const label = el.querySelector('.node-uid-label');
    if (label) label.style.display = 'none';
  }
}
