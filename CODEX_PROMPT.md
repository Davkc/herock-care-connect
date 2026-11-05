# Prompt to paste into ChatGPT Codex

Use this after you upload this folder or connect the repository to Codex.

```
Read AGENTS.md first. Then:
1. Run `bash scripts/check.sh` and fix anything that fails.
2. Deploy this site to GitHub Pages for my account, <YOUR-GITHUB-USERNAME>, in a public repo named herock-care-connect.
   Use `bash scripts/deploy.sh <YOUR-GITHUB-USERNAME> herock-care-connect`, or follow the manual steps in AGENTS.md.
3. Confirm the "Deploy to GitHub Pages" workflow succeeded and give me the live URL.
4. Open the live URL and confirm the page loads, search returns results, and the install manifest is found.
Do not add tokens to any file, do not force-push, and do not change anything outside this repository.
```

## Before you run it
- Connect Codex to GitHub (ChatGPT Settings, then Connectors or GitHub), and grant it access to the repo or to create one.
- If Codex runs in a sandbox with no internet, it can prepare the commit, and you can run `bash scripts/deploy.sh <username>` on your own computer.
