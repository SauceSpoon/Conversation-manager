// 一键清空所有节点（业务编排层）
// 职责：弹出确认框 → 调 nodeManager.clearAll() 执行真正的清理
// 边界：不直接操作 nodes Map / DOM / 连线，只做"确认 + 触发"
// 调用方：main.js 通过 sidebar 按钮回调调用
//   import { clearAllNode } from './Node/clear_all_node.js';
//   sidebar.addButton('清空所有节点', () => clearAllNode(nodeManager));

export function clearAllNode(nodeManager) {
  // 空画布直接返回，不弹确认框
  if (nodeManager.nodes.size === 0) {
    alert('画布已经是空的');
    return;
  }
  // 二次确认（不可逆操作）
  const ok = confirm(`确定清空所有节点？共 ${nodeManager.nodes.size} 个节点，此操作不可撤销。`);
  if (!ok) return;
  nodeManager.clearAll();
}
