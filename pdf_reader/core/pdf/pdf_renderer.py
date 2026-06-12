import os
import fitz  # PyMuPDF
from typing import Optional, Tuple

class PdfRenderer:
    """PDF渲染器，用于生成缩略图和页面渲染"""
    
    def __init__(self):
        self._cache = {}
    
    def render_page(self, file_path: str, page_num: int, scale: float = 1.0) -> Optional[bytes]:
        """渲染指定页面为PNG图像"""
        try:
            doc = fitz.open(file_path)
            if page_num < 1 or page_num > len(doc):
                return None
            
            page = doc[page_num - 1]
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            doc.close()
            return img_data
        except Exception as e:
            print(f"渲染页面失败: {e}")
            return None
    
    def generate_thumbnail(self, file_path: str, page_num: int, width: int = 200) -> Optional[bytes]:
        """生成缩略图"""
        try:
            doc = fitz.open(file_path)
            if page_num < 1 or page_num > len(doc):
                return None
            
            page = doc[page_num - 1]
            # 计算缩放比例
            page_width = page.rect.width
            scale = width / page_width
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            doc.close()
            return img_data
        except Exception as e:
            print(f"生成缩略图失败: {e}")
            return None
    
    def get_page_size(self, file_path: str, page_num: int) -> Optional[Tuple[float, float]]:
        """获取页面尺寸 (width, height)"""
        try:
            doc = fitz.open(file_path)
            if page_num < 1 or page_num > len(doc):
                return None
            
            page = doc[page_num - 1]
            width = page.rect.width
            height = page.rect.height
            doc.close()
            return (width, height)
        except Exception as e:
            print(f"获取页面尺寸失败: {e}")
            return None
    
    def save_thumbnail(self, file_path: str, page_num: int, output_path: str, width: int = 200) -> bool:
        """保存缩略图到文件"""
        try:
            img_data = self.generate_thumbnail(file_path, page_num, width)
            if img_data:
                with open(output_path, 'wb') as f:
                    f.write(img_data)
                return True
            return False
        except Exception as e:
            print(f"保存缩略图失败: {e}")
            return False
    
    def render_to_image(self, file_path: str, output_dir: str, fmt: str = "png", scale: float = 2.0) -> list:
        """批量渲染PDF页面到图片"""
        try:
            doc = fitz.open(file_path)
            output_paths = []
            
            for i, page in enumerate(doc):
                mat = fitz.Matrix(scale, scale)
                pix = page.get_pixmap(matrix=mat, output=fmt)
                output_path = os.path.join(output_dir, f"page_{i+1}.{fmt}")
                pix.save(output_path)
                output_paths.append(output_path)
            
            doc.close()
            return output_paths
        except Exception as e:
            print(f"批量渲染失败: {e}")
            return []
