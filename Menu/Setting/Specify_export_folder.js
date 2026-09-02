// 独立的导出文件夹选择功能（菜单栏子功能）
// 用法：import { initExportFolderSetting } from './Menu/Setting/Specify_export_folder.js';
//       const { getExportDir } = initExportFolderSetting(sidebarEl, settingsBtnEl, JsonStorage);

export function initExportFolderSetting(sidebarEl, settingsBtnEl, JsonStorage) {
  let exportDir = null;
  let panelEl = null;
  let dirNameEl = null;

  function ensurePanel() {
    if (panelEl) return;

    // 创建设置面板
    panelEl = document.createElement('div');
    panelEl.className = 'settings-panel';
    panelEl.innerHTML = `
      <label>导出文件夹</label>
      <div class="dir-row">
        <span class="dir-name">未选择（下载方式）</span>
        <button class="pick-btn">选择</button>
      </div>
    `;
    document.body.appendChild(panelEl);

    dirNameEl = panelEl.querySelector('.dir-name');
    const pickBtn = panelEl.querySelector('.pick-btn');

    pickBtn.addEventListener('click', async () => {
      try {
        exportDir = await JsonStorage.pickDirectory();
        dirNameEl.textContent = exportDir ? exportDir.name : '未选择（下载方式）';
      } catch (e) {
        if (e.name !== 'AbortError') alert('选择文件夹失败: ' + e.message);
      }
    });

    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
      if (!panelEl.contains(e.target) && !settingsBtnEl.contains(e.target)) {
        panelEl.classList.remove('show');
      }
    });
  }

  function updatePanelPosition() {
    if (!panelEl || !sidebarEl) return;
    panelEl.style.left = sidebarEl.offsetWidth + 'px';
  }

  settingsBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    ensurePanel();
    updatePanelPosition();
    panelEl.classList.toggle('show');
  });

  return {
    getExportDir: () => exportDir,
    refreshPosition: updatePanelPosition
  };
}
