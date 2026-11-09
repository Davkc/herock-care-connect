// Herock Care Connect — static app, no build step.
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } },
  set(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); return true }
    catch { return false }
  }
};
const directory = "https://clinicaltables.nlm.nih.gov/api/npi_idv/v3/search";
const pageSize = 30;
const isProviderId = id => typeof id === "string" && /^npi\d{10}$/.test(id);
const saved = new Set(store.get("hcc.saved", []).filter(isProviderId));
const savedProviders = new Map();
const sharedProviders = new Map();
const comparison = new Map();
const shareLimit = 100;
let sharedIds = [];
let sharedStatus = "";
let visits = store.get("hcc.visits", []);
let searchRequest;
let savedStatus = "";
let noteProvider;

const initials = name => name.split(/[\s,]+/).slice(0, 2).map(part => part[0]).join("");

function providerRow(p){
  const isSaved = saved.has(p.id);
  const isCompared = comparison.has(p.id);
  const phone = p.phone.replace(/\D/g, "");
  const directions = p.address ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(p.address) : "";
  return `<li class="row"><div class="av" aria-hidden="true">${esc(initials(p.name))}</div>
  <div><h3>${esc(p.name)}</h3>
  <p class="meta">${esc(p.specialty || "Specialty unlisted")}</p>
  <p class="meta">${esc(p.address || "Practice address unlisted")}${directions ? ` · <a href="${directions}" target="_blank" rel="noopener">Directions</a>` : ""}</p>
  <p class="meta">${phone ? `<a href="tel:${phone}">Call ${esc(p.phone)}</a> · ` : ""}
  <a href="https://npiregistry.cms.hhs.gov/provider-view/${p.npi}">NPI ${p.npi}</a></p></div>
  <div class="btns">
    <button class="ghost" data-save="${p.id}" aria-pressed="${isSaved}">${isSaved ? "Saved" : "Save"}</button>
    <button class="ghost" data-compare="${p.id}" aria-pressed="${isCompared}" ${!isCompared && comparison.size === 3 ? "disabled" : ""}>Compare</button>
    <button class="ghost" data-note="${p.id}">Save visit note</button>
  </div></li>`;
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
  const ordered = $("#sort").value === "name"
    ? [...providers].sort((a, b) => a.name.localeCompare(b.name))
    : providers;
  $("#resultsTitle").textContent = total > providers.length
    ? "Showing " + providers.length + " results"
    : providers.length + (providers.length === 1 ? " clinician found" : " clinicians found");
  $("#results").innerHTML = providers.length
    ? ordered.map(providerRow).join("")
    : '<li class="empty">No directory matches. Try another ZIP code or city, or remove a filter.</li>';
}

let shown = [];
let total = 0;
let hasResults = false;

