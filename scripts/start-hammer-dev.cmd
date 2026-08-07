@echo off
cd /d C:\Users\RM-HTC\Documents\hammer
echo Starting Hammer Trading Company from %CD%
echo Logs: codex-dev-server.log and codex-dev-server.err.log
"C:\Program Files\nodejs\npm.cmd" run dev 1> codex-dev-server.log 2> codex-dev-server.err.log
echo.
echo Dev server stopped. Check codex-dev-server.err.log for details.
pause
