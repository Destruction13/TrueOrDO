@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║                                                        ║
echo ║          🎉 PartyChaos - Документация 🎉              ║
echo ║                                                        ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 📂 Открываю документацию...
echo.

start "" "docs\home.html"

echo ✅ Документация открыта в браузере!
echo.
echo 💡 Если браузер не открылся автоматически:
echo    Откройте файл: docs\home.html
echo.
timeout /t 3 >nul