async function search(){
  searchRequest?.abort();
  const request = new AbortController();
  searchRequest = request;
  const location = locationFilter($("#where").value.trim());
  shown = [];
  hasResults = false;
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
  store.set("hcc.where", $("#where").value.trim());
  try {
    const result = await lookup({
      q: location + specialty, terms, count: pageSize, sf: "NPI,name.full"
    }, request.signal);
    if (request.signal.aborted) return;
    ({providers: shown, total} = result);
    hasResults = true;
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
  $("#share").disabled = !ids.length;
  $("#savedList").innerHTML = rows.join("") || '<li class="empty">Save a clinician to find them here later.</li>';
}

async function* lookupIds(ids){
  for (let start = 0; start < ids.length; start += pageSize) {
    const batch = ids.slice(start, start + pageSize).map(id => id.slice(3));
    const {providers} = await lookup({q: "NPI:(" + batch.join(" OR ") + ")", count: batch.length});
    yield* providers;
  }
}

async function loadSaved(){
  const ids = [...saved];
  if (!ids.length) return;
  try {
    for await (const p of lookupIds(ids)) if (saved.has(p.id)) savedProviders.set(p.id, p);
    savedStatus = "No listing in the current directory";
  } catch {
    savedStatus = "Directory unavailable. Reload to try again.";
  }
  renderSaved();
}

function renderShared(){
  $("#sharedStatus").textContent = sharedStatus;
  $("#sharedList").innerHTML = sharedIds.filter(id => sharedProviders.has(id))
    .map(id => providerRow(sharedProviders.get(id))).join("");
}

async function loadShared(){
  const raw = new URLSearchParams(location.search).get("shortlist");
  if (raw === null) return;
  $("#shared").hidden = false;
  const ids = raw.split(",");
  if (ids.length > shareLimit || !ids.every(isProviderId)) {
    sharedStatus = "This shortlist link is invalid.";
    renderShared();
    return;
  }
  sharedIds = [...new Set(ids)];
  sharedStatus = "Checking the directory…";
  renderShared();
  try {
    for await (const p of lookupIds(sharedIds)) sharedProviders.set(p.id, p);
    const missing = sharedIds.filter(id => !sharedProviders.has(id)).length;
    sharedStatus = missing ? `Directory listings unavailable for ${missing} of ${sharedIds.length} shared NPIs.` : "";
  } catch {
    sharedStatus = "The directory could not be reached. Reload to try again.";
  }
  renderShared();
}

$("#share").onclick = async () => {
  const status = $("#shareStatus");
  if (saved.size > shareLimit) {
    status.textContent = `Share links support up to ${shareLimit} clinicians.`;
    return;
  }
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("shortlist", [...saved].join(","));
  try {
    await navigator.clipboard.writeText(url.href);
    status.textContent = "Shortlist link copied.";
  } catch {
    status.replaceChildren("Copy this link: ", Object.assign(document.createElement("a"), {href: url.href, textContent: url.href}));
  }
};

function renderComparison(){
  $("#compareBar").hidden = !comparison.size;
  $("#compareOpen").disabled = comparison.size < 2;
  $("#compareCount").textContent = `${comparison.size} of 3 selected`;
  for (const button of document.querySelectorAll("[data-compare]")) {
    const selected = comparison.has(button.dataset.compare);
    button.setAttribute("aria-pressed", selected);
    button.disabled = !selected && comparison.size === 3;
  }
}

function showDetails(title, content){
  $("#detailTitle").textContent = title;
  $("#detailBody").innerHTML = content;
  $("#detailDialog").showModal();
}

$("#compareOpen").onclick = () => {
  const providers = [...comparison.values()];
  const fields = [["Specialty", p => p.specialty], ["Practice address", p => p.address], ["Phone", p => p.phone], ["NPI", p => p.npi]];
  showDetails("Compare clinicians", `<div class="comparison-table" tabindex="0"><table>
    <thead><tr><th scope="col">Directory field</th>${providers.map(p => `<th scope="col">${esc(p.name)}</th>`).join("")}</tr></thead>
    <tbody>${fields.map(([label, value]) => `<tr><th scope="row">${label}</th>${providers.map(p => `<td>${esc(value(p) || "Unlisted")}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`);
};
$("#compareClear").onclick = () => {
  const first = [...document.querySelectorAll("[data-compare]")].find(button => comparison.has(button.dataset.compare));
  comparison.clear();
  renderComparison();
  (first || $("#where")).focus();
};

function renderVisits(){
  $("#visits").hidden = !visits.length;
  $("#visitLink").hidden = !visits.length;
  $("#visitCount").textContent = visits.length;
  $("#visitList").innerHTML = visits.map(v => `<li class="row"><div class="av" aria-hidden="true">${esc(initials(v.provider))}</div>
    <div><h3>${esc(v.provider)}</h3><p class="meta">${esc(new Date(v.when).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}))} · Local note${v.reason ? "<br>" + esc(v.reason) : ""}</p></div>
    <div class="btns"><button class="ghost" data-prep="${esc(v.id)}">Visit prep</button><button class="ghost" data-calendar="${esc(v.id)}">Add to calendar</button><button class="ghost" data-del="${esc(v.id)}">Remove</button></div></li>`).join("");
}

function download(content, type, filename){
  const href = URL.createObjectURL(new Blob([content], {type}));
  Object.assign(document.createElement("a"), {href, download: filename}).click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function downloadNote(v){
  const icsText = text => String(text).replace(/[\\;,]/g, "\\$&").replace(/\r\n|\r|\n/g, "\\n");
  const dateTime = value => value.replace(/[-:]/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Herock Care Connect//Visit notes//EN",
    "BEGIN:VEVENT", "UID:" + icsText(v.id) + "@herock-care-connect",
    "DTSTAMP:" + dateTime(new Date().toISOString()).replace(/\.\d+Z$/, "Z"),
    "DTSTART:" + dateTime(v.when) + "00", "SUMMARY:" + icsText("Tentative visit with " + v.provider),
    "STATUS:TENTATIVE", "END:VEVENT", "END:VCALENDAR", ""];
  download(lines.join("\r\n"), "text/calendar", "visit-note.ics");
}

function showVisitPrep(v){
  const when = new Date(v.when).toLocaleString([], {dateStyle: "long", timeStyle: "short"});
  const text = [
    "Visit with " + v.provider, "Planned for " + when, v.address || v.clinic, v.reason, "",
    "Bring: photo ID, insurance card, medication list, and relevant records.", "",
    "Questions and notes:", ""
  ].filter(value => value != null).join("\n");
  showDetails("Visit prep", `<label for="prepText">Edit your checklist before downloading</label>
    <textarea id="prepText" rows="12">${esc(text)}</textarea>
    <div class="control-row">
      <button id="prepCopy" type="button" class="ghost">Copy checklist</button>
      <button id="prepDownload" type="button" class="ghost">Download checklist</button>
    </div>
    <p id="prepStatus" class="notice" role="status"></p>`);
  $("#prepCopy").onclick = async () => {
    const checklist = $("#prepText");
    const status = $("#prepStatus");
    try {
      await navigator.clipboard.writeText(checklist.value);
      status.textContent = "Checklist copied.";
    } catch {
      checklist.select();
      status.textContent = "The checklist is selected. Use your device’s copy command.";
    }
  };
  $("#prepDownload").onclick = () => download($("#prepText").value, "text/plain", "visit-prep.txt");
}

$("#noteCancel").onclick = () => $("#noteDialog").close();
$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const visit = {
    id: crypto.randomUUID(),
    provider: noteProvider.name,
    address: noteProvider.address,
    when: form.get("when"),
    reason: form.get("reason").trim()
  };
  const updated = [visit, ...visits];
  if (!store.set("hcc.visits", updated)) {
    $("#noteStatus").textContent = "Could not save this note on your device. Check your browser’s storage settings.";
    return;
  }
  visits = updated;
  renderVisits();
  $("#noteDialog").close();
  $("#visitLink").focus();
});

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const {save, del, calendar, compare, note, prep} = button.dataset;
  const id = save || compare || note;
  const provider = id && (shown.find(p => p.id === id) || savedProviders.get(id) || sharedProviders.get(id));
  if (compare && provider) {
    if (comparison.has(compare)) comparison.delete(compare);
    else if (comparison.size < 3) comparison.set(compare, provider);
    renderComparison();
  }
  if (note && provider) {
    noteProvider = provider;
    $("#noteTitle").textContent = "Visit note for " + provider.name;
    $("#noteForm").reset();
    $("#noteStatus").textContent = "";
    $("#noteDialog").showModal();
  }
  if (prep) {
    const visit = visits.find(v => v.id === prep);
    if (visit) showVisitPrep(visit);
  }
  if (calendar) {
    const note = visits.find(v => v.id === calendar);
    if (note) downloadNote(note);
  }
  if (save) {
    if (saved.has(save)) {
      saved.delete(save);
      savedProviders.delete(save);
    } else {
      if (!provider) return;
      saved.add(save);
      savedProviders.set(save, provider);
    }
    store.set("hcc.saved", [...saved]);
    const list = button.closest("ul");
    renderSaved();
    renderShared();
    if (shown.length) renderResults(shown, total);
    const replacement = [...list.querySelectorAll("[data-save]")].find(b => b.dataset.save === save);
    (replacement || $("#savedTitle")).focus();
  }
  if (del) {
    visits = visits.filter(v => v.id !== del);
    store.set("hcc.visits", visits);
    renderVisits();
  }
});

