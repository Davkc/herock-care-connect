// Herock Care Connect — static app, no build step.
const DATA = [
 {id:1,name:"Dr. Amara Okafor",cred:"MD",spec:"Primary Care",clinic:"Deep Ellum Family Health",city:"Dallas",zip:"75226",addr:"2800 Main St",phone:"214-555-0141",rating:4.8,n:212,tele:true,plans:["Aetna","BlueCross","Medicare"],next:"Tomorrow 9:30 AM",soon:1},
 {id:2,name:"Dr. Luis Herrera",cred:"DO",spec:"Cardiology",clinic:"Uptown Heart Group",city:"Dallas",zip:"75201",addr:"2100 Ross Ave",phone:"214-555-0178",rating:4.9,n:340,tele:false,plans:["Cigna","Medicare","UnitedHealthcare"],next:"Nov 12, 2:00 PM",soon:7},
 {id:3,name:"Priya Nair",cred:"PA-C",spec:"Dermatology",clinic:"Lakewood Skin Clinic",city:"Dallas",zip:"75214",addr:"6465 E Mockingbird Ln",phone:"214-555-0112",rating:4.6,n:128,tele:true,plans:["Aetna","BlueCross"],next:"Today 4:15 PM",soon:0},
 {id:4,name:"Dr. Grace Whitfield",cred:"PhD",spec:"Mental Health",clinic:"Clearwater Counseling",city:"Plano",zip:"75024",addr:"5800 Legacy Dr",phone:"972-555-0166",rating:4.9,n:175,tele:true,plans:["BlueCross","Cigna","UnitedHealthcare"],next:"Nov 9, 11:00 AM",soon:4},
 {id:5,name:"Dr. Marcus Bell",cred:"DDS",spec:"Dentistry",clinic:"Oak Cliff Dental",city:"Dallas",zip:"75208",addr:"330 W Jefferson Blvd",phone:"214-555-0190",rating:4.5,n:96,tele:false,plans:["Aetna","Cigna"],next:"Nov 10, 8:00 AM",soon:5},
 {id:6,name:"Dr. Sofia Reyes",cred:"MD",spec:"Pediatrics",clinic:"Little Oaks Pediatrics",city:"Irving",zip:"75038",addr:"1200 W Airport Fwy",phone:"972-555-0133",rating:4.9,n:421,tele:true,plans:["BlueCross","Medicaid","UnitedHealthcare"],next:"Tomorrow 1:00 PM",soon:1},
 {id:7,name:"Dr. Kevin Tran",cred:"DPT",spec:"Physical Therapy",clinic:"Movewell PT",city:"Richardson",zip:"75080",addr:"1500 E Belt Line Rd",phone:"972-555-0155",rating:4.7,n:88,tele:false,plans:["Aetna","Medicare"],next:"Nov 8, 10:30 AM",soon:3},
 {id:8,name:"Dr. Naomi Banks",cred:"MD",spec:"OB-GYN",clinic:"Trinity Women's Health",city:"Fort Worth",zip:"76107",addr:"912 Montgomery St",phone:"817-555-0104",rating:4.8,n:260,tele:true,plans:["Cigna","BlueCross","Medicaid"],next:"Nov 11, 3:30 PM",soon:6},
 {id:9,name:"Dr. Omar Siddiqui",cred:"OD",spec:"Eye Care",clinic:"ClearView Optometry",city:"Dallas",zip:"75219",addr:"3939 Cedar Springs Rd",phone:"214-555-0127",rating:4.6,n:143,tele:false,plans:["Aetna","UnitedHealthcare"],next:"Nov 7, 9:00 AM",soon:2}
];
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};
let saved = store.get("hcc.saved", []), visits = store.get("hcc.visits", []), shown = [], pool = DATA;

const fill = (el, items) => items.forEach(v => el.add(new Option(v, v)));
fill($("#spec"), [...new Set(DATA.map(d => d.spec))].sort());
fill($("#plan"), [...new Set(DATA.flatMap(d => d.plans))].sort());

function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2400) }
const initials = n => n.replace(/^Dr\.\s*/, "").split(" ").map(w => w[0]).slice(0, 2).join("");

function rowHTML(p, mode){
  const isSaved = saved.includes(p.id);
  const tags = [p.tele ? '<span class="tag">Video visits</span>' : "", ...p.plans.map(x => `<span class="tag">${esc(x)}</span>`)].join("");
  return `<li class="row"><div class="av" aria-hidden="true">${esc(initials(p.name))}</div>
  <div><h3>${esc(p.name)}, ${esc(p.cred)}</h3>
  <p class="meta">${esc(p.spec)} at ${esc(p.clinic)}<br>${esc(p.addr)}, ${esc(p.city)} ${esc(p.zip)} · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></p>
  <div class="tags">${p.next ? `<span class="tag next">Next: ${esc(p.next)}</span>` : ""}${p.rating ? `<span class="tag">${p.rating} stars (${p.n})</span>` : ""}${tags}</div></div>
  <div class="btns"><button class="go" data-book="${p.id}">Request visit</button>
  <button class="ghost" data-save="${p.id}" aria-pressed="${isSaved}">${isSaved ? "Saved" : "Save"}</button></div></li>`;
}
const all = () => [...DATA, ...pool.filter(p => p.live)];

