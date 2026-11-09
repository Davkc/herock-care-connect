# AGENTS.md — Herock Care Connect

Instructions for AI coding agents (ChatGPT Codex, Claude Code, and similar). Read this file first.

## What this project is
A static, installable (PWA) website that helps people find health professionals near them and contact their practices. Plain HTML, CSS, and JavaScript. No framework, no build step, no package manager.

## Files
- `index.html`: page structure and dialog markup
- `style.css`: all styling, including the mobile layout (bottom of the file)
- `app.js`: directory search, clinician comparisons and shortlists, local visit notes, PWA install
- `account.mjs`: Firebase Authentication flows
- `sw.js`: service worker (offline cache). Bump `CACHE` in this file whenever a cached file changes
- `manifest.webmanifest`, `*.png`: PWA manifest and icons
- `.github/workflows/pages.yml`: deploys the repo root to GitHub Pages on push to `main`
- `scripts/check.sh`: validation. `scripts/deploy.sh`: one-command GitHub deploy
- `capacitor.config.json`, `package.json`, `scripts/build-www.mjs`: optional Capacitor packaging. Keep the web asset list in sync with the app shell.

## Commands
- Validate: `bash scripts/check.sh` (must pass before every commit)
- Run locally: `python3 -m http.server 8000`, then open http://localhost:8000
- Deploy: `bash scripts/deploy.sh <github-username> [repo-name]` (needs the GitHub CLI, signed in with `gh auth login`)

## Deploy steps (if you are doing this manually)
1. Run `bash scripts/check.sh`.
2. Commit all files on the `main` branch.
3. Create or use the GitHub repo `herock-care-connect` and push `main`.
4. In the repo, set Settings → Pages → Source to **GitHub Actions** (the deploy script does this with `gh api`).
5. Wait for the "Deploy to GitHub Pages" workflow to finish, then open `https://<username>.github.io/<repo>/`.

## Conventions
- Keep it dependency-free. Do not add a bundler or framework unless the task asks for it.
- Use relative paths only (the site is served from a `/<repo>/` subpath on GitHub Pages).
- Escape all dynamic text with `esc()` before inserting it into HTML.
- Keep touch targets at least 44px, inputs at 16px font size on mobile, and visible focus styles.
- Use the public NPI directory for provider data. Show an unavailable state if the directory cannot be reached.
- Do not add medical advice. Keep the emergency (911) notice.

## Safety rules
- Never commit tokens, API keys, or personal health information. Use GitHub Secrets for any key.
- Do not force-push, rewrite history, or delete branches unless the task says to.
- Do not change the repository owner, visibility, or settings beyond enabling Pages.
