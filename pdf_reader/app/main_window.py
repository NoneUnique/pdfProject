import os

from PyQt6.QtWidgets import (
    QMainWindow,
    QVBoxLayout,
    QWidget,
)

from PyQt6.QtWebEngineWidgets import (
    QWebEngineView,
)

from PyQt6.QtCore import QUrl

from PyQt6.QtWebChannel import QWebChannel

from app.bridge import Bridge
from app.config import DIST_UI_DIR
from app.constants import (
    APP_TITLE,
    DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT,
)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle(APP_TITLE)

        self.resize(
            DEFAULT_WINDOW_WIDTH,
            DEFAULT_WINDOW_HEIGHT,
        )

        central_widget = QWidget()

        self.setCentralWidget(central_widget)

        layout = QVBoxLayout(central_widget)

        layout.setContentsMargins(0, 0, 0, 0)

        # 主页面
        self.browser = QWebEngineView()

        layout.addWidget(self.browser)

        # DevTools
        self.devtools = QWebEngineView()

        self.browser.page().setDevToolsPage(
            self.devtools.page()
        )

        self.devtools.resize(1400, 900)

        self.devtools.show()

        # WebChannel
        self.channel = QWebChannel()

        self.bridge = Bridge()

        self.channel.registerObject(
            "bridge",
            self.bridge,
        )

        self.browser.page().setWebChannel(
            self.channel
        )

        self.load_frontend(is_debug=True)

    def load_frontend(self, is_debug=True):
        if is_debug:
            dev_url = "http://localhost:5173"

            print(f"🚀 开发模式: {dev_url}")

            self.browser.load(QUrl(dev_url))

        else:
            dist_path = os.path.join(
                DIST_UI_DIR,
                "index.html",
            )

            if not os.path.exists(dist_path):
                print(
                    f"❌ 未找到前端文件: {dist_path}"
                )
                return

            self.browser.load(
                QUrl.fromLocalFile(
                    os.path.abspath(dist_path)
                )
            )

    def closeEvent(self, event):
        """窗口关闭时清理资源"""
        print("🔒 窗口正在关闭...")
        if hasattr(self, 'bridge'):
            self.bridge.close()
        if hasattr(self, 'devtools'):
            self.devtools.close()
        event.accept()
