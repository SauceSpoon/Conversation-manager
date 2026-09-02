// JSON 文件导入/导出（支持 File System Access API，不支持时回退到下载/文件选择）
export const JsonStorage = {
  // 选择导出文件夹（需要 Chrome/Edge 86+）
  async pickDirectory() {
    if (!window.showDirectoryPicker) {
      alert('当前浏览器不支持选择文件夹，将使用下载方式导出');
      return null;
    }
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return handle;
  },

  // 导出节点数据到 JSON 文件
  async export(nodes, dirHandle) {
    const data = Array.from(nodes.values()).map(n => ({
      uid: n.uid, x: n.x, y: n.y, content: n.content,
      width: n.width, height: n.height, parentUid: n.parentUid || null
    }));
    const json = JSON.stringify(data, null, 2);

    if (dirHandle) {
      // 写入指定文件夹
      const fileHandle = await dirHandle.getFileHandle('canvas_nodes.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
    } else {
      // 回退：触发浏览器下载
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'canvas_nodes.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  },

  // 从 JSON 文件导入节点数据
  async import() {
    if (window.showOpenFilePicker) {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      const file = await fileHandle.getFile();
      return JSON.parse(await file.text());
    } else {
      // 回退：使用 <input type="file">
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async () => {
          const file = input.files[0];
          if (file) resolve(JSON.parse(await file.text()));
        };
        input.click();
      });
    }
  }
};
