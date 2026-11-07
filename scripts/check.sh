#!/usr/bin/env bash
# Validates the project. Exits non-zero on any problem.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in index.html style.css app.js account.mjs sw.js manifest.webmanifest icon-192.png icon-512.png apple-touch-icon.png .github/workflows/pages.yml; do
  [ -f "$f" ] || { echo "Missing file: $f"; exit 1; }
done
if command -v node >/dev/null; then
  node --check app.js && node --check account.mjs && node --check sw.js
  node -e "JSON.parse(require('fs').readFileSync('manifest.webmanifest','utf8'))"
else
  echo "node not found, skipping JavaScript checks"
fi
grep -q 'manifest.webmanifest' index.html || { echo "index.html does not link the manifest"; exit 1; }
if grep -RInE '(ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,})' --exclude-dir=.git --exclude=check.sh . ; then
  echo "Possible secret found. Remove it before committing."; exit 1
fi
echo "All checks passed."
