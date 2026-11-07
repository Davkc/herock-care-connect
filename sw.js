// Keep the app shell available offline. Directory queries go straight to the network.
const CACHE = "hcc-v4";
const SHELL = ["./", "index.html", "style.css", "app.js", "account.mjs", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const shellURLs = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(path, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("hcc-") && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const {request} = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  url.search = "";
  if (!shellURLs.has(url.href)) return;
  event.respondWith(fetch(request, {cache: "no-cache"}).catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(url.href)) || Response.error();
  }));
});
