#!/usr/bin/env bash
# Usage: bash scripts/deploy.sh <github-username> [repo-name]
# Requires: git and the GitHub CLI (gh), signed in with `gh auth login`.
set -euo pipefail
cd "$(dirname "$0")/.."
OWNER="${1:?Usage: bash scripts/deploy.sh <github-username> [repo-name]}"
REPO="${2:-herock-care-connect}"

bash scripts/check.sh
command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first."; exit 1; }

[ -d .git ] || git init -q
git checkout -B main -q
git add -A
git diff --cached --quiet || git commit -q -m "Herock Care Connect"

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
else
  gh repo create "$OWNER/$REPO" --public --source=. --remote=origin \
    --description "Find health professionals near you and request appointments (PWA)"
fi
git push -u origin main

# Turn on GitHub Pages with the Actions workflow as the source (ignore if already on)
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || \
gh api -X PUT  "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true

echo "Deployed. The workflow takes about a minute: https://$OWNER.github.io/$REPO/"
echo "Progress: https://github.com/$OWNER/$REPO/actions"
