import os
import sys

# 项目根目录
if getattr(sys, 'frozen', False):
    ROOT_DIR = sys._MEIPASS
else:
    ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.path.join(ROOT_DIR, 'data')
TEMP_DIR = os.path.join(DATA_DIR, 'temp')
CACHE_DIR = os.path.join(DATA_DIR, 'cache')
RESOURCES_DIR = os.path.join(ROOT_DIR, 'resources')
DIST_UI_DIR = os.path.join(ROOT_DIR, 'dist_ui')