// 创建派生节点：在父节点右下方创建子节点，并通知 EdgeManager 画连线
export function createDerivedNode(nodeManager, parentUid) {
  return {
    name: '分支',
    icon: '➕',
    run: () => {
      const parent = nodeManager.nodes.get(parentUid);
      if (!parent) return;

      // 子节点位置：父节点右下方偏移
      const offsetX = 260;
      const offsetY = 120;
      const childX = parent.x + offsetX;
      const childY = parent.y + offsetY;

      const child = nodeManager.createNode(childX, childY, null, '');
      child.parentUid = parentUid;

      // 通知 EdgeManager 画线（如果已注入）
      if (nodeManager.onDerivedNodeCreated) {
        nodeManager.onDerivedNodeCreated(parentUid, child.uid);
      }

      nodeManager.onNodeChange?.();
    }
  };
}
