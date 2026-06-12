@echo off
chcp 65001 >nul
echo 正在为您生成 [PyQt6 + React] 混合架构的 Python 后端目录结构...
echo ------------------------------------------------

:: 1. 创建核心业务逻辑包 (core) 及其子目录
md core\pdf
type null > core\pdf\__init__.py
type null > core\pdf\pdf_manager.py
type null > core\pdf\pdf_renderer.py
type null > core\pdf\pdf_cache.py
type null > core\pdf\pdf_bookmark.py

md core\ocr
type null > core\ocr\__init__.py
type null > core\ocr\ocr_manager.py
type null > core\ocr\ocr_worker.py
type null > core\ocr\text_layer.py

md core\annotation
type null > core\annotation\__init__.py
type null > core\annotation\annotation_manager.py

md core\convert
type null > core\convert\__init__.py
type null > core\convert\md_converter.py
type null > core\convert\image_converter.py
type null > core\convert\word_converter.py

md core\service
type null > core\service\__init__.py
type null > core\service\file_service.py
type null > core\service\recent_service.py
type null > core\service\settings_service.py

:: 2. 创建主程序容器与桥梁包 (app)
md app
type null > app\__init__.py
type null > app\main_window.py
type null > app\bridge.py
type null > app\config.py
type null > app\constants.py

:: 3. 创建本地数据与缓存目录 (data)
md data\cache
md data\temp
type null > data\recent.db

:: 4. 创建资源目录 (只保留底层需要的，如字体或初始模型配置)
md resources\fonts
md resources\models

:: 5. 创建根目录入口文件和依赖声明
type null > main.py
type null > requirements.txt

echo ------------------------------------------------
echo 🚀 Python 后端核心结构生成完毕！
echo 💡 提示：所有的 UI 组件和样式，请在前端 src/ 目录中通过 React+Tailwind 实现。
pause