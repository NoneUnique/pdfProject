import json
import os
import shutil
from PyQt6.QtCore import QObject, pyqtSlot, pyqtSignal, QThread, QMutex
from PyQt6.QtWidgets import QFileDialog, QMessageBox
from PyQt6.QtGui import QImage, QPainter

from core.pdf.pdf_manager import PdfManager
from core.pdf.pdf_bookmark import PdfBookmark
from core.pdf.pdf_search import PDFSearch
from core.pdf.pdf_renderer import PdfRenderer
from core.ocr.ocr_manager import OcrManager
from core.service.file_service import FileService
from core.service.http_server import LocalFileServer
from core.service.recent_service import RecentService
from core.service.settings_service import SettingsService
from core.convert.word_converter import WordConverter
from core.convert.image_converter import ImageConverter
from core.convert.md_converter import MarkdownConverter
from app.config import TEMP_DIR, DATA_DIR

class Bridge(QObject):
    # 信号定义
    pageUpdated = pyqtSignal(int)
    ocrProgress = pyqtSignal(int, str)
    ocrResult = pyqtSignal(int, str)
    ocrError = pyqtSignal(str)
    fileLoaded = pyqtSignal(str)
    searchResultsReady = pyqtSignal(str)  # JSON格式搜索结果

    def __init__(self, parent=None):
        super().__init__(parent)
        # 核心服务
        self._pdf_manager = PdfManager()
        self._ocr_manager = OcrManager()
        self._file_service = FileService()
        self._recent_service = RecentService()
        self._settings_service = SettingsService()
        self._pdf_search = PDFSearch()
        self._pdf_renderer = PdfRenderer()

        self._current_pdf_path = None
        self._current_page = 0
        self._pdf_text_cache = {}  # 缓存每页文本用于搜索

        # 批注存储路径
        self._annotation_dir = os.path.join(DATA_DIR, 'annotations')
        os.makedirs(self._annotation_dir, exist_ok=True)

        # 本地 HTTP 文件服务
        self._http_server = LocalFileServer()
        self._serve_dir = os.path.join(TEMP_DIR, 'pdf_serve')
        os.makedirs(self._serve_dir, exist_ok=True)
        self._http_server.start(self._serve_dir)
        print(f"🌐 HTTP 文件服务: http://127.0.0.1:{self._http_server.port}")

        # 连接 OCR 信号
        self._ocr_manager.progress.connect(self._on_ocr_progress)
        self._ocr_manager.finished.connect(self._on_ocr_finished)
        self._ocr_manager.error.connect(self._on_ocr_error)

    # ==================== 文件操作 ====================
    @pyqtSlot(result=str)
    def getFileInfo(self) -> str:
        """返回当前 PDF 信息（含 HTTP URL）"""
        if not self._current_pdf_path or not os.path.exists(self._current_pdf_path):
            return "{}"

        info = self._pdf_manager.get_file_info(self._current_pdf_path)

        # 生成 HTTP URL
        served_file = os.path.join(self._serve_dir, os.path.basename(self._current_pdf_path))
        if os.path.exists(served_file):
            try:
                info['url'] = self._http_server.get_url(served_file)
                print(f"🔗 生成访问URL: {info['url']}")
            except ValueError as e:
                print(f"❌ 生成URL失败: {e}")

        return json.dumps(info, ensure_ascii=False)

    @pyqtSlot(result=str)
    def openFileDialog(self) -> str:
        """打开系统文件对话框并加载文件"""
        file_path = self._file_service.open_file_dialog()
        if file_path:
            self._current_pdf_path = file_path
            self._prepare_and_load(file_path)
            print(f"📂 打开文件: {file_path}")
        return file_path or ""

    @pyqtSlot(str, result=str)
    def loadPdf(self, file_path: str) -> str:
        """直接加载指定路径的 PDF"""
        if os.path.exists(file_path):
            self._current_pdf_path = file_path
            self._prepare_and_load(file_path)
            return self.getFileInfo()
        print(f"❌ 文件不存在: {file_path}")
        return "{}"

    def _prepare_and_load(self, file_path: str):
        """将文件复制到服务目录，记录最近文件，通知前端"""
        try:
            file_name = os.path.basename(file_path)
            served_path = os.path.join(self._serve_dir, file_name)
            shutil.copy2(file_path, served_path)

            # 加载PDF文本用于搜索
            self._load_pdf_text(file_path)

            # 添加到最近文件列表
            self._recent_service.add(file_path)
            self.fileLoaded.emit(file_path)
        except Exception as e:
            print(f"❌ 准备文件时出错: {e}")

    def _load_pdf_text(self, file_path: str):
        """加载PDF文本到搜索缓存"""
        self._pdf_text_cache = {}
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                self._pdf_text_cache[page_num + 1] = text
            doc.close()
        except Exception as e:
            print(f"⚠️ 加载PDF文本失败: {e}")

    @pyqtSlot(str, str, result=str)
    def saveFile(self, annotations_json: str = "") -> str:
        """保存PDF及批注"""
        if not self._current_pdf_path:
            return ""

        dest = self._file_service.save_file_dialog()
        if dest:
            try:
                # 保存批注
                if annotations_json:
                    self._save_annotations(annotations_json)

                # 复制PDF
                self._pdf_manager.save_as(self._current_pdf_path, dest)
                print(f"💾 文件已另存为: {dest}")
                return dest
            except Exception as e:
                print(f"❌ 保存失败: {e}")
                return ""
        return ""

    @pyqtSlot(result=str)
    def saveFileAs(self) -> str:
        """另存为当前 PDF"""
        return self.saveFile("")

    @pyqtSlot(result=str)
    def getRecentFiles(self) -> str:
        """返回最近打开的文件列表"""
        return json.dumps(self._recent_service.get_all(), ensure_ascii=False)

    # ==================== 页面控制 ====================
    @pyqtSlot(int)
    def setCurrentPage(self, page: int):
        """前端通知当前页码"""
        self._current_page = page
        self.pageUpdated.emit(page)

    @pyqtSlot(result=int)
    def getCurrentPage(self) -> int:
        """获取当前页码"""
        return self._current_page

    # ==================== PDF 搜索 ====================
    @pyqtSlot(str)
    def searchPdf(self, keyword: str):
        """搜索PDF内容"""
        if not keyword.strip():
            self.searchResultsReady.emit("[]")
            return

        results = []
        for page_num, text in self._pdf_text_cache.items():
            if keyword.lower() in text.lower():
                # 找到匹配，提取预览文本
                idx = text.lower().find(keyword.lower())
                start = max(0, idx - 40)
                end = min(len(text), idx + len(keyword) + 40)
                preview = text[start:end].strip()

                results.append({
                    "page": page_num,
                    "text": preview,
                    "matchCount": text.lower().count(keyword.lower())
                })

        # 按页码排序
        results.sort(key=lambda x: x["page"])
        self.searchResultsReady.emit(json.dumps(results, ensure_ascii=False))

    @pyqtSlot(int, result=str)
    def getPageText(self, page: int) -> str:
        """获取指定页的文本内容"""
        return self._pdf_text_cache.get(page, "")

    # ==================== OCR ====================
    @pyqtSlot(int)
    def startOcr(self, page: int):
        """开始OCR识别"""
        if not self._current_pdf_path:
            self.ocrError.emit("没有打开的PDF文件")
            return
        self._ocr_manager.start(self._current_pdf_path, page)

    @pyqtSlot()
    def cancelOcr(self):
        """取消OCR识别"""
        self._ocr_manager.cancel()

    @pyqtSlot(int, result=str)
    def startFullOcr(self, start_page: int = 1) -> str:
        """开始全文OCR识别，返回识别结果"""
        if not self._current_pdf_path:
            return ""

        all_text = []
        try:
            import fitz
            doc = fitz.open(self._current_pdf_path)
            total_pages = len(doc)

            for i in range(start_page - 1, total_pages):
                page = doc[i]
                text = page.get_text()
                all_text.append(f"--- 第 {i + 1} 页 ---\n{text}")

                # 发送进度
                progress = int((i + 1) / total_pages * 100)
                self.ocrProgress.emit(progress, f"正在识别第 {i + 1} 页...")

            doc.close()
            full_text = "\n\n".join(all_text)
            self.ocrProgress.emit(100, "OCR识别完成")
            return full_text
        except Exception as e:
            self.ocrError.emit(str(e))
            return ""

    # ==================== 格式转换 ====================
    @pyqtSlot(str, result=str)
    def convertToWord(self, fmt: str = "docx") -> str:
        """PDF转Word"""
        if not self._current_pdf_path:
            return ""
        return WordConverter.convert(self._current_pdf_path, fmt) or ""

    @pyqtSlot(str, result=str)
    def convertToImages(self, fmt: str = "png") -> str:
        """PDF转图片"""
        if not self._current_pdf_path:
            return "[]"
        paths = ImageConverter.convert(self._current_pdf_path, fmt)
        return json.dumps(paths)

    @pyqtSlot(result=str)
    def extractImages(self) -> str:
        """提取PDF图片"""
        if not self._current_pdf_path:
            return "[]"
        paths = ImageConverter.extract_images(self._current_pdf_path)
        return json.dumps(paths)

    @pyqtSlot(result=str)
    def convertToMarkdown(self) -> str:
        """PDF转Markdown"""
        if not self._current_pdf_path:
            return ""
        return MarkdownConverter.convert(self._current_pdf_path) or ""

    @pyqtSlot(str, result=str)
    def convertMarkdownToPdf(self, md_path: str) -> str:
        """Markdown转PDF"""
        return MarkdownConverter.to_pdf(md_path) or ""

    @pyqtSlot(str, result=str)
    def convertImagesToPdf(self, image_paths_json: str) -> str:
        """图片转PDF"""
        try:
            image_paths = json.loads(image_paths_json)
            output_path = QFileDialog.getSaveFileName(
                None, "保存PDF", "", "PDF Files (*.pdf)"
            )[0]
            if output_path:
                ImageConverter.create_pdf_from_images(image_paths, output_path)
                return output_path
        except Exception as e:
            print(f"❌ 图片转PDF失败: {e}")
        return ""

    # ==================== 书签 ====================
    @pyqtSlot(result=str)
    def getBookmarks(self) -> str:
        """获取PDF书签"""
        if not self._current_pdf_path:
            return "[]"
        bookmarks = PdfBookmark(self._current_pdf_path).get_bookmarks()
        return json.dumps(bookmarks, ensure_ascii=False)

    @pyqtSlot(int, str)
    def addBookmark(self, page: int, title: str):
        """添加书签"""
        if not self._current_pdf_path:
            return
        try:
            bookmark_file = os.path.join(self._annotation_dir, f"{os.path.basename(self._current_pdf_path)}_bookmarks.json")
            bookmarks = []
            if os.path.exists(bookmark_file):
                with open(bookmark_file, 'r', encoding='utf-8') as f:
                    bookmarks = json.load(f)

            bookmarks.append({"title": title, "page": page})
            with open(bookmark_file, 'w', encoding='utf-8') as f:
                json.dump(bookmarks, f, ensure_ascii=False)
        except Exception as e:
            print(f"❌ 添加书签失败: {e}")

    # ==================== 批注 ====================
    @pyqtSlot(result=str)
    def getAnnotations(self) -> str:
        """获取批注列表"""
        if not self._current_pdf_path:
            return "[]"

        annotation_file = self._get_annotation_file()
        if os.path.exists(annotation_file):
            try:
                with open(annotation_file, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"❌ 读取批注失败: {e}")
        return "[]"

    @pyqtSlot(str)
    def saveAnnotations(self, annotations_json: str):
        """保存批注"""
        if not self._current_pdf_path:
            return

        try:
            annotation_file = self._get_annotation_file()
            annotations = json.loads(annotations_json)
            with open(annotation_file, 'w', encoding='utf-8') as f:
                json.dump(annotations, f, ensure_ascii=False, indent=2)
            print(f"✅ 批注已保存: {annotation_file}")
        except Exception as e:
            print(f"❌ 保存批注失败: {e}")

    def _get_annotation_file(self) -> str:
        """获取批注文件路径"""
        return os.path.join(
            self._annotation_dir,
            f"{os.path.basename(self._current_pdf_path)}_annotations.json"
        )

    def _save_annotations(self, annotations_json: str):
        """保存批注到文件"""
        self.saveAnnotations(annotations_json)

    @pyqtSlot(str)
    def addAnnotation(self, annotation_json: str):
        """添加单个批注"""
        try:
            annotation = json.loads(annotation_json)
            existing = []
            annotation_file = self._get_annotation_file()

            if os.path.exists(annotation_file):
                with open(annotation_file, 'r', encoding='utf-8') as f:
                    existing = json.load(f)

            existing.append(annotation)
            with open(annotation_file, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ 添加批注失败: {e}")

    @pyqtSlot(str)
    def deleteAnnotation(self, annotation_id: str):
        """删除批注"""
        try:
            annotation_file = self._get_annotation_file()
            if os.path.exists(annotation_file):
                with open(annotation_file, 'r', encoding='utf-8') as f:
                    existing = json.load(f)

                existing = [a for a in existing if a.get('id') != annotation_id]

                with open(annotation_file, 'w', encoding='utf-8') as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ 删除批注失败: {e}")

    @pyqtSlot()
    def clearAnnotations(self):
        """清除所有批注"""
        try:
            annotation_file = self._get_annotation_file()
            if os.path.exists(annotation_file):
                os.remove(annotation_file)
        except Exception as e:
            print(f"❌ 清除批注失败: {e}")

    # ==================== 水印 ====================
    @pyqtSlot(str, int, int, int, result=str)
    def addTextWatermark(self, text: str, opacity: int = 30, angle: int = 45, font_size: int = 48) -> str:
        """添加文字水印"""
        if not self._current_pdf_path:
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            import fitz
            doc = fitz.open(self._current_pdf_path)

            for page in doc:
                # 计算水印位置和大小
                rect = page.rect
                # 创建水印文本
                text_point = fitz.Point(rect.width / 4, rect.height / 2)

                # 绘制水印
                page.insert_text(
                    text_point,
                    text,
                    fontsize=font_size,
                    color=(0.8, 0.8, 0.8),
                    rotate=angle,
                )

            doc.save(output_path)
            doc.close()
            print(f"✅ 水印已添加: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 添加水印失败: {e}")
            return ""

    @pyqtSlot(str, int, result=str)
    def addImageWatermark(self, image_path: str, opacity: int = 30) -> str:
        """添加图片水印"""
        if not self._current_pdf_path or not os.path.exists(image_path):
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            import fitz
            doc = fitz.open(self._current_pdf_path)
            img = fitz.Pixmap(image_path)

            for page in doc:
                # 创建半透明图像
                page_img = fitz.Pixmap(fitz.csRGB, img)
                if page_img.alpha:
                    page_img.copy_as_raster()

                # 计算位置（平铺效果）
                rect = page.rect
                img_width = min(rect.width / 3, 300)
                img_height = img_width * img.height / img.width

                # 多次绘制形成平铺
                for x in range(0, int(rect.width), int(img_width + 50)):
                    for y in range(0, int(rect.height), int(img_height + 50)):
                        img_rect = fitz.Rect(x, y, x + img_width, y + img_height)
                        page.insert_image(img_rect, pixmap=page_img, alpha=True)

            doc.save(output_path)
            doc.close()
            print(f"✅ 图片水印已添加: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 添加图片水印失败: {e}")
            return ""

    # ==================== PDF编辑 ====================
    @pyqtSlot(result=str)
    def mergePdfs(self) -> str:
        """合并PDF文件"""
        file_paths, _ = QFileDialog.getOpenFileNames(
            None, "选择要合并的PDF文件", "", "PDF Files (*.pdf)"
        )

        if len(file_paths) < 2:
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            self._pdf_manager.merge_pdfs(file_paths, output_path)
            print(f"✅ PDF已合并: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 合并PDF失败: {e}")
            return ""

    @pyqtSlot(int, int, result=str)
    def splitPdf(self, start_page: int, end_page: int) -> str:
        """拆分PDF"""
        if not self._current_pdf_path:
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            pages = list(range(start_page, end_page + 1))
            self._pdf_manager.extract_pages(self._current_pdf_path, pages, output_path)
            print(f"✅ PDF已拆分: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 拆分PDF失败: {e}")
            return ""

    @pyqtSlot(list, result=str)
    def extractPages(self, pages: list) -> str:
        """提取指定页面"""
        if not self._current_pdf_path:
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            self._pdf_manager.extract_pages(self._current_pdf_path, pages, output_path)
            print(f"✅ 页面已提取: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 提取页面失败: {e}")
            return ""

    @pyqtSlot(result=str)
    def deletePage(self, page_num: int) -> str:
        """删除指定页面"""
        if not self._current_pdf_path:
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            import fitz
            doc = fitz.open(self._current_pdf_path)
            doc.delete_page(page_num - 1)  # 页码从0开始
            doc.save(output_path)
            doc.close()
            print(f"✅ 页面已删除: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 删除页面失败: {e}")
            return ""

    @pyqtSlot(int, int, result=str)
    def rotatePage(self, page_num: int, degrees: int) -> str:
        """旋转页面"""
        if not self._current_pdf_path:
            return ""

        output_path = self._file_service.save_file_dialog("PDF Files (*.pdf)")
        if not output_path:
            return ""

        try:
            import fitz
            doc = fitz.open(self._current_pdf_path)
            page = doc[page_num - 1]
            page.set_rotation(page.rotation + degrees)
            doc.save(output_path)
            doc.close()
            print(f"✅ 页面已旋转: {output_path}")
            return output_path
        except Exception as e:
            print(f"❌ 旋转页面失败: {e}")
            return ""

    # ==================== 设置 ====================
    @pyqtSlot(str, str)
    def setSetting(self, key: str, value: str):
        """保存设置"""
        self._settings_service.set(key, value)

    @pyqtSlot(str, result=str)
    def getSetting(self, key: str) -> str:
        """获取设置"""
        return self._settings_service.get(key, "")

    @pyqtSlot(result=str)
    def getAllSettings(self) -> str:
        """获取所有设置"""
        return json.dumps(self._settings_service.get_all(), ensure_ascii=False)

    # ==================== 打印 ====================
    @pyqtSlot()
    def printPdf(self):
        """打印PDF"""
        if not self._current_pdf_path:
            return

        try:
            from PyQt6.QtPrintSupport import QPrinter, QPrintDialog
            from PyQt6.QtWidgets import QApplication

            printer = QPrinter()
            dialog = QPrintDialog(printer)

            if dialog.exec() == QPrintDialog.Accepted:
                # 使用PyMuPDF渲染打印
                import fitz
                doc = fitz.open(self._current_pdf_path)

                printer.begin(self._current_pdf_path)
                painter = QPainter()

                for page_num in range(len(doc)):
                    if page_num > 0:
                        printer.newPage()

                    page = doc[page_num]
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img = QImage(pixmap.tobytes("png"), pixmap.width, pixmap.height, QImage.Format.Format_RGB32)
                    painter.drawImage(0, 0, img)

                painter.end()
                doc.close()
                printer.end()
        except Exception as e:
            print(f"❌ 打印失败: {e}")

    # ==================== 清理 ====================
    def close(self):
        """应用退出时调用，停止服务器并清理临时文件"""
        print("🔧 正在清理资源...")
        self._http_server.stop()
        try:
            shutil.rmtree(self._serve_dir, ignore_errors=True)
            print(f"🗑️ 已删除服务目录: {self._serve_dir}")
        except Exception as e:
            print(f"清理目录失败: {e}")

    # ==================== 内部回调 ====================
    def _on_ocr_progress(self, percent: int, msg: str):
        self.ocrProgress.emit(percent, msg)

    def _on_ocr_finished(self, page: int, text: str):
        self.ocrResult.emit(page, text)

    def _on_ocr_error(self, err: str):
        self.ocrError.emit(err)
