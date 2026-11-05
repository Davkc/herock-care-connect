# Herock Care Connect

Find health professionals near you, compare availability and insurance, save favorites, and send appointment requests. Built with plain HTML, CSS, and JavaScript, so there is no build step and it deploys anywhere static files can be hosted.

**Live demo:** `https://<your-username>.github.io/herock-care-connect/`

## Features in this version
- Search by ZIP code or city, specialty, name or clinic, and insurance plan
- Video-visit filter and sorting by soonest availability, rating, or name
- Optional live lookup of real clinicians through the public NPI Registry API
- Save clinicians to a shortlist (stored in your browser)
- Appointment request form with an "Add to calendar" (.ics) download
- Mobile-first layout: bottom tab bar, large touch targets, bottom-sheet booking form, and notch/safe-area support
- Installable app (PWA) for iPhone and Android, with offline access to the app shell
- Responsive layout, keyboard-friendly, light and dark mode, reduced-motion support
- Privacy first: nothing leaves the browser, and no accounts are required

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
The bundled directory is fictional sample data. This app does not give medical advice. In an emergency, call 911.

## Credits
A Herock Tech Ideas Hub project.
