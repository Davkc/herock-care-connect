# Herock Care Connect

Find clinicians near you and save a shortlist. Built with plain HTML, CSS, and JavaScript, with no build step.

**Live site:** https://davkc.github.io/herock-care-connect/

## Provider directory

- Search by U.S. ZIP code or city, with optional specialty and clinician name or NPI.
- Searches query the [National Library of Medicine's NPI directory](https://clinicaltables.nlm.nih.gov/apidoc/npi_idv/v3/doc.html) for its latest published CMS records. Results show the registry specialty, practice address, and listed phone when available.
- Contact the practice to confirm hours, availability, insurance, and video visits. The site links to the practice's listed number.
- Saved clinician IDs stay in your browser and their listings are checked again when you open the app.
- The installable app shell works offline. Directory searches require an internet connection.

## Use on your phone
- **Android (Chrome):** open the live site and tap **Install this app**, or the browser menu then **Install app**.
- **iPhone (Safari):** tap **Share**, then **Add to Home Screen**.

Service workers need HTTPS, which GitHub Pages provides. For local testing use `localhost`.

## Deploy with ChatGPT Codex or another AI agent
This repo includes `AGENTS.md` (instructions agents read automatically), `CODEX_PROMPT.md` (a ready-to-paste prompt), and `scripts/` for validation and one-command deployment.
```bash
bash scripts/check.sh
bash scripts/deploy.sh <your-username> herock-care-connect
```

## Account setup

Enable Email/Password in [Firebase Authentication](https://firebase.google.com/docs/auth/web/password-auth), register a Web app in the same project, and add `davkc.github.io` to Authentication → Settings → Authorized domains. Add a repository Actions secret named `HCC_FIREBASE_WEB_CONFIG` containing JSON with the Web app's `apiKey`, `authDomain`, `projectId`, and `appId`, then rerun the Pages workflow. The workflow publishes only those public Firebase client settings. Use a Web app configuration for this value and keep administrative credentials separate.

For local testing, put the same JSON in an untracked `firebase-config.json` and serve the app over HTTP. Account actions use Firebase Authentication. Saved clinicians and past visit notes are stored in the browser on that device.

## Run locally
Open `index.html`, or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Deploy to GitHub Pages
```bash
git init && git add . && git commit -m "Herock Care Connect v1"
git branch -M main
git remote add origin https://github.com/<your-username>/herock-care-connect.git
git push -u origin main
```
Then open **Settings → Pages**, set **Source** to **GitHub Actions**. The included workflow deploys on every push to `main`.

## Roadmap: features to add for overall productivity
| Priority | Feature | Why it matters |
|---|---|---|
| High | Real backend (Supabase or Firebase) with accounts | Sync saved clinicians and requests across devices |
| High | Maps and distance (Leaflet + OpenStreetMap) | Sort by drive time and show clinics on a map |
| High | Real booking via email/SMS (Resend, Twilio) | Clinics receive requests instead of storing them locally |
| High | Insurance and in-network verification | Cuts surprise bills, the top reason people abandon a search |
| Medium | Appointment reminders and follow-up tasks | Fewer missed visits |
| Medium | Personal health vault (meds, allergies, visit notes) | One place to share context with clinics |
| Medium | Symptom-to-specialty guide | Helps users pick the right kind of clinician |
| Medium | Multilingual UI and clinician languages (Spanish first) | Serves more of the DFW community |
| Medium | Provider portal for clinics to manage availability | Turns the directory into a two-sided platform |
| Medium | Push notifications and native wrapper (Capacitor) | Appointment alerts and App Store / Play Store listing |
| Low | Reviews and verified-visit ratings | Trust signal beyond directory data |
| Low | Analytics dashboard (privacy-friendly) | See which specialties are searched most |
| Engineering | Tests (Playwright), CI lint, Lighthouse checks | Portfolio-grade quality signals |

## Important notice
Provider listings can change. Confirm details with the practice. In an emergency, call 911.

## Credits
A Herock Tech Ideas Hub project.
