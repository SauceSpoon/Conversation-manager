# 本地文件服务器：静态文件读取（替代 http.server） + 背景图持久化
# 端口：8080
# 接口：
#   GET  /<静态文件路径>     返回 UI 目录下的静态文件（原有的 http.server 功能）
#   GET  /background         返回 record/ 下保存的背景图元数据 {base64, opacity}
#   POST /background          保存背景图 {base64, opacity} 到 record/background.json
#   POST /background/delete   删除背景图
# 数据格式：背景图以 base64 + opacity 存成单个 JSON 文件，关机重启不丢
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RECORD_DIR = os.path.join(BASE_DIR, 'record')
BG_FILE = os.path.join(RECORD_DIR, 'background.json')

ALLOWED_ORIGINS = {
    'http://localhost:8080',
    'http://127.0.0.1:8080',
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # 让 SimpleHTTPRequestHandler 以 UI 目录为根提供静态文件
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # ===== CORS =====
    def _set_cors(self, status=200, content_type='application/json'):
        origin = self.headers.get('Origin')
        self.send_response(status)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        if origin and origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors(204)

    # ===== 路由分发 =====
    def do_GET(self):
        # 背景图读取接口
        if self.path == '/background' or self.path.startswith('/background?'):
            self._handle_get_background()
            return
        # 其余走静态文件
        super().do_GET()

    def do_POST(self):
        if self.path == '/background':
            self._handle_save_background()
            return
        if self.path == '/background/delete':
            self._handle_delete_background()
            return
        self._set_cors(404)
        self.wfile.write(json.dumps({'error': 'Not Found'}, ensure_ascii=False).encode('utf-8'))

    # ===== 背景图接口实现 =====
    def _handle_get_background(self):
        try:
            if not os.path.exists(BG_FILE):
                self._set_cors(200)
                self.wfile.write(json.dumps({'background': None}, ensure_ascii=False).encode('utf-8'))
                return
            with open(BG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._set_cors(200)
            self.wfile.write(json.dumps({'background': data}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self._set_cors(500)
            self.wfile.write(json.dumps({'error': str(e)}, ensure_ascii=False).encode('utf-8'))

    def _handle_save_background(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else b'{}'
            body = json.loads(raw.decode('utf-8'))
            # 校验：必须有 base64 和 opacity
            if not body.get('base64'):
                self._set_cors(400)
                self.wfile.write(json.dumps({'error': 'missing base64'}, ensure_ascii=False).encode('utf-8'))
                return
            # 确保 record 目录存在
            os.makedirs(RECORD_DIR, exist_ok=True)
            with open(BG_FILE, 'w', encoding='utf-8') as f:
                json.dump({
                    'base64': body['base64'],
                    'opacity': float(body.get('opacity', 0.4)),
                }, f, ensure_ascii=False)
            self._set_cors(200)
            self.wfile.write(json.dumps({'ok': True}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self._set_cors(500)
            self.wfile.write(json.dumps({'error': str(e)}, ensure_ascii=False).encode('utf-8'))

    def _handle_delete_background(self):
        try:
            if os.path.exists(BG_FILE):
                os.remove(BG_FILE)
            self._set_cors(200)
            self.wfile.write(json.dumps({'ok': True}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self._set_cors(500)
            self.wfile.write(json.dumps({'error': str(e)}, ensure_ascii=False).encode('utf-8'))

    # 静默日志
    def log_message(self, format, *args):
        pass


def main():
    host = '127.0.0.1'
    port = 8080
    print(f'[File Server] 启动中：{host}:{port}')
    HTTPServer((host, port), Handler).serve_forever()


if __name__ == '__main__':
    main()
