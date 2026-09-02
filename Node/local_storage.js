// localStorage 自动保存/加载
const STORAGE_KEY = 'canvas_nodes';

export const LocalStorage = {
  save(nodes) {
    const data = Array.from(nodes.values()).map(n => ({
      uid: n.uid, x: n.x, y: n.y, content: n.content,
      width: n.width, height: n.height, parentUid: n.parentUid || null
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
