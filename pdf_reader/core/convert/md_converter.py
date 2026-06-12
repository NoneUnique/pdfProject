import fitz  # PyMuPDF for better text extraction
from app.config import TEMP_DIR
import os, uuid

class MarkdownConverter:
    @staticmethod
    def convert(pdf_path: str) -> str:
        """将PDF转换为Markdown"""
        os.makedirs(TEMP_DIR, exist_ok=True)
        text = ""
        try:
            doc = fitz.open(pdf_path)
            for page_num, page in enumerate(doc):
                text += f"\n\n## 第 {page_num + 1} 页\n\n"
                text += page.get_text()
            doc.close()
        except Exception as e:
            print(f"PDF转Markdown失败: {e}")
            return ""

        output_name = f"{uuid.uuid4()}.md"
        output_path = os.path.join(TEMP_DIR, output_name)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        return output_path

    @staticmethod
    def to_pdf(md_path: str) -> str:
        """将Markdown转换为PDF"""
        if not os.path.exists(md_path):
            return ""

        os.makedirs(TEMP_DIR, exist_ok=True)
        output_name = f"{uuid.uuid4()}.pdf"
        output_path = os.path.join(TEMP_DIR, output_name)

        try:
            # 读取Markdown内容
            with open(md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()

            # 创建PDF
            doc = fitz.open()
            
            # 简单处理：将Markdown转为纯文本
            lines = md_content.split('\n')
            
            # 创建文档
            page = doc.new_page(width=595, height=842)  # A4 size
            
            y_pos = 50
            line_height = 14
            for line in lines:
                if line.startswith('# '):
                    # 一级标题
                    page.insert_text((50, y_pos), line[2:], fontsize=24, color=(0, 0, 0))
                    y_pos += 30
                elif line.startswith('## '):
                    # 二级标题
                    page.insert_text((50, y_pos), line[3:], fontsize=18, color=(0, 0, 0))
                    y_pos += 25
                elif line.startswith('### '):
                    # 三级标题
                    page.insert_text((50, y_pos), line[4:], fontsize=14, color=(0, 0, 0))
                    y_pos += 20
                elif line.startswith('- ') or line.startswith('* '):
                    # 列表项
                    page.insert_text((60, y_pos), f"• {line[2:]}", fontsize=11, color=(0, 0, 0))
                    y_pos += line_height
                elif line.strip() == '':
                    y_pos += line_height // 2
                else:
                    # 普通文本，自动换行
                    page.insert_text((50, y_pos), line[:80], fontsize=11, color=(0, 0, 0))
                    y_pos += line_height

                # 如果超出页面，创建新页面
                if y_pos > 780:
                    page = doc.new_page(width=595, height=842)
                    y_pos = 50

            doc.save(output_path)
            doc.close()
            print(f"✅ Markdown转PDF成功: {output_path}")
            return output_path
        except Exception as e:
            print(f"Markdown转PDF失败: {e}")
            return ""
