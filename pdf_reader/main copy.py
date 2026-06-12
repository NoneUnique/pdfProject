import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt
from app.main_window import MainWindow

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setApplicationName("商业PDF工具")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())