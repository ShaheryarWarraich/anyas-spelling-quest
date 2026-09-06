#!/usr/bin/env bash
# Builds the app and publishes dist/ to the gh-pages branch (GitHub Pages).
set -e
cd "$(dirname "$0")/.."
npm run build
cd dist && touch .nojekyll && rm -rf .git && git init -q -b gh-pages && git add -A && git commit -q -m "Deploy $(date +%F)" \
  && git push -q -f "$(cd .. && git remote get-url origin)" gh-pages && rm -rf .git
echo "Published: https://shaheryarwarraich.github.io/anyas-spelling-quest/"
