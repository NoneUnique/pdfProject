import os
import socket
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlparse

class SingleFileHandler(SimpleHTTPRequestHandler):
    """自定义请求处理器，增加 CORS 头和访问日志"""
    
    def __init__(self, *args, directory=None, **kwargs):
        self.serve_directory = directory
        super().__init__(*args, **kwargs)

    def translate_path(self, path):
        """
        将 URL 路径转换为本地文件系统路径
        例如 /文件名.pdf -> <serve_directory>/文件名.pdf
        """
        # 去掉查询参数和 Fragment
        clean_path = urlparse(path).path
        # URL 解码（处理 %E5%B9%BF... 之类的中文编码）
        decoded = unquote(clean_path, errors='replace')
        # 去掉开头的 '/'
        relative = decoded.lstrip('/')
        # 安全拼接，防止路径穿越
        target = os.path.normpath(os.path.join(self.serve_directory, relative))
        # 确保结果仍在服务目录内
        if not target.startswith(os.path.normpath(self.serve_directory)):
            raise FileNotFoundError(f"禁止访问: {target}")
        return target

    def end_headers(self):
        # 允许跨域（开发阶段安全性已通过 127.0.0.1 限定）
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def log_message(self, format, *args):
        """重写日志，输出实际访问的文件路径及是否存在"""
        path = self.translate_path(self.path)
        exists = os.path.exists(path) if path else False
        print(f"[{self.command}] {self.path} -> {path} (存在: {exists})")


class LocalFileServer:
    """本地 HTTP 文件服务器，用于前端访问本地 PDF 文件"""

    def __init__(self):
        self._server = None
        self._thread = None
        self._port = None
        self._directory = None

    def start(self, directory: str) -> int:
        """启动服务器，返回实际监听的端口"""
        if self._server:
            self.stop()

        self._directory = directory
        self._port = self._find_free_port()

        # 使用 lambda 传递目录参数
        handler = lambda *args, **kwargs: SingleFileHandler(
            *args, directory=self._directory, **kwargs
        )
        self._server = HTTPServer(('127.0.0.1', self._port), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        print(f"HTTP 文件服务已启动: http://127.0.0.1:{self._port}")
        return self._port

    def stop(self):
        """停止服务器"""
        if self._server:
            self._server.shutdown()
            self._server.server_close()
            self._server = None
            self._thread = None
            print("HTTP 文件服务已停止")

    @property
    def port(self) -> int:
        return self._port

    def get_url(self, file_path: str) -> str:
        """
        将本地绝对路径转换为 HTTP URL
        例如 E:\temp\test.pdf -> http://127.0.0.1:port/test.pdf
        """
        if not file_path.startswith(self._directory):
            raise ValueError("文件不在服务器根目录下")
        relative = os.path.relpath(file_path, self._directory).replace('\\', '/')
        return f"http://127.0.0.1:{self._port}/{relative}"

    @staticmethod
    def _find_free_port() -> int:
        """自动获取一个可用端口"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]