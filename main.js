// 应用入口：组装各模块（节点、存储、菜单栏、设置）
import { NodeManager } from './Node/node_manager.js';
import { LocalStorage } from './Node/local_storage.js';
import { JsonStorage } from './Node/json_storage.js';
import { SidebarManager } from './Menu/sidebar_manager.js';
import { initExportFolderSetting } from './Menu/Setting/Specify_export_folder.js';
import { ToolbarManager } from './Toolbar/toolbar_manager.js';
import { MoveTool } from './Toolbar/move_tool.js';
import { EdgeRenderer } from './Node/render_node_visualization/edge_renderer.js';
import { AIDialogManager } from './Node/AI/ai_dialog_manager.js';
import { sendToAI } from './Node/AI/ai_client.js';
import { clearAllNode } from './Node/clear_all_node.js';
import { FileFacade } from './Node/AI/file_handler/file_facade.js';
import { BackgroundSetting } from './Menu/Setting/background_setting.js';
import { oneClickClose } from './Menu/One_click_to_close.js';

// ========== 连线渲染器 ==========
const edgeRenderer = new EdgeRenderer(window.view);
window._edgeRenderer = edgeRenderer;

// ========== 节点管理 ==========
const nodeManager = new NodeManager(window.view);
window._nodeManager = nodeManager;
edgeRenderer.setNodeManager(nodeManager);

// 创建派生节点时画连线
nodeManager.onDerivedNodeCreated = (parentUid, childUid) => {
  edgeRenderer.addEdge(parentUid, childUid);
};

// 删除节点时清理相关连线 + 级联清理 IndexedDB 附件
nodeManager.onNodeDeleted = (uid) => {
  edgeRenderer.removeEdgesByNode(uid);
  FileFacade.deleteByNodeUid(uid);
};

// 清空所有节点时批量清理连线 + 批量清理附件
nodeManager.onAllNodesCleared = () => {
  edgeRenderer.restoreEdges([]);
  for (const uid of nodeManager._lastAllUids || []) {
    FileFacade.deleteByNodeUid(uid);
  }
};

nodeManager.onNodeChange = () => LocalStorage.save(nodeManager.nodes);

// ========== AI 对话框 ==========
const aiDialog = new AIDialogManager(nodeManager);
// 点击节点 → 弹出该节点的对话框（一次只开一个，点别的节点自动切换）
nodeManager.onNodeSelected = (uid) => {
  if (uid) aiDialog.showForNode(uid);
  else aiDialog.hide();
};
// 接入 AI：把本地代理请求挂到对话框的 onSend 上（透传附件）
aiDialog.onSend = async (userText, contextText, attachments) => sendToAI(userText, contextText, attachments);

const saved = LocalStorage.load();
if (saved.length > 0) {
  nodeManager.restoreNodes(saved);
  // 恢复连线
  const edges = [];
  for (const node of saved) {
    if (node.parentUid) {
      edges.push({ uid: `${node.parentUid}->${node.uid}`, from: node.parentUid, to: node.uid });
    }
  }
  edgeRenderer.restoreEdges(edges);
}

// ========== 菜单栏 ==========
const sidebar = new SidebarManager();

sidebar.addButton('导入 JSON', async () => {
  try {
    const data = await JsonStorage.import();
    nodeManager.restoreNodes(data);
    // 恢复连线
    const edges = [];
    for (const node of data) {
      if (node.parentUid) {
        edges.push({ uid: `${node.parentUid}->${node.uid}`, from: node.parentUid, to: node.uid });
      }
    }
    edgeRenderer.restoreEdges(edges);
    LocalStorage.save(nodeManager.nodes);
  } catch (e) {
    if (e.name !== 'AbortError') alert('导入失败: ' + e.message);
  }
});

sidebar.addButton('导出 JSON', async () => {
  try {
    await JsonStorage.export(nodeManager.nodes, exportFolder.getExportDir());
  } catch (e) {
    alert('导出失败: ' + e.message);
  }
});

sidebar.addButton('🧹 清空所有节点', () => clearAllNode(nodeManager));

// 设置（底部按钮）→ 子功能：指定导出文件夹
const settingsBtn = sidebar.addFooterButton('⚙ 设置');
const exportFolder = initExportFolderSetting(sidebar.getSidebarEl(), settingsBtn, JsonStorage);
sidebar.onWidthChange(() => exportFolder.refreshPosition());

// ========== 背景图设置 ==========
const bgSetting = new BackgroundSetting();
bgSetting.onChange = (background) => {
  // 通知 infinite_canvas.html 的渲染层更新背景
  if (window.setBackground) window.setBackground(background);
};
sidebar.addFooterButton('🎨 背景图', () => bgSetting.openPanel());
sidebar.addFooterButton('🛑 一键关闭', () => oneClickClose());

// ========== 底部工具栏 ==========
const toolbar = new ToolbarManager();

// 移动工具
const moveTool = new MoveTool(nodeManager, window.view);
const moveIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/></svg>';
toolbar.addTool(moveIcon, 'move');

toolbar.onToolChange((tool) => {
  moveTool.setActive(tool === 'move');
});
