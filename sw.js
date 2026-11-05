// Offline support: cache the app shell, serve it first, refresh in the background.
const CACHE = "hcc-v2";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting() });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // fonts and NPI API go straight to network
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r }).catch(() => hit);
    return hit || net;
  }));
});