const spec = $("#spec");
const quick = $("#quick");
for (const option of spec.querySelectorAll("[data-quick]")) {
  const button = Object.assign(document.createElement("button"), {className: "ghost", type: "button", textContent: option.textContent, value: option.value});
  button.setAttribute("aria-pressed", "false");
  button.onclick = () => {
    spec.value = spec.value === option.value ? "" : option.value;
    updateQuickFilters();
    $("#search").requestSubmit();
  };
  quick.append(button);
}
function updateQuickFilters(){
  for (const button of quick.children) button.setAttribute("aria-pressed", button.value === spec.value);
}

const theme = $("#theme");
theme.value = document.documentElement.dataset.theme || "auto";
theme.onchange = () => {
  if (theme.value === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
  try { localStorage.setItem("hcc.theme", theme.value) } catch {}
};

spec.onchange = updateQuickFilters;
$("#sort").onchange = () => { if (hasResults) renderResults(shown, total) };
$("#where").value = store.get("hcc.where", store.get("hcc.prefs", {})?.where || $("#where").value) || $("#where").value;
$("#search").addEventListener("submit", event => { event.preventDefault(); search() });
$("#search").addEventListener("reset", () => queueMicrotask(() => {
  updateQuickFilters();
  search();
}));
renderSaved();
renderVisits();
search();
loadSaved();
loadShared();

// Install as an app (PWA) and offline support.
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
let deferred;
addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferred = event; $("#install").hidden = false });
$("#install").onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#install").hidden = true };
if (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) $("#iosHint").hidden = false;
