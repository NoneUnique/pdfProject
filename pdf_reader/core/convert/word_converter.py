from pdf2docx import Converter
from app.config import TEMP_DIR
import os, uuid

class WordConverter:
    @staticmethod
    def convert(pdf_path: str, fmt: str = 'docx') -> str:
        os.makedirs(TEMP_DIR, exist_ok=True)
        output_name = f"{uuid.uuid4()}.{fmt}"
        output_path = os.path.join(TEMP_DIR, output_name)
        try:
            cv = Converter(pdf_path)
            cv.convert(output_path)
            cv.close()
            return output_path
        except Exception as e:
            return None