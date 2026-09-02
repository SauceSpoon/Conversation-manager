// 分析管理器：按文件类型选 reader、按当前模型能力匹配产出形态
// 职责：
//   1. 维护 reader 注册表（mime → 同文件夹下的读取方法）
//   2. analyze(file) → 按类型选 reader 调用 → 拿到 { ok, text, mode, note }
//   3. 按 model capability 匹配：image 形态产出若模型不支持则判失败
// 边界：不自己抽内容（抽是 reader 干的）、不碰 UI、不碰 IndexedDB
// 扩展：新文件类型 → 在本文件夹加 reader 文件 + 这里注册一条，不动其他文件
// 用法：
//   import { AnalysisManager } from './_File_reading_case/analysis_manager.js';
//   const analyzer = new AnalysisManager();
//   const r = await analyzer.analyze({ name, type, base64 });
//   const text = r.ok ? r.text : '';

export class AnalysisManager {
  constructor() {
    // 当前模型能力（deepseek-chat：纯文本，不支持图片/PDF 文件本体）
    // 换多模态模型时调 setCapability({ supportsImage: true, ... })
    this._capability = { supportsImage: false, supportsPdfFile: false };

    // reader 注册表：每条 = { match(type)->bool, run(file)->Promise<{ok,text,mode,note}> }
    // reader 模块动态 import（按需加载，不一次性加载全部）
    this._readers = [
      { match: (t) => t === 'application/pdf', run: (f) => this._readPdf(f) },
      // 将来扩展（在本文件夹加文件后取消注释）：
      //   { match: (t) => t.startsWith('image/'),  run: (f) => this._readImage(f) },
      //   { match: (t) => t.includes('wordprocessing'), run: (f) => this._readDoc(f) },
    ];
  }

  // 切换模型能力（换模型时调）
  setCapability(cap) {
    this._capability = { ...this._capability, ...cap };
  }

  // PDF：调同文件夹 reading_text.js 抽文字，产出统一格式
  async _readPdf(file) {
    const { extractPdfText } = await import('./reading_text.js');
    const r = await extractPdfText(file.base64);
    return {
      ok: r.ok,
      text: r.ok ? r.text : '',
      mode: 'text',
      note: r.ok ? `抽取成功，共 ${r.pages} 页` : `抽取失败：${r.error}`
    };
  }

  // 将来：PNG/JPG → reading_image.js，产出 mode:'image'（base64 透传给多模态）
  // async _readImage(file) { ... }

  // 将来：DOCX → reading_doc.js（引 mammoth 抽文字），产出 mode:'text'
  // async _readDoc(file) { ... }

  /**
   * 分析单个附件，产出可喂给模型的文字（或标注不可用）
   * @param {{name:string, type:string, base64:string}} file
   * @returns {Promise<{ok:boolean, text:string, mode:string, note:string}>}
   *   mode: 'text' | 'image' | 'none' —— text 任何模型可读；image 需多模态；none 无匹配 reader
   */
  async analyze(file) {
    const entry = this._readers.find(r => r.match(file.type));
    if (!entry) {
      return { ok: false, text: '', mode: 'none', note: '不支持该文件类型' };
    }
    const result = await entry.run(file);
    // 能力匹配：image 形态产出若当前模型不支持 → 判失败，不让 AI 瞎试
    if (result.mode === 'image' && !this._capability.supportsImage) {
      return { ok: false, text: '', mode: 'image', note: '当前模型不支持图片，请换多模态模型' };
    }
    return result;
  }
}
