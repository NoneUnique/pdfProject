import json, os
from app.config import DATA_DIR

SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')

class SettingsService:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'w') as f:
                json.dump({}, f)

    def set(self, key: str, value: str):
        settings = self._load()
        settings[key] = value
        self._save(settings)

    def get(self, key: str, default=None):
        settings = self._load()
        return settings.get(key, default)

    def get_all(self):
        return self._load()

    def _load(self):
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)

    def _save(self, settings):
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)