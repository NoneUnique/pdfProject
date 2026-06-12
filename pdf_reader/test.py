import sys
import json
import pandas as pd
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QPushButton, 
                             QFileDialog, QMessageBox)

class JsonToExcelMatrixApp(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()

    def initUI(self):
        self.setWindowTitle('JSON 转矩阵 Excel 工具')
        self.setGeometry(100, 100, 400, 150)
        layout = QVBoxLayout()
        self.btn = QPushButton('选择 JSON 文件并生成矩阵表格', self)
        self.btn.clicked.connect(self.process_files)
        layout.addWidget(self.btn)
        self.setLayout(layout)

    def process_files(self):
        file_paths, _ = QFileDialog.getOpenFileNames(self, "选择 JSON 文件", "", "JSON Files (*.json)")
        if not file_paths: return

        # 使用字典存储数据：{key: {lang1: val, lang2: val}}
        master_dict = {}

        for file_path in file_paths:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 遍历 JSON 结构: {lang: {key: val}}
                for lang, content in data.items():
                    if isinstance(content, dict):
                        for key, val in content.items():
                            if key not in master_dict:
                                master_dict[key] = {}
                            master_dict[key][lang] = val

        # 转换为 DataFrame (键名为行，语言为列)
        df = pd.DataFrame.from_dict(master_dict, orient='index')
        df.index.name = '键名'
        
        save_path, _ = QFileDialog.getSaveFileName(self, "保存结果", "多语言矩阵.xlsx", "Excel Files (*.xlsx)")
        if save_path:
            df.to_excel(save_path)
            QMessageBox.information(self, "成功", "矩阵格式 Excel 已生成！")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = JsonToExcelMatrixApp()
    ex.show()
    sys.exit(app.exec())