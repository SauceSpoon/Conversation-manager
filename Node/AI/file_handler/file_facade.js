// 文件处理 Facade：对外唯一接口
// 职责：封装 FileAttach 实例，暴露 mount / setNodeUid / getAttachments / clear / deleteByNodeUid
// 边界：不反向 import 任何 AI 模块，不处理发送逻辑

import { FileAttach } from './file_attach.js';
import { deleteAttachmentsByNode } from '../file_storage.js';

export class FileFacade {
  constructor() {
    this._attach = new FileAttach();
  }

  mount(mountPoint) {
    mountPoint.appendChild(this._attach.getElement());
  }

  // 绑定到某节点：从 IndexedDB 加载该节点的所有附件
  async setNodeUid(uid) {
    await this._attach.setNodeUid(uid);
  }

  getAttachments() {
    return this._attach.getAttachments();
  }

  // 清空当前节点的所有附件（从 IndexedDB 删 + 内存清）
  async clear() {
    await this._attach.clear();
  }

  // 级联清理：按 nodeUid 从 IndexedDB 删（供 node_manager.deleteNode 调）
  static async deleteByNodeUid(nodeUid) {
    await deleteAttachmentsByNode(nodeUid);
  }

  setOnChange(cb) {
    this._attach.setOnChange(cb);
  }
}
