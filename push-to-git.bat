@echo off
echo Pushing Voice Sales AI to GitHub...

git config user.name "danelas"
git config user.email "danelas@github.com"

git commit -m "Initial commit: Voice Sales AI System"

git branch -M main

git push -u origin main

echo Done!
pause
