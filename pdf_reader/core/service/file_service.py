from PyQt6.QtWidgets import QFileDialog

class FileService:
    def open_file_dialog(self, filter_str: str = "PDF文件 (*.pdf);;所有文件 (*)") -> str:
        file_path, _ = QFileDialog.getOpenFileName(
            None, "选择文件", "", filter_str
        )
        return file_path

    def save_file_dialog(self, filter_str: str = "PDF文件 (*.pdf)") -> str:
        file_path, _ = QFileDialog.getSaveFileName(
            None, "保存文件", "", filter_str
        )
        return file_path
