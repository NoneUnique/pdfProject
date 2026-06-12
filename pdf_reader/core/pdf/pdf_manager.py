import os
import pikepdf
from typing import Dict

class PdfManager:
    def get_file_info(self, file_path: str) -> Dict:
        try:
            with pikepdf.open(file_path) as pdf:
                size = os.path.getsize(file_path)
                if size < 1024:
                    size_str = f"{size} B"
                elif size < 1024 * 1024:
                    size_str = f"{size/1024:.1f} KB"
                else:
                    size_str = f"{size/(1024*1024):.1f} MB"
                return {
                    "name": os.path.basename(file_path),
                    "path": file_path,
                    "size": size_str,
                    "totalPages": len(pdf.pages),
                }
        except Exception as e:
            return {"name": os.path.basename(file_path), "size": "未知", "totalPages": 0, "error": str(e)}

    def save_as(self, source: str, dest: str):
        import shutil
        shutil.copy2(source, dest)

    def merge_pdfs(self, pdf_list: list, output_path: str):
        pdfs = [pikepdf.open(p) for p in pdf_list]
        merged = pikepdf.Pdf.new()
        for pdf in pdfs:
            merged.pages.extend(pdf.pages)
        merged.save(output_path)
        for pdf in pdfs:
            pdf.close()

    def extract_pages(self, file_path: str, pages: list, output_path: str):
        pdf = pikepdf.open(file_path)
        new_pdf = pikepdf.Pdf.new()
        for p in pages:
            if 0 <= p-1 < len(pdf.pages):
                new_pdf.pages.append(pdf.pages[p-1])
        new_pdf.save(output_path)
        pdf.close()