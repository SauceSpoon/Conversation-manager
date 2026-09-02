// 节点 uid 与序列指向（parentUid）生成模块
// 职责：
//   1. 生成全局唯一 uid，组装节点数据对象（含指向上一级的 parentUid）
//   2. 单路径回溯：从某节点沿 parentUid 向上追溯到根，返回路径或格式化文本（供 AI 读取）
// 边界：只负责"生产"节点数据和"计算"路径，不持有状态、不操作 DOM
//       实际存储与维护由 node_manager.js 的 NodeManager 负责
// 调用方：node_manager.js、未来的 AI 模块

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 700;

// 构造一个节点数据对象
// 参数：
//   worldX, worldY  —— 节点在画布世界坐标的位置
//   uid             —— 显式传入则用传入值（用于导入/恢复），不传则自动生成全局唯一 uid
//   content         —— 节点文本内容
//   parentUid       —— 指向上一级节点的 uid，根节点为 null
// 返回：节点数据对象（纯数据，未写入任何状态）
export function createNodeData(worldX, worldY, uid = null, content = '', parentUid = null) {
  const id = uid || crypto.randomUUID();
  return {
    uid: id,
    x: worldX,
    y: worldY,
    content,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    parentUid: parentUid || null
  };
}

// 单路径回溯：从某节点沿 parentUid 向上追溯到根，返回节点数组（顺序：根 → ... → 当前节点）
// 参数：
//   uid        —— 起始节点 uid
//   nodesMap   —— Map<uid, node>，由 NodeManager 提供
// 返回：节点对象数组；若 uid 不存在或产生循环引用，则返回空数组或已追溯部分
export function getPathToRoot(uid, nodesMap) {
  const path = [];
  const visited = new Set();
  let current = nodesMap.get(uid);
  while (current && !visited.has(current.uid)) {
    visited.add(current.uid);
    path.unshift(current);
    current = current.parentUid ? nodesMap.get(current.parentUid) : null;
  }
  return path;
}

// 单路径回溯：返回从根到当前节点的格式化文本（默认按 AI 提示词格式拼接）
// 参数：
//   uid             —— 起始节点 uid
//   nodesMap        —— Map<uid, node>
//   options.nodeTemplate  —— 每个节点的前缀模板，支持占位符 {uid} 和 {content}
//                            默认："user在节点{uid}的内容：{content}"
//   options.separator     —— 节点之间的分隔符，默认 "\n---\n"
// 返回：拼接好的完整文本字符串；找不到路径返回空字符串
export function getPathText(uid, nodesMap, options = {}) {
  const {
    nodeTemplate = 'user在节点{uid}的内容：{content}',
    separator = '\n---\n'
  } = options;
  const path = getPathToRoot(uid, nodesMap);
  return path
    .map(node =>
      nodeTemplate
        .replace('{uid}', node.uid)
        .replace('{content}', node.content || '')
    )
    .join(separator);
}
