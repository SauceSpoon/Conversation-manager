// IndexedDB 文件存储：存储/读取/删除文件 blob + 元数据
// 职责：封装 IndexedDB 操作，key = 文件 uid
//   存储对象 = { uid, nodeUid, name, type, blob, text, base64 }
//   nodeUid 索引：按节点查出所有绑定的附件
// 边界：不处理 UI、不处理节点 content、不处理 AI 发送

const DB_NAME = 'ui_file_db';
const DB_VERSION = 2;  // bump 加 nodeUid 索引
const STORE_NAME = 'attachments';

let db = null;

function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE_NAME, { keyPath: 'uid' });
      store.createIndex('nodeUid', 'nodeUid', { unique: false });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// 存一个完整附件对象（含 nodeUid / text / base64 / blob）
export async function saveAttachment(att) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(att);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 按 uid 取一个附件
export async function getAttachment(uid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(uid);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// 按 uid 删一个附件
export async function deleteAttachment(uid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(uid);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 按 nodeUid 查所有绑定的附件
export async function getAttachmentsByNode(nodeUid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const idx = tx.objectStore(STORE_NAME).index('nodeUid');
    const req = idx.getAll(nodeUid);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// 按 nodeUid 删除所有绑定的附件（级联清理）
export async function deleteAttachmentsByNode(nodeUid) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('nodeUid');
    const req = idx.openCursor(nodeUid);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
