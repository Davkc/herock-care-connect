#!/usr/bin/env bash
# Validates the project. Exits non-zero on any problem.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in index.html style.css app.js account.mjs sw.js manifest.webmanifest icon-192.png icon-512.png apple-touch-icon.png .github/workflows/pages.yml package.json capacitor.config.json scripts/build-www.mjs; do
  [ -f "$f" ] || { echo "Missing file: $f"; exit 1; }
done
if command -v node >/dev/null; then
  for f in app.js account.mjs sw.js scripts/build-www.mjs; do node --check "$f"; done
  node -e "for (const path of process.argv.slice(1)) JSON.parse(require('fs').readFileSync(path, 'utf8'))" manifest.webmanifest package.json capacitor.config.json
else
  echo "node not found, skipping JavaScript checks"
fi
grep -q 'manifest.webmanifest' index.html || { echo "index.html does not link the manifest"; exit 1; }
if grep -RInE '(ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,})' --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=www --exclude-dir=android --exclude-dir=ios --exclude=check.sh . ; then
  echo "Possible secret found. Remove it before committing."; exit 1
fi
echo "All checks passed."
