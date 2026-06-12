from pdf2image import convert_from_path
from app.config import TEMP_DIR
import os, uuid, fitz

class ImageConverter:
    @staticmethod
    def extract_images(pdf_path: str) -> list:
        """从PDF提取图片"""
        os.makedirs(TEMP_DIR, exist_ok=True)
        try:
            images = convert_from_path(pdf_path)
            paths = []
            for i, img in enumerate(images):
                name = f"{uuid.uuid4()}_{i+1}.png"
                path = os.path.join(TEMP_DIR, name)
                img.save(path, 'PNG')
                paths.append(path)
            return paths
        except Exception as e:
            print(f"提取图片失败: {e}")
            return []

    @staticmethod
    def convert(pdf_path: str, fmt: str = "png") -> list:
        """将PDF转换为图片"""
        os.makedirs(TEMP_DIR, exist_ok=True)
        try:
            images = convert_from_path(pdf_path, fmt=fmt)
            paths = []
            for i, img in enumerate(images):
                name = f"converted_{uuid.uuid4()}_{i+1}.{fmt}"
                path = os.path.join(TEMP_DIR, name)
                img.save(path, fmt.upper())
                paths.append(path)
            return paths
        except Exception as e:
            print(f"PDF转图片失败: {e}")
            return []

    @staticmethod
    def create_pdf_from_images(image_paths: list, output_path: str) -> bool:
        """将多张图片合并为PDF"""
        try:
            doc = fitz.open()
            
            for img_path in image_paths:
                if not os.path.exists(img_path):
                    continue
                    
                # 打开图片获取尺寸
                img = fitz.Pixmap(img_path)
                
                # 创建适应图片尺寸的PDF页面
                if img.width > img.height:
                    rect = fitz.Rect(0, 0, img.width, img.height)
                else:
                    rect = fitz.Rect(0, 0, img.width, img.height)
                
                page = doc.new_page(width=img.width, height=img.height)
                page.insert_image(rect, filename=img_path)
            
            doc.save(output_path)
            doc.close()
            return True
        except Exception as e:
            print(f"图片转PDF失败: {e}")
            return False

    @staticmethod
    def image_to_pdf(image_path: str, output_path: str) -> bool:
        """单张图片转PDF"""
        return ImageConverter.create_pdf_from_images([image_path], output_path)