function render(){
  $("#results").innerHTML = shown.length ? shown.map(p => rowHTML(p)).join("") : '<li class="empty">No matches. Try a nearby ZIP, remove a filter, or search the live NPI registry.</li>';
  $("#resultsTitle").textContent = `${shown.length} clinician${shown.length === 1 ? "" : "s"} found`;
  const s = all().filter(p => saved.includes(p.id));
  $("#savedList").innerHTML = s.length ? s.map(p => rowHTML(p)).join("") : '<li class="empty">Save a clinician to compare options later.</li>';
  $("#visitList").innerHTML = visits.length ? visits.map(v => `<li class="row"><div class="av" aria-hidden="true">${esc(initials(v.provider))}</div>
    <div><h3>${esc(v.provider)}</h3><p class="meta">${esc(new Date(v.when).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}))} · ${esc(v.status)}${v.reason ? "<br>" + esc(v.reason) : ""}</p></div>
    <div class="btns"><button class="ghost" data-ics="${v.id}">Add to calendar</button><button class="ghost" data-del="${v.id}">Remove</button></div></li>`).join("")
    : '<li class="empty">Requests you send appear here, with a calendar download for each.</li>';
  $("#savedCount").textContent = saved.length; $("#visitCount").textContent = visits.length;
}

function search(){
  const where = $("#where").value.trim().toLowerCase(), spec = $("#spec").value, q = $("#q").value.trim().toLowerCase(), plan = $("#plan").value, tele = $("#tele").checked, sort = $("#sort").value;
  const zip = /^\d{5}$/.test(where) ? where : "";
  shown = DATA.filter(p => (!where || (zip ? p.zip.slice(0, 3) === zip.slice(0, 3) : p.city.toLowerCase().includes(where) || p.zip.startsWith(where)))
    && (!spec || p.spec === spec) && (!plan || p.plans.includes(plan)) && (!tele || p.tele)
    && (!q || (p.name + p.clinic).toLowerCase().includes(q)));
  shown.sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "name" ? a.name.localeCompare(b.name) : a.soon - b.soon);
  render();
}

// Optional live lookup. If the browser or network blocks it, the sample directory stays in place.
async function liveSearch(){
  const zip = $("#where").value.trim();
  if(!/^\d{5}$/.test(zip)) return toast("Enter a 5-digit ZIP code for live search");
  const spec = $("#spec").value, notice = $("#notice");
  notice.textContent = "Searching the NPI registry…";
  try {
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-1&postal_code=${zip}&limit=20${spec ? "&taxonomy_description=" + encodeURIComponent(spec) : ""}`;
    const r = await fetch(url); if(!r.ok) throw new Error("bad status");
    const j = await r.json();
    const live = (j.results || []).map(x => {
      const a = x.addresses.find(a => a.address_purpose === "LOCATION") || x.addresses[0], t = x.taxonomies[0] || {};
      return {id:"npi" + x.number, live:true, name:`${x.basic.first_name} ${x.basic.last_name}`.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()), cred:(x.basic.credential || "").replace(/\./g, ""), spec:t.desc || "Clinician", clinic:"NPI " + x.number, city:a.city, zip:(a.postal_code || "").slice(0, 5), addr:a.address_1 || "", phone:a.telephone_number || "", plans:[], next:"", rating:0, n:0, tele:false};
    });
    pool = [...DATA, ...live]; shown = live; render();
    notice.textContent = `Live results from the public NPI registry for ${zip}. Confirm availability and insurance with the clinic.`;
  } catch {
    notice.textContent = "The live registry could not be reached from this browser, so the sample directory is showing instead.";
    search();
  }
}

// Booking
let booking = null;
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return;
  const find = id => all().find(p => String(p.id) === String(id));
  if(b.dataset.book){ booking = find(b.dataset.book); $("#bookTitle").textContent = "Request a visit with " + booking.name; $("#book").showModal() }
  if(b.dataset.save){ const id = find(b.dataset.save).id; saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; store.set("hcc.saved", saved); render() }
  if(b.dataset.del){ visits = visits.filter(v => v.id !== b.dataset.del); store.set("hcc.visits", visits); render() }
  if(b.dataset.ics){ downloadICS(visits.find(v => v.id === b.dataset.ics)) }
});
$("#cancel").onclick = () => $("#book").close();
$("#bookForm").addEventListener("submit", e => {
  const f = new FormData(e.target);
  visits.unshift({id:String(Date.now()), provider:booking.name, clinic:booking.clinic, when:f.get("when"), reason:f.get("reason"), status:"Request sent"});
  store.set("hcc.visits", visits); e.target.reset(); render(); toast("Request saved. The clinic will confirm by phone or email.");
});
function downloadICS(v){
  const d = v.when.replace(/[-:]/g, "") + "00";
  const ics = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`UID:${v.id}@herock-care-connect`,`DTSTART:${d}`,`SUMMARY:Appointment with ${v.provider}`,`LOCATION:${v.clinic}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
  const a = Object.assign(document.createElement("a"), {href:URL.createObjectURL(new Blob([ics], {type:"text/calendar"})), download:"appointment.ics"});
  a.click(); URL.revokeObjectURL(a.href);
}

$("#search").addEventListener("submit", e => { e.preventDefault(); search() });
["spec", "plan", "sort", "tele"].forEach(id => $("#" + id).addEventListener("change", search));
$("#liveBtn").onclick = liveSearch;
search();

// Install as an app (PWA) and offline support
if("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
let deferred;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; $("#install").hidden = false });
$("#install").onclick = async () => { if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#install").hidden = true };
if(/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) $("#iosHint").hidden = false;
