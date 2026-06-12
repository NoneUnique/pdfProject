import pikepdf

class PdfBookmark:
    def __init__(self, file_path):
        self.file_path = file_path

    def get_bookmarks(self) -> list:
        try:
            pdf = pikepdf.open(self.file_path)
            outlines = pdf.open_outline()
            if not outlines:
                return []
            return self._parse_outline(outlines)
        except Exception:
            return []

    def _parse_outline(self, outline, level=0):
        items = []
        for item in outline.root:
            title = item.title
            page = -1
            if hasattr(item, 'page'):
                page = item.page.index + 1
            items.append({"title": title, "page": page, "level": level})
            if hasattr(item, 'children') and item.children:
                items.extend(self._parse_outline(item.children, level+1))
        return items