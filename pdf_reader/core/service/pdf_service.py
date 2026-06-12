# core/service/pdf_service.py

from core.pdf.pdf_manager import PDFManager


class PDFService:

    def __init__(
        self,
        pdf_manager: PDFManager,
    ):

        self.manager = pdf_manager

    # =========================================
    # 属性代理
    # =========================================

    @property
    def is_loaded(self):

        return self.manager.is_loaded

    @property
    def file_name(self):

        return self.manager.file_name

    @property
    def file_size(self):

        return self.manager.file_size

    @property
    def total_pages(self):

        return self.manager.total_pages

    # =========================================
    # 打开 PDF
    # =========================================

    def open_pdf(
        self,
        path,
    ):

        return self.manager.open_pdf(path)

    # =========================================
    # 文件对话框
    # =========================================

    def open_file(self):

        return self.manager.open_file()

    # =========================================
    # 页面
    # =========================================

    def get_page(
        self,
        page,
    ):

        return self.manager.get_page(page)

    # =========================================
    # 缩略图
    # =========================================

    def get_thumbnail(
        self,
        page,
    ):

        return self.manager.get_thumbnail(page)

    # =========================================
    # 搜索
    # =========================================

    def search(
        self,
        keyword,
    ):

        return self.manager.search(keyword)

    # =========================================
    # TOC
    # =========================================

    def get_toc(self):

        return self.manager.get_toc()