# AI 本地代理：转发前端请求到 DeepSeek API（支持多模态附件）
# 端口：5000
# 接口：POST /chat
#   请求 JSON：{
#     "userText": "用户当前问题",
#     "contextText": "路径上下文（从根到当前节点所有对话）",
#     "attachments": [{ "uid", "name", "type", "base64" }, ...]  # 可选，附件 base64
#   }
#   响应 JSON：{ "reply": "AI 的回复文本" }
# API key：读取同目录下 api_key.txt（只存 key 字符串一行）
import json
import os
import subprocess
import threading
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
API_KEY_FILE = os.path.join(BASE_DIR, 'api_key.txt')
API_BASE_URL = 'https://api.deepseek.com/v1/chat/completions'
MODEL = 'deepseek-chat'
SYSTEM_PROMPT = '你是我的ai助手，每次输出限制在2000字内。'

ALLOWED_ORIGINS = {
    'http://localhost:8080',
    'http://127.0.0.1:8080',
}


def load_api_key():
    with open(API_KEY_FILE, 'r', encoding='utf-8') as f:
        return f.read().strip()


def build_user_content(user_text, context_text, attachments):
    """构造 content 数组：
       - 文本部分（上下文 + 问题）
       - 图片附件 → image_url（当前 deepseek-chat 不支持视觉，字段保留，换多模态模型时启用）
       - 非图片附件（PDF 等）：若已抽文字则把文字拼进 content 让模型直接读
    """
    full_text = f'{context_text}\n\n当前问题：{user_text}' if context_text else user_text
    content = [{'type': 'text', 'text': full_text}]
    for att in attachments or []:
        name = att.get('name', '附件')
        mime = att.get('type', '')
        b64 = att.get('base64', '')
        text = att.get('text', '')
        if mime.startswith('image/'):
            # 图片：data URL 形式（base64 已含 "data:image/png;base64," 前缀）
            if b64:
                content.append({
                    'type': 'image_url',
                    'image_url': {'url': b64}
                })
        else:
            # 非图片：有抽出的文字就喂给模型，没有就提示无法解析
            if text:
                content.append({
                    'type': 'text',
                    'text': f'[附件 {name} 的内容]\n{text}'
                })
            else:
                content.append({
                    'type': 'text',
                    'text': f'[附件: {name}]（未能提取文字内容）'
                })
    return content


def call_deepseek(user_text, context_text, attachments):
    """调用 DeepSeek API，返回 AI 回复文本。支持附件（多模态格式）。"""
    api_key = load_api_key()
    user_content = build_user_content(user_text, context_text, attachments)

    # 无附件时退回纯文本格式（兼容旧模型，更稳定）
    if not attachments:
        user_content = user_content[0]['text']

    payload = {
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_content},
        ],
        'stream': False,
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        API_BASE_URL,
        data=data,
        method='POST',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode('utf-8'))
    return body['choices'][0]['message']['content']


def kill_port(port):
    """杀掉占用指定端口的进程（Windows：netstat 找 LISTENING PID + taskkill）"""
    try:
        out = subprocess.check_output('netstat -ano', shell=True, text=True)
        for line in out.splitlines():
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
    except Exception:
        pass


def shutdown_all():
    """杀 8080(http.server) 后自杀(5000)：延迟 0.5s 等响应发出再动手"""
    time.sleep(0.5)
    kill_port(8080)
    os._exit(0)  # 杀自己(5000)，立即终止不抛异常


class Handler(BaseHTTPRequestHandler):
    def _set_cors(self, status=200, content_type='application/json'):
        origin = self.headers.get('Origin')
        self.send_response(status)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        if origin and origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors(204)

    def do_POST(self):
        # 一键关闭：杀 8080 + 自杀 5000（先发响应，再异步 shutdown_all）
        if self.path == '/shutdown':
            self._set_cors(200)
            self.wfile.write(json.dumps({'ok': True}, ensure_ascii=False).encode('utf-8'))
            threading.Thread(target=shutdown_all, daemon=True).start()
            return
        if self.path != '/chat':
            self._set_cors(404)
            self.wfile.write(json.dumps({'error': 'Not Found'}).encode('utf-8'))
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else b'{}'
            body = json.loads(raw.decode('utf-8'))
            user_text = body.get('userText', '')
            context_text = body.get('contextText', '')
            attachments = body.get('attachments', []) or []
            reply = call_deepseek(user_text, context_text, attachments)
            self._set_cors(200)
            self.wfile.write(json.dumps({'reply': reply}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self._set_cors(500)
            self.wfile.write(json.dumps({'error': str(e)}, ensure_ascii=False).encode('utf-8'))

    # 静默：不打印每一条 GET/POST 日志
    def log_message(self, format, *args):
        pass


def main():
    host = '127.0.0.1'
    port = 5000
    print(f'[AI Proxy] 启动中：{host}:{port}')
    HTTPServer((host, port), Handler).serve_forever()


if __name__ == '__main__':
    main()
