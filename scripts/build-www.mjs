import {copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";

const root = new URL("../", import.meta.url);
const config = JSON.parse(readFileSync(new URL("capacitor.config.json", root), "utf8"));
const output = new URL(config.webDir + "/", root);
const assets = [
  "index.html", "style.css", "pagination.js", "app.js", "account.mjs", "sw.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"
];

const firebase = new URL("firebase-config.json", root);
const bundledFirebase = new URL("firebase-config.json", output);
const rawConfig = process.env.HCC_FIREBASE_WEB_CONFIG
  ?? (existsSync(firebase) ? readFileSync(firebase, "utf8") : "");
let publicConfig;
if (rawConfig) {
  let settings;
  try {
    settings = JSON.parse(rawConfig);
  } catch {
    throw new Error("Firebase Web app configuration must be valid JSON.");
  }
  const fields = ["apiKey", "authDomain", "projectId", "appId"];
  if (fields.some(field => typeof settings?.[field] !== "string" || !settings[field].trim())) {
    throw new Error("Incomplete Firebase Web app configuration.");
  }
  publicConfig = Object.fromEntries(fields.map(field => [field, settings[field]]));
}

mkdirSync(output, {recursive: true});
for (const asset of assets) copyFileSync(new URL(asset, root), new URL(asset, output));
if (publicConfig) writeFileSync(bundledFirebase, JSON.stringify(publicConfig));
else rmSync(bundledFirebase, {force: true});
console.log("Built " + config.webDir + "/");
