import os
import hashlib
from app.config import CACHE_DIR

class PdfCache:
    def __init__(self):
        os.makedirs(CACHE_DIR, exist_ok=True)

    def get_cache_path(self, file_path: str) -> str:
        hash_name = hashlib.md5(file_path.encode()).hexdigest()
        return os.path.join(CACHE_DIR, hash_name)

    def exists(self, file_path: str) -> bool:
        return os.path.exists(self.get_cache_path(file_path))