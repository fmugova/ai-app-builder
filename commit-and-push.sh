#!/bin/bash
# Commit and push to both origin and production remotes

git add .
git commit -m "$1"
git push origin main
git push production main
