// 一键关闭：通知本地代理杀掉 8080(http) 和 5000(ai_proxy) 进程，再关闭页面
// 职责：仅触发关闭流程 + 显示关闭提示层，不直接杀进程（进程杀由代理 /shutdown 做）
// 边界：不碰按钮挂载（sidebar_manager 管），不碰代理实现
// 用法：
//   import { oneClickClose } from './Menu/One_click_to_close.js';
//   sidebar.addFooterButton('🛑 一键关闭', () => oneClickClose());

const SHUTDOWN_URL = 'http://127.0.0.1:5000/shutdown';

export async function oneClickClose() {
  // 先调代理 /shutdown（代理杀 8080 + 自杀 5000）
  let proxyOk = false;
  try {
    const resp = await fetch(SHUTDOWN_URL, { method: 'POST' });
    proxyOk = resp.ok;
  } catch (e) {
    proxyOk = false;  // 代理没启动或已关
  }
  // 弹提示层（window.close 对手动开的标签页可能被浏览器拦，提示层兜底）
  _showClosedOverlay(proxyOk);
  // 尝试关页面（可能被拦，上方提示层兜底）
  window.close();
}

function _showClosedOverlay(proxyOk) {
  // 避免重复弹
  if (document.querySelector('.one-click-close-overlay')) return;
  const ov = document.createElement('div');
  ov.className = 'one-click-close-overlay';
  ov.innerHTML = `
    <div class="one-click-close-card">
      <div class="one-click-close-title">${proxyOk ? '✅ 服务已关闭' : '⚠ 代理未运行'}</div>
      <div class="one-click-close-desc">
        ${proxyOk
          ? 'HTTP 服务(8080) 和 AI 代理(5000) 已停止<br>可关闭此标签页'
          : 'AI 代理未启动，无法自动关服务<br>请手动关闭两个 bat 窗口'}
      </div>
    </div>
  `;
  document.body.appendChild(ov);
}
