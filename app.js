// Herock Care Connect — static app, no build step.
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } },
  set(key, value){ try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }
};
const directory = "https://clinicaltables.nlm.nih.gov/api/npi_idv/v3/search";
const pageSize = 30;
const saved = new Set(store.get("hcc.saved", []).filter(id => typeof id === "string" && /^npi\d{10}$/.test(id)));
const savedProviders = new Map();
let visits = store.get("hcc.visits", []);
let searchRequest;
let savedStatus = "";

const initials = name => name.split(/[\s,]+/).slice(0, 2).map(part => part[0]).join("");

function providerRow(p){
  const isSaved = saved.has(p.id);
  const phone = p.phone.replace(/\D/g, "");
  return `<li class="row"><div class="av" aria-hidden="true">${esc(initials(p.name))}</div>
  <div><h3>${esc(p.name)}</h3>
  <p class="meta">${esc(p.specialty || "Specialty unlisted")}</p>
  <p class="meta">${esc(p.address || "Practice address unlisted")}</p>
  <p class="meta">${phone ? `<a href="tel:${phone}">Call ${esc(p.phone)}</a> · ` : ""}
  <a href="https://npiregistry.cms.hhs.gov/provider-view/${p.npi}">NPI ${p.npi}</a></p></div>
  <div class="btns"><button class="ghost" data-save="${p.id}" aria-pressed="${isSaved}">${isSaved ? "Saved" : "Save"}</button></div></li>`;
}

async function lookup(params, signal){
  const query = new URLSearchParams({
    terms: "",
    df: "name.full,NPI,provider_type,addr_practice.full,addr_practice.phone",
    ...params
  });
  const response = await fetch(directory + "?" + query, {
    cache: "no-store",
    signal: AbortSignal.any && signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : signal || AbortSignal.timeout?.(12000)
  });
  if (!response.ok) throw new Error("Directory request failed");
  const [total, , , rows] = await response.json();
  if (!Number.isInteger(total) || !Array.isArray(rows)) throw new Error("Invalid directory response");
  const providers = rows
    .filter(([name, npi]) => typeof name === "string" && name.trim() && /^\d{10}$/.test(npi))
    .map(([name, npi, specialty, address, phone]) => ({
      id: "npi" + npi, npi, name, specialty, address, phone: phone || ""
    }));
  return {total, providers};
}

