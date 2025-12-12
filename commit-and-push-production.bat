@echo off
REM Commit and push to production remote

IF "%1"=="" (
  echo Usage: %0 "commit message"
  exit /b 1
)

git add .
git commit -m "%~1"
git push production main
