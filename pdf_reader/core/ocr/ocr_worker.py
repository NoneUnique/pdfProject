import pytesseract
from pdf2image import convert_from_path
from PyQt6.QtCore import QObject, pyqtSignal, pyqtSlot

class OcrWorker(QObject):
    progress = pyqtSignal(int, str)
    finished = pyqtSignal(int, str)
    error = pyqtSignal(str)

    def __init__(self, pdf_path, page):
        super().__init__()
        self.pdf_path = pdf_path
        self.page = page
        self._is_canceled = False

    @pyqtSlot()
    def run(self):
        try:
            self.progress.emit(0, "开始OCR...")
            images = convert_from_path(self.pdf_path, first_page=self.page, last_page=self.page)
            if not images:
                self.error.emit("无法转换页面为图像")
                return
            image = images[0]
            self.progress.emit(30, "正在识别文字...")
            if self._is_canceled:
                return
            text = pytesseract.image_to_string(image, lang='chi_sim+eng')
            self.progress.emit(100, "识别完成")
            self.finished.emit(self.page, text)
        except Exception as e:
            self.error.emit(str(e))

    def cancel(self):
        self._is_canceled = True