function locationFilter(value){
  if (/^\d{5}$/.test(value)) return "addr_practice.zip:" + value + "*";
  const match = /^([\p{L}][\p{L} .’'-]*?)(?:,\s*([a-z]{2}))?$/iu.exec(value);
  if (!match) return "";
  const [, city, state] = match;
  return 'addr_practice.city:"' + city.trim() + '"' + (state ? " AND addr_practice.state:" + state.toUpperCase() : "");
}

function renderResults(providers, total){
  $("#resultsTitle").textContent = total > providers.length
    ? "Showing " + providers.length + " results"
    : providers.length + (providers.length === 1 ? " clinician found" : " clinicians found");
  $("#results").innerHTML = providers.length
    ? providers.map(providerRow).join("")
    : '<li class="empty">No directory matches. Try another ZIP code or city, or remove a filter.</li>';
}

let shown = [];
let total = 0;

async function search(){
  searchRequest?.abort();
  const request = new AbortController();
  searchRequest = request;
  const location = locationFilter($("#where").value.trim());
  shown = [];
  $("#results").replaceChildren();
  if (!location) {
    $("#resultsTitle").textContent = "Enter a location";
    $("#searchStatus").textContent = "Use a 5-digit ZIP code, a city, or a city and state such as Dallas, TX.";
    return;
  }
  $("#resultsTitle").textContent = "Searching the directory…";
  $("#searchStatus").textContent = "";
  const terms = $("#q").value.trim();
  const codes = $("#spec").value.split(" ").filter(Boolean);
  const specialty = codes.length ? " AND licenses.taxonomy.code:(" + codes.join(" OR ") + ")" : "";
  try {
    const result = await lookup({
      q: location + specialty, terms, count: pageSize, sf: "NPI,name.full"
    }, request.signal);
    if (request.signal.aborted) return;
    ({providers: shown, total} = result);
    renderResults(shown, total);
    const checked = new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
    $("#searchStatus").textContent = "Directory checked at " + checked + "."
      + (total > shown.length ? " Refine your search to narrow the results." : "");
  } catch {
    if (request.signal.aborted) return;
    $("#resultsTitle").textContent = "Directory unavailable";
    $("#searchStatus").textContent = "The directory could not be reached. Check your connection and try Search again.";
  }
}

function renderSaved(){
  const ids = [...saved];
  const rows = ids.map(id => {
    const p = savedProviders.get(id);
    if (p) return providerRow(p);
    return `<li class="row"><div></div><p class="meta">NPI ${esc(id.slice(3))} · ${savedStatus || "Checking directory…"}</p>
      <div class="btns"><button class="ghost" data-save="${id}">Remove</button></div></li>`;
  });
  $("#savedCount").textContent = ids.length;
  $("#savedList").innerHTML = rows.join("") || '<li class="empty">Save a clinician to find them here later.</li>';
}

async function loadSaved(){
  const ids = [...saved];
  if (!ids.length) return;
  try {
    for (let start = 0; start < ids.length; start += pageSize) {
      const batch = ids.slice(start, start + pageSize).map(id => id.slice(3));
      const {providers} = await lookup({q: "NPI:(" + batch.join(" OR ") + ")", count: batch.length});
      for (const p of providers) if (saved.has(p.id)) savedProviders.set(p.id, p);
    }
    savedStatus = "No listing in the current directory";
  } catch {
    savedStatus = "Directory unavailable. Reload to try again.";
  }
  renderSaved();
}

function renderVisits(){
  $("#visits").hidden = !visits.length;
  $("#visitLink").hidden = !visits.length;
  $("#visitCount").textContent = visits.length;
  $("#visitList").innerHTML = visits.map(v => `<li class="row"><div class="av" aria-hidden="true">${esc(initials(v.provider))}</div>
    <div><h3>${esc(v.provider)}</h3><p class="meta">${esc(new Date(v.when).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}))} · Local note${v.reason ? "<br>" + esc(v.reason) : ""}</p></div>
    <div class="btns"><button class="ghost" data-calendar="${esc(v.id)}">Add to calendar</button><button class="ghost" data-del="${esc(v.id)}">Remove</button></div></li>`).join("");
}

function downloadNote(v){
  const icsText = text => String(text).replace(/[\\;,]/g, "\\$&").replace(/\r\n|\r|\n/g, "\\n");
  const dateTime = value => value.replace(/[-:]/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Herock Care Connect//Visit notes//EN",
    "BEGIN:VEVENT", "UID:" + icsText(v.id) + "@herock-care-connect",
    "DTSTAMP:" + dateTime(new Date().toISOString()).replace(/\.\d+Z$/, "Z"),
    "DTSTART:" + dateTime(v.when) + "00", "SUMMARY:" + icsText("Tentative visit with " + v.provider),
    "STATUS:TENTATIVE", "END:VEVENT", "END:VCALENDAR", ""];
  const href = URL.createObjectURL(new Blob([lines.join("\r\n")], {type: "text/calendar"}));
  Object.assign(document.createElement("a"), {href, download: "visit-note.ics"}).click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const {save, del, calendar} = button.dataset;
  if (calendar) {
    const note = visits.find(v => v.id === calendar);
    if (note) downloadNote(note);
  }
  if (save) {
    if (saved.has(save)) {
      saved.delete(save);
      savedProviders.delete(save);
    } else {
      const provider = shown.find(p => p.id === save);
      if (!provider) return;
      saved.add(save);
      savedProviders.set(save, provider);
    }
    store.set("hcc.saved", [...saved]);
    renderSaved();
    if (shown.length) renderResults(shown, total);
    const replacement = [...document.querySelectorAll("[data-save]")].find(b => b.dataset.save === save);
    (replacement || $("#savedTitle")).focus();
  }
  if (del) {
    visits = visits.filter(v => v.id !== del);
    store.set("hcc.visits", visits);
    renderVisits();
  }
});

$("#search").addEventListener("submit", event => { event.preventDefault(); search() });
renderSaved();
renderVisits();
search();
loadSaved();

// Install as an app (PWA) and offline support.
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
let deferred;
addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferred = event; $("#install").hidden = false });
$("#install").onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#install").hidden = true };
if (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) $("#iosHint").hidden = false;
