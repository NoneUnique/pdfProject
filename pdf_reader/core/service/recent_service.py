import json
from app.config import DATA_DIR
import os

RECENT_FILE = os.path.join(DATA_DIR, 'recent.json')

class RecentService:
    def __init__(self, max_items=10):
        self.max_items = max_items
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(RECENT_FILE):
            with open(RECENT_FILE, 'w') as f:
                json.dump([], f)

    def add(self, file_path: str):
        files = self.get_all()
        if file_path in files:
            files.remove(file_path)
        files.insert(0, file_path)
        files = files[:self.max_items]
        self._save(files)

    def get_all(self) -> list:
        try:
            with open(RECENT_FILE, 'r') as f:
                return json.load(f)
        except:
            return []

    def _save(self, files):
        with open(RECENT_FILE, 'w') as f:
            json.dump(files, f)