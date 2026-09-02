// PDF 文字抽取：调用 pdf.js（CDN 动态加载）把 PDF 抽成纯文本
// 职责：纯抽取器——入参 PDF 的 base64，出参 { ok, text, pages, error }
// 边界：不碰 UI、不碰 IndexedDB、不碰发送逻辑、不管调用时机
// 用法：
//   import { extractPdfText } from './_File_reading_case/reading_text.js';
//   const r = await extractPdfText(base64DataUrl);
//   if (r.ok) console.log(r.text, r.pages);

// pdf.js 本地放在 UI/lib/，离线可用、不依赖 CDN
// reading_text.js 在 UI/Node/AI/file_handler/_File_reading_case/，往上 4 级到 UI
const PDFJS_MODULE = './../../../../lib/pdf.min.mjs';
const PDFJS_WORKER = './../../../../lib/pdf.worker.min.mjs';

// 动态 import 只做一次，缓存住后续复用
let _pdfjsPromise = null;
async function loadPdfjs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = (async () => {
      const pdfjs = await import(PDFJS_MODULE);
      // workerSrc 要绝对 URL（fetch 加载 worker，相对字符串会按文档基址而非模块解析），用 import.meta.url 兜底
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(PDFJS_WORKER, import.meta.url).href;
      return pdfjs;
    })();
  }
  return _pdfjsPromise;
}

// data URL（data:application/pdf;base64,xxxx）→ ArrayBuffer（pdf.js 要 TypedArray/ArrayBuffer）
function dataUrlToArrayBuffer(dataUrl) {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * 抽取 PDF 全文
 * @param {string} base64DataUrl  FileReader.readAsDataURL 的结果（含 data: 前缀）
 * @returns {Promise<{ok:boolean, text:string, pages:number, error:string}>}
 */
export async function extractPdfText(base64DataUrl) {
  if (!base64DataUrl || typeof base64DataUrl !== 'string') {
    return { ok: false, text: '', pages: 0, error: '入参为空' };
  }
  try {
    const pdfjs = await loadPdfjs();
    const buf = dataUrlToArrayBuffer(base64DataUrl);
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const pages = doc.numPages;
    const parts = [];
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // hasEOL 标记行末换行，保留原始排版结构
      const pageText = content.items
        .map(it => (it.str || '') + (it.hasEOL ? '\n' : ''))
        .join('');
      parts.push(pageText);
    }
    await doc.destroy();
    return { ok: true, text: parts.join('\n'), pages, error: '' };
  } catch (e) {
    return { ok: false, text: '', pages: 0, error: e && e.message ? e.message : String(e) };
  }
}
