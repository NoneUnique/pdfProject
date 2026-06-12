from PyQt6.QtCore import QObject, pyqtSignal, QThread
from core.ocr.ocr_worker import OcrWorker

class OcrManager(QObject):
    progress = pyqtSignal(int, str)
    finished = pyqtSignal(int, str)
    error = pyqtSignal(str)

    def __init__(self):
        super().__init__()
        self._thread = None
        self._worker = None

    def start(self, pdf_path: str, page: int):
        if self._thread and self._thread.isRunning():
            self.error.emit("OCR正在进行中")
            return
        self._thread = QThread()
        self._worker = OcrWorker(pdf_path, page)
        self._worker.moveToThread(self._thread)

        self._thread.started.connect(self._worker.run)
        self._worker.progress.connect(self.progress)
        self._worker.finished.connect(self.finished)
        self._worker.error.connect(self.error)
        self._worker.finished.connect(self._thread.quit)
        self._worker.error.connect(self._thread.quit)
        self._thread.finished.connect(self._thread.deleteLater)

        self._thread.start()

    def cancel(self):
        if self._worker:
            self._worker.cancel()