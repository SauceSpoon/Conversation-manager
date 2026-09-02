// 背景图设置：选图、透明度、清除背景
// 职责：
//   1. 创建设置面板 DOM（选图按钮 + 透明度滑块 + 清除按钮）
//   2. 选图 → 转 base64 → POST 到 server.py 持久化 → 通知画布重绘
//   3. 调透明度 → POST 到 server.py → 通知画布重绘
//   4. 清除背景 → POST /background/delete → 通知画布重绘
// 边界：不直接画 canvas（通过 onChange 回调通知），不直接操作文件（通过 server.py）
// 用法：
//   import { BackgroundSetting } from './Menu/Setting/background_setting.js';
//   const bgSetting = new BackgroundSetting();
//   bgSetting.onChange = (background) => renderBackground(background);
//   sidebar.addFooterButton('🎨 背景图', () => bgSetting.openPanel());

const SERVER_URL = 'http://127.0.0.1:8080';

export class BackgroundSetting {
  constructor() {
    this.onChange = null;  // (background: {base64, opacity} | null) => void
    this._current = null;  // 当前背景状态 { base64, opacity }
    this._buildPanel();
    this._loadFromServer();
  }

  _buildPanel() {
    this.panel = document.createElement('div');
    this.panel.className = 'bg-setting-panel';
    this.panel.style.display = 'none';
    this.panel.innerHTML = `
      <div class="bg-setting-header">
        <span>背景图设置</span>
        <button class="bg-setting-close" title="关闭">×</button>
      </div>
      <div class="bg-setting-body">
        <div class="bg-setting-button-row">
          <button class="bg-setting-choose">📎 选择图片</button>
          <button class="bg-setting-clear" title="清除当前背景">🗑 清除背景</button>
        </div>
        <input type="file" class="bg-setting-input" accept="image/*" hidden>
        <div class="bg-setting-preview-area">
          <div class="bg-setting-preview-placeholder">未选择图片</div>
          <img class="bg-setting-preview" style="display:none">
        </div>
        <label class="bg-setting-opacity-label">
          透明度：<span class="bg-setting-opacity-value">40%</span>
          <input type="range" class="bg-setting-opacity" min="10" max="100" value="40">
        </label>
      </div>
    `;
    document.body.appendChild(this.panel);

    this.chooseBtn = this.panel.querySelector('.bg-setting-choose');
    this.fileInput = this.panel.querySelector('.bg-setting-input');
    this.previewEl = this.panel.querySelector('.bg-setting-preview');
    this.previewPlaceholder = this.panel.querySelector('.bg-setting-preview-placeholder');
    this.opacitySlider = this.panel.querySelector('.bg-setting-opacity');
    this.opacityValue = this.panel.querySelector('.bg-setting-opacity-value');
    this.clearBtn = this.panel.querySelector('.bg-setting-clear');
    this.closeBtn = this.panel.querySelector('.bg-setting-close');

    this._bindEvents();
  }

  _bindEvents() {
    // 选图
    this.chooseBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this._onFileSelect(e));

    // 透明度
    this.opacitySlider.addEventListener('input', () => {
      const opacity = parseInt(this.opacitySlider.value, 10);
      this.opacityValue.textContent = opacity + '%';
      if (this._current) {
        this._current.opacity = opacity / 100;
        this._saveToServer();
        this.onChange?.(this._current);
      }
    });

    // 清除背景
    this.clearBtn.addEventListener('click', () => this._clear());

    // 关闭面板
    this.closeBtn.addEventListener('click', () => this.closePanel());

    // 点面板外关闭
    document.addEventListener('click', (e) => {
      if (this.panel.style.display === 'none') return;
      if (this._justOpened) return;  // 刚打开（由触发按钮的 click 冒泡），不响应
      if (this.panel.contains(e.target)) return;
      this.closePanel();
    });
  }

  // 启动时从 server.py 加载已存背景
  async _loadFromServer() {
    try {
      const resp = await fetch(`${SERVER_URL}/background`);
      const data = await resp.json();
      const bg = data.background;
      if (bg && bg.base64) {
        this._current = bg;
        this.previewEl.src = bg.base64;
        this.previewEl.style.display = '';
        this.previewPlaceholder.style.display = 'none';
        this.opacitySlider.value = Math.round(bg.opacity * 100);
        this.opacityValue.textContent = Math.round(bg.opacity * 100) + '%';
        this.onChange?.(bg);
      }
    } catch (e) {
      console.warn('[背景图] 启动读取失败（server.py 可能未启动）:', e.message);
    }
  }

  async _saveToServer() {
    if (!this._current) return;
    try {
      await fetch(`${SERVER_URL}/background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._current),
      });
    } catch (e) {
      console.warn('[背景图] 保存失败（server.py 可能未启动）:', e.message);
    }
  }

  async _onFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await this._fileToBase64(file);
    const opacity = parseInt(this.opacitySlider.value, 10) / 100;
    this._current = { base64, opacity };
    this.previewEl.src = base64;
    this.previewEl.style.display = '';
    this.previewPlaceholder.style.display = 'none';
    await this._saveToServer();
    this.onChange?.(this._current);
    this.fileInput.value = '';  // 允许重选同一个文件
  }

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async _clear() {
    this._current = null;
    this.previewEl.style.display = 'none';
    this.previewEl.src = '';
    this.previewPlaceholder.style.display = '';
    try {
      await fetch(`${SERVER_URL}/background/delete`, { method: 'POST' });
    } catch (e) {
      console.warn('[背景图] 删除失败（server.py 可能未启动）:', e.message);
    }
    this.onChange?.(null);
  }

  openPanel() {
    // 定位到屏幕中间偏左（避开右侧的 AI 对话框）
    this.panel.style.display = 'flex';
    this.panel.style.left = '50%';
    this.panel.style.top = '80px';
    this.panel.style.transform = 'translateX(-50%)';
    // 标记"刚打开"，防止触发按钮的 click 冒泡到 document 导致立即关闭
    this._justOpened = true;
    setTimeout(() => { this._justOpened = false; }, 100);
  }

  closePanel() {
    this.panel.style.display = 'none';
  }
}
