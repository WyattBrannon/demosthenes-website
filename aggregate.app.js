// Ensure waitForMemberAggregate is always globally available
window.waitForMemberAggregate = async function() {
  for (let i = 0; i < 20; i++) {
    if (typeof window.fetchMemberAggregate === "function") return window.fetchMemberAggregate;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("[DataVisualizer] fetchMemberAggregate not available after waiting");
};


// === Data Visualizer: Univariate stats table helpers ===
function dv_getPath(obj, path) {
  try { return path.split('.').reduce((o,k)=> (o==null ? undefined : o[k]), obj); } catch { return undefined; }
}
function dv_num(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "string") v = v.replace(/[,$\s]/g, "");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function dv_computeStats(values) {
  if (!values.length) return { mean: 0, median: 0, sd: 0 };
  const mean = values.reduce((a,b)=>a+b,0) / values.length;
  const sorted = values.slice().sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length/2);
  const median = (sorted.length % 2) ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  const sd = Math.sqrt(sorted.reduce((s,v)=> s + Math.pow(v-mean,2), 0) / values.length);
  return { mean, median, sd };
}
function updateUnivariateTable(members, path) {
  const rows = document.querySelectorAll("#uniStatsContainer tbody tr");
  if (!rows.length) return;
  const dems = members.filter(m => (m.identity && (m.identity.party === "D" || m.identity.party === "I")));
  const reps = members.filter(m => (m.identity && m.identity.party === "R"));
  const valsAll = members.map(m => dv_num(dv_getPath(m, path))).filter(Number.isFinite);
  const valsD = dems.map(m => dv_num(dv_getPath(m, path))).filter(Number.isFinite);
  const valsR = reps.map(m => dv_num(dv_getPath(m, path))).filter(Number.isFinite);
  const allStats = dv_computeStats(valsAll);
  const dStats = dv_computeStats(valsD);
  const rStats = dv_computeStats(valsR);
  function setRow(row, key) {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 3) {
      cells[0].textContent = dStats[key].toFixed(2);
      cells[1].textContent = rStats[key].toFixed(2);
      cells[2].textContent = allStats[key].toFixed(2);
    }
  }
  setRow(rows[0], "mean");
  setRow(rows[1], "median");
  setRow(rows[2], "sd");
}

// aggregate.app.js — clean rebuild
(function(){
  "use strict";

  // ---------- Constants ----------
  const BLUE = "#0B5FFF";
  const DARK = "#111";
  const BORDER = "var(--border, #e5e7eb)";
  const HOUSE_URL  = "https://wyattbrannon.github.io/demosthenes-data/districts/house_districts_parties.geojson";
  const SENATE_URL = "https://wyattbrannon.github.io/demosthenes-data/districts/states_senate_parties.geojson";

  let _map = null;
  let _overlay = null;
  let _currentView = "house";     // house | senate
  let _currentMode = "party";     // party | ideology

  // ---------- Helpers ----------
  function ready(fn){
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once:true });
    } else {
      fn();
    }
  }

  function partyInitial(p){
    if(!p) return "";
    const s = String(p).trim().toLowerCase();
    if(s[0]==='d') return 'D';
    if(s[0]==='r') return 'R';
    if(s[0]==='i') return 'I';
    return s[0] ? s[0].toUpperCase() : '';
  }

  // ---------- Tabs (row 1: House/Senate) ----------
  function ensureHeader(){
    const card = document.getElementById("headerCard");
    if (!card) return null;
    let titleEl = card.querySelector(".section-title");
    if (!titleEl){
      titleEl = document.createElement("div");
      titleEl.className = "section-title";
      titleEl.textContent = "The 119th Congress";
      card.prepend(titleEl);
    }
    return card;
  }

  function styleTabsContainer(el){
    el.classList.add("mv-tabs");
    el.style.display = "grid";
    el.style.width = "100%";
    el.style.gridTemplateColumns = "1fr 1fr";
    el.style.gap = "8px";
  }

  function baseButtonStyle(btn){
    btn.classList.add("btn","tab");
    btn.style.width = "100%";
    btn.style.boxSizing = "border-box";
    btn.style.display = "block";
    btn.style.padding = "12px 14px";
    btn.style.border = `1px solid ${BORDER}`;
    btn.style.borderRadius = "12px";
    btn.style.background = "#fff";
    btn.style.color = DARK;
    btn.style.fontWeight = "600";
    btn.style.textAlign = "center";
    btn.style.textDecoration = "none";
    btn.setAttribute("role","tab");
    btn.type = "button";
  }

  function setActive(tabsEl, activeBtn){
    const buttons = tabsEl.querySelectorAll(".tab");
    buttons.forEach(btn => {
      const isActive = (btn === activeBtn);
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.style.background = isActive ? BLUE : "#fff";
      btn.style.color = isActive ? "#fff" : DARK;
      btn.style.borderColor = isActive ? BLUE : "var(--border, #e5e7eb)";
      btn.style.boxShadow = isActive ? `inset 0 0 0 1px ${BLUE}` : "none";
    });
  }

  function buildChamberTabs(){
    const card = ensureHeader();
    if (!card) return;

    const old = card.querySelector("#agg-chamber-tabs");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.className = "mv-tabs-wrap";
    wrap.style.width = "100%";
    wrap.style.maxWidth = "100%";
    wrap.style.display = "block";
    wrap.style.margin = "12px 0 6px 0";

    const tabs = document.createElement("div");
    tabs.id = "agg-chamber-tabs";
    styleTabsContainer(tabs);

    const bHouse = document.createElement("button");
    bHouse.dataset.view = "house";
    bHouse.textContent = "House";
    baseButtonStyle(bHouse);

    const bSenate = document.createElement("button");
    bSenate.dataset.view = "senate";
    bSenate.textContent = "Senate";
    baseButtonStyle(bSenate);

    tabs.appendChild(bHouse);
    tabs.appendChild(bSenate);
    wrap.appendChild(tabs);

    const titleEl = card.querySelector(".section-title");
    if (titleEl) titleEl.insertAdjacentElement("afterend", wrap);
    else card.appendChild(wrap);

    tabs.addEventListener("click", (ev) => {
      const btn = ev.target;
      if (!btn || !btn.classList || !btn.classList.contains("tab")) return;
      setActive(tabs, btn);
      const view = btn.dataset.view || "house";
      _currentView = view;
      updateOverlayForView(view);
    });

    setActive(tabs, bHouse);
  }

  // ---------- Tabs (row 2: By Party / By Ideology) ----------
  function buildModeTabs(){
    const card = document.getElementById("headerCard");
    if (!card) return;

    const old = card.querySelector("#agg-mode-tabs");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.className = "mv-tabs-wrap";
    wrap.style.width = "100%";
    wrap.style.maxWidth = "100%";
    wrap.style.display = "block";
    wrap.style.margin = "8px 0 6px 0";

    const tabs = document.createElement("div");
    tabs.id = "agg-mode-tabs";
    styleTabsContainer(tabs);

    const bParty = document.createElement("button");
    bParty.dataset.mode = "party";
    bParty.textContent = "By Party";
    baseButtonStyle(bParty);

    const bIdeol = document.createElement("button");
    bIdeol.dataset.mode = "ideology";
    bIdeol.textContent = "By Ideology";
    baseButtonStyle(bIdeol);

    tabs.appendChild(bParty);
    tabs.appendChild(bIdeol);
    wrap.appendChild(tabs);

    const afterEl = card.querySelector("#agg-chamber-tabs") || card.querySelector(".section-title");
    if (afterEl) afterEl.insertAdjacentElement("afterend", wrap);
    else card.appendChild(wrap);

    tabs.addEventListener("click", (ev) => {
      const btn = ev.target;
      if (!btn || !btn.classList || !btn.classList.contains("tab")) return;
      setActive(tabs, btn);
      _currentMode = btn.dataset.mode || "party";
      // Re-render overlay with the new styling mode
      try { updateOverlayForView(_currentView); } catch(e) { console.warn("[aggregate] mode switch redraw failed", e); }
    });

    setActive(tabs, bParty);
  }

  // ---------- Leaflet & Map ----------
  function ensureLeafletLoaded(){
    return new Promise((resolve, reject) => {
      if (window.L && typeof window.L.map === "function") return resolve();
      const cssId = "leaflet-css";
      if (!document.getElementById(cssId)){
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const jsId = "leaflet-js";
      if (!document.getElementById(jsId)){
        const s = document.createElement("script");
        s.id = jsId;
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Leaflet"));
        document.head.appendChild(s);
      } else {
        const iv = setInterval(() => {
          if (window.L && typeof window.L.map === "function") { clearInterval(iv); resolve(); }
        }, 50);
      }
    });
  }

  function ensureMapContainer(){
    const card = document.getElementById("headerCard");
    if (!card) return null;

    let mapWrap = card.querySelector("#agg-map-wrap");
    if (!mapWrap){
      mapWrap = document.createElement("div");
      mapWrap.id = "agg-map-wrap";
      mapWrap.style.marginTop = "8px";

      const mapDiv = document.createElement("div");
      mapDiv.id = "agg-district-map";
      mapDiv.style.height = "360px";
      mapDiv.style.borderRadius = "12px";
      mapDiv.style.overflow = "hidden";
      mapDiv.style.border = `1px solid ${BORDER}`;
      mapDiv.setAttribute("aria-label","District map");

      const note = document.createElement("div");
      note.id = "agg-map-note";
      note.className = "muted";
      note.style.marginTop = "8px";
      note.style.fontSize = ".9rem";

      mapWrap.appendChild(mapDiv);
      mapWrap.appendChild(note);
      const afterEl = card.querySelector("#agg-mode-tabs") || card.querySelector("#agg-chamber-tabs") || card.querySelector(".section-title");
      if (afterEl) afterEl.insertAdjacentElement("afterend", mapWrap);
      else card.appendChild(mapWrap);
    }
    return mapWrap;
  }

  function initMap(){
    const mapEl = document.getElementById("agg-district-map");
    if (!mapEl) return;

    if (_map) { _map.remove(); _map = null; }
    _map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: true, worldCopyJump: true });
    _map.setMinZoom(3);
    try { _map.setMaxBounds([[5,-170],[75,-50]]); _map.setMaxBoundsViscosity(0.8); } catch(e){}

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(_map);

    _map.setView([39.8, -98.6], 4);
    setTimeout(function(){ try{ _map.invalidateSize(); }catch(e){} }, 0);
  }

  function styleFeature(feature){
    var props = (feature && feature.properties) ? feature.properties : {};
    var col = (_currentMode === 'ideology'
      ? (props.ideology_color || props.color)
      : (props.color || props.ideology_color)) || '#999';
    return {
      color: "#111",
      weight: 0.7,
      fillColor: col,
      fillOpacity: 0.55,
      opacity: 0.8
    };
  }

  async function loadOverlay(url, view){
    const note = document.getElementById("agg-map-note");
    try{
      if (_overlay) { _map.removeLayer(_overlay); _overlay = null; }
      note && (note.textContent = "Loading overlay…");
      const vurl = url + (url.indexOf('?')>=0 ? '&' : '?') + 'ts=' + Date.now();
      const res = await fetch(vurl, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const gj = await res.json();
      _overlay = L.geoJSON(gj, {
        style: styleFeature,
        onEachFeature: function (feature, layer) {
          try {
            var p = feature && feature.properties ? feature.properties : {};
            var st = (p.state || p.STUSPS || '').toUpperCase();
            var html;
            if (view === 'senate') {
              var n1 = p.sen_name1 || p.senator1_name || (p.senators && p.senators[0] && p.senators[0].name) || '';
              var n2 = p.sen_name2 || p.senator2_name || (p.senators && p.senators[1] && p.senators[1].name) || '';
              var pr1 = p.sen_party1 || p.senator1_party || (p.senators && p.senators[0] && p.senators[0].party) || '';
              var pr2 = p.sen_party2 || p.senator2_party || (p.senators && p.senators[1] && p.senators[1].party) || '';
              html = (n1 ? (n1 + ' (' + partyInitial(pr1) + '-' + st + ')') : '') +
                     (n2 ? ( (n1 ? ', ' : '') + n2 + ' (' + partyInitial(pr2) + '-' + st + ')') : '');
              if (!html) html = st || 'Senate';
            } else {
              var nm = p.name || p.member_name || (p.member && p.member.name) || p.official_full || p.full_name || '';
              var pr = p.party || (p.parties ? String(p.parties).split(',')[0] : '');
              html = nm ? (nm + ' (' + partyInitial(pr) + '-' + st + ')') : (st || 'House');
            }
            layer.bindTooltip(html, {sticky:true, direction:'top'});
          } catch(e) { /* noop */ }
        }
      });
      _overlay.addTo(_map);
      try{
        const b = _overlay.getBounds();
        if (b && b.isValid()) { _map.fitBounds(b.pad(0.02)); } else { _map.setView([39.8, -98.6], 4); }
        _map.invalidateSize();
      } catch {}

      // Update counts from GeoJSON
      try{ updateCountsFromGeoJSON(view, gj); }catch(e){ console.warn("[aggregate] counts update skip", e); }

      note && (note.textContent = "");
      try{ if(gj && gj.features && gj.features[0]){ console.debug("[aggregate] sample props", Object.keys(gj.features[0].properties||{})); } }catch(e){}
    } catch(err){
      note && (note.textContent = "Overlay unavailable: " + (err && err.message ? err.message : String(err)));
      console.error("[aggregate] overlay fail", err);
    }
  }

  function updateOverlayForView(view){
    if (!_map) return;
    if (view === "senate") {
      loadOverlay(SENATE_URL, 'senate');
    } else {
      loadOverlay(HOUSE_URL, 'house');
    }
  }

  // ---------- Counts UI ----------
  function ensureCountsUI(){
    const wrap = document.getElementById("agg-map-wrap");
    if (!wrap) return null;

    let block = document.getElementById("agg-counts");
    if (!block){
      block = document.createElement("div");
      block.id = "agg-counts";
      block.style.marginTop = "10px";

      function makeRow(id, isBold){
        const row = document.createElement("div");
        row.id = id;
        row.className = "section-title";
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "baseline";
        row.style.fontWeight = isBold ? "700" : "500";
        return row;
      }

      const hdr = makeRow("agg-counts-hdr", true);
      const hdrL = document.createElement("div");
      hdrL.textContent = "Democrats";
      const hdrR = document.createElement("div");
      hdrR.textContent = "Republicans";
      hdr.appendChild(hdrL);
      hdr.appendChild(hdrR);

      const vals = makeRow("agg-counts-vals", false);
      const valL = document.createElement("div");
      valL.id = "agg-count-d";
      valL.textContent = "—";
      const valR = document.createElement("div");
      valR.id = "agg-count-r";
      valR.textContent = "—";
      vals.appendChild(valL);
      vals.appendChild(valR);

      block.appendChild(hdr);
      block.appendChild(vals);
      wrap.appendChild(block);
    }
    return block;
  }

  function partyToBucket(p){
    if(!p) return "";
    const s = String(p).trim().toLowerCase();
    if (s.startsWith("r")) return "R";
    if (s.startsWith("d") || s.startsWith("i")) return "D";
    return "";
  }

  function updateCountsFromGeoJSON(view, gj){
    try{
      ensureCountsUI();
      const outD = document.getElementById("agg-count-d");
      const outR = document.getElementById("agg-count-r");
      if (!outD || !outR) return;

      let d = 0, r = 0;

      if (view === "senate"){
        const feats = (gj && gj.features) ? gj.features : [];
        for (let i=0;i<feats.length;i++){
          const p = feats[i].properties || {};
          const p1 = partyToBucket(p.sen_party1 || (p.senators && p.senators[0] && p.senators[0].party));
          const p2 = partyToBucket(p.sen_party2 || (p.senators && p.senators[1] && p.senators[1].party));
          if (p1 === "D") d++; else if (p1 === "R") r++;
          if (p2 === "D") d++; else if (p2 === "R") r++;
        }
      } else {
        const feats = (gj && gj.features) ? gj.features : [];
        for (let i=0;i<feats.length;i++){
          const p = feats[i].properties || {};
          let pr = p.party || "";
          if (!pr && p.parties){
            pr = String(p.parties).split(",")[0];
          }
          const b = partyToBucket(pr);
          if (b === "D") d++; else if (b === "R") r++;
        }
      }

      outD.textContent = String(d);
      outR.textContent = String(r);
    } catch(e){
      console.error("[aggregate] counts update failed", e);
    }
  }
  // ---------- Voting Record Insets (aggregate; aligned to advanced) ----------
  function ensureAggregateVotingSquares(){
    try{
      var titles = document.querySelectorAll(".card .section-title");
      var vrCard = null;
      for (var i=0;i<titles.length;i++){
        var t = titles[i];
        var txt = (t.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
        if (txt === "voting record"){ vrCard = t.closest(".card") || t.parentElement; break; }
      }
      if (!vrCard) return;
      if (vrCard.querySelector(".agg-vr-wrap")) return;

      if (!document.getElementById("agg-vr-style")){
        var st = document.createElement("style");
        st.id = "agg-vr-style";
        
st.textContent = `
  .vr-tt{ position:fixed; z-index:99999; pointer-events:none; background:#111; color:#fff; font-size:12px; line-height:1; padding:6px 8px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.25); opacity:0; transform:translateY(-2px); transition:opacity 0.06s ease, transform 0.06s ease; white-space:nowrap; }
  .vr-tt.show{ opacity:1; transform:translateY(0); }

  .agg-vr-wrap{ display:flex; flex-wrap:wrap; gap:16px; margin-top:8px; justify-content:center; align-items:flex-start; }
  .vr-inset-wrap{ position:relative; width:auto; height:auto; max-width:100%; }
  .vr-inset{ position:absolute; left:12px; top:0; width:180px; height:180px; border-radius:12px;
    border:1px solid rgba(0,0,0,0.08); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.08);
    background-color:#ffffff; }
  .vr-inset.ideology{
    background:
      radial-gradient(120% 120% at 0% 0%, rgba(255,0,0,0.95), rgba(255,0,0,0) 60%),
      radial-gradient(120% 120% at 100% 0%, rgba(0,102,255,0.95), rgba(0,102,255,0) 60%),
      radial-gradient(120% 120% at 0% 100%, rgba(16,185,129,0.95), rgba(16,185,129,0) 60%),
      radial-gradient(120% 120% at 100% 100%, rgba(255,214,0,0.95), rgba(255,214,0,0) 60%);
  }
  .vr-inset.party{
    background:
      
      linear-gradient(to left, rgba(220,53,69,0.50), rgba(255,255,255,0) 70%),
      linear-gradient(to bottom, rgba(13,110,253,0.50), rgba(255,255,255,0) 70%);
  }
  .vr-axis{ position:absolute; font-size:0.8em; color:rgba(0,0,0,0.55); line-height:1; pointer-events:none; }
  .vr-axis.y{ left:-22px; top:90px; transform:rotate(-90deg); transform-origin:center; }
  .vr-axis.y.shift-left{ left:-40px; }
  .vr-axis.x{ left:24px; top:184px; width:156px; text-align:center; }
`;

        document.head.appendChild(st);
      }

      function makeWrap(kind, xLabel, yLabel, yShift){
        var w = document.createElement("div"); w.className = "vr-inset-wrap";
        var sq = document.createElement("div"); sq.className = "vr-inset " + kind; sq.setAttribute("aria-hidden","true");
        var axY = document.createElement("div"); axY.className = "vr-axis y"; if (kind === "party") { try{ axY.classList.add("shift-left"); }catch(e){} } axY.textContent = (yLabel || "dim2"); var axX = document.createElement("div"); axX.className = "vr-axis x"; axX.textContent = (xLabel || "dim1");
        w.appendChild(sq); w.appendChild(axY); w.appendChild(axX);
        return w;
      }

      var wrap = document.createElement("div"); wrap.className = "agg-vr-wrap";
      wrap.appendChild(makeWrap("ideology", "- Economic +", "- Other +", false));
      wrap.appendChild(makeWrap("party", "- Republican +", "- Democratic +", true));

      var tabsEl = vrCard.querySelector("#agg-vr-chamber-tabs");
      if (tabsEl) { tabsEl.insertAdjacentElement("afterend", wrap); }
      else { var title = vrCard.querySelector(".section-title"); if (title) title.insertAdjacentElement("afterend", wrap); else vrCard.appendChild(wrap); }
      try{ layoutVotingSquares(); }catch(e){}
    }catch(e){ console.warn("[aggregate] VR insets failed", e); }
  }

// ---------- Voting Record Scatter (DW-NOMINATE) ----------
(function(){
  var _memberAggPromise = null;
  function _sanitizeJsonNumbers(text){
    // Replace unquoted NaN/Infinity/-Infinity with null in structural contexts
    try{
      return text
        .replace(/([\[:,\s])NaN(?=[,\]\s}])/g, '$1null')
        .replace(/([\[:,\s])-?Infinity(?=[,\]\s}])/g, '$1null');
    }catch(e){ return text; }
  }

  function fetchMemberAggregate(){
    if (_memberAggPromise) return _memberAggPromise;
    var primary = "https://wyattbrannon.github.io/demosthenes-data/member_aggregate.json";
    var backup  = "https://raw.githubusercontent.com/wyattbrannon/demosthenes-data/refs/heads/main/member_aggregate.json";
    function get(url){
      return fetch(url).then(function(r){
        if(!r.ok) throw new Error("HTTP " + r.status + " at " + url);
        return r.text();
      }
).then(function(t){
        try { return JSON.parse(t); }
        catch(e1){
          var s = _sanitizeJsonNumbers(t);
          try { return JSON.parse(s); }
          catch(e2){ throw new Error("Invalid JSON from " + url + ": " + e2.message); }
        }
      });
    }
    _memberAggPromise = get(primary).catch(function(e1){
      console.warn("[aggregate] member_aggregate primary failed:", e1 && e1.message ? e1.message : e1);
      return get(backup);
    });
    return _memberAggPromise;
  }
window.fetchMemberAggregate = fetchMemberAggregate;


  function ensureIdeologyScatter(){
    try{
      // Find the first (ideology) square
      var sq = document.querySelector(".agg-vr-wrap .vr-inset.ideology");
      if (!sq) return;
      var wrap = sq.parentElement; // .vr-inset-wrap
      // Create or reuse overlay
      var overlay = (wrap && wrap.querySelector(".vr-inset-scatter")) || document.createElement("div");
      try{ layoutVotingSquares(); }catch(e){}
      overlay.className = "vr-inset-scatter";
      if (wrap && !overlay.parentNode) wrap.appendChild(overlay);
      overlay.style.position = "absolute";
      overlay.style.left = "12px";
      overlay.style.top = "0";
      var _S = Math.max(10, Math.round((sq && sq.clientWidth) || 180));
      overlay.style.width = _S + "px";
      overlay.style.height = _S + "px";
      overlay.style.pointerEvents = "auto";
      overlay.style.overflow = "hidden";
      overlay.style.zIndex = "10"; // above gradient

      var wrap = sq.parentElement; // .vr-inset-wrap
      if (wrap && !overlay.parentNode) wrap.appendChild(overlay);

      // Style for points (we'll create many divs)
      var pointCSSId = "agg-vr-scatter-style";
      if (!document.getElementById(pointCSSId)){
        var st = document.createElement("style");
        st.id = pointCSSId;
        st.textContent = [
          ".vr-inset-scatter .pt{ position:absolute; width:12px; height:12px; border:2px solid #000; border-radius:3px; box-sizing:border-box; transform:translate(-50%,-50%); }"
        ].join("\n");
        document.head.appendChild(st);
      }

      // Fetch and plot
      Promise.all([fetchMemberAggregate(), fetchChamberIndexByNameState()]).then(function(arr){ var data = arr && arr[0] || {}; window._chamberIndexNS = window._chamberIndexNS || (arr && arr[1]) || {}; {};
        try{
          var members = (data && Array.isArray(data.members)) ? data.members : [];
          var W = overlay.clientWidth || _S, H = overlay.clientHeight || _S;
          function mapX(x){ var u = (Number(x)+1)/2; if (!Number.isFinite(u)) return null; return u * W; }
          function mapY(y){ var v = (Number(y)+1)/2; if (!Number.isFinite(v)) return null; return (1 - v) * H; }

          overlay.innerHTML = '';
          var frag = document.createDocumentFragment();
          for (var i=0;i<members.length;i++){
            var m = members[i];
            // classify strictly via YAML
            m._yamlClass = _classifyYaml(m);
            if (!_memberMatchesChamber(m, _getVRChamber())) continue;
            var a = m && m.alignment || {};
                        var x = parseFloat(a.dw_nominate_dim1);
            var y = parseFloat(a.dw_nominate_dim2);
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            // clamp to [-1,1]
            if (x < -1) x = -1; else if (x > 1) x = 1;
            if (y < -1) y = -1; else if (y > 1) y = 1;


            var u = (x + 1) / 2; var v = (y + 1) / 2; var px = u * W; var py = (1 - v) * H;
            if (!Number.isFinite(px) || !Number.isFinite(py)) continue; if (px < 0) px = 0; else if (px > W) px = W; if (py < 0) py = 0; else if (py > H) py = H;

            var party = (m.identity && m.identity.party) || "";
            // Treat Independents as Democrats for color here
            var isD = party === "D" || party === "I";
            var color = isD ? "#0d6efd" : "#dc3545";

            var dot = document.createElement("div");
            dot.className = "pt";
            dot.style.left = (px) + "px";
            dot.style.top = (py) + "px";
            dot.style.background = color;
            var nm = (m.identity && m.identity.name) || "";
            var st = (m.identity && m.identity.state) || "";
            var pi = isD ? "D" : "R";
            const tooltipText = nm ? (nm + " (" + pi + "-" + st + ")") : (pi + "-" + st);
            dot.dataset.tt = tooltipText;
            dot.addEventListener("mouseenter", function(ev){
              var tt = _getScatterTooltip(); tt.textContent = this.dataset.tt; tt.classList.add("show");
              tt.style.left = (ev.clientX + 10) + "px"; tt.style.top = (ev.clientY + 10) + "px";
            });
            dot.addEventListener("mousemove", function(ev){
              var tt = _getScatterTooltip(); tt.style.left = (ev.clientX + 10) + "px"; tt.style.top = (ev.clientY + 10) + "px";
            });
            dot.addEventListener("mouseleave", function(){
              var tt = _getScatterTooltip(); tt.classList.remove("show");
            });
frag.appendChild(dot);
}
// Expose globally for Data Visualizer




          overlay.appendChild(frag);
          console.debug('[aggregate] plotted pts', overlay.querySelectorAll('.pt').length);
          
        }catch(e){ console.warn("[aggregate] scatter render failed", e); }
      }).catch(function(err){
        console.warn("[aggregate] member_aggregate.json load failed", err);
      });
    }catch(e){ console.warn("[aggregate] ensureIdeologyScatter failed", e); }
  }


  function ensurePartyScatter(){
    try{
      var sq = document.querySelector(".agg-vr-wrap .vr-inset.party");
      if (!sq) return;
      var wrap = sq.parentElement; // .vr-inset-wrap

      // Reuse or create overlay
      var overlay = (wrap && wrap.querySelector(".vr-inset-scatter-party"));
      if (!overlay){
        overlay = document.createElement("div");
        overlay.className = "vr-inset-scatter vr-inset-scatter-party";
        overlay.style.position = "absolute";
        overlay.style.left = "12px";
        overlay.style.top = "0";
        overlay.style.pointerEvents = "auto";
        overlay.style.overflow = "hidden";
        overlay.style.zIndex = "10";
        if (wrap) wrap.appendChild(overlay);
      }

      // Size overlay to match square
      var S = Math.max(10, Math.round((sq && sq.clientWidth) || 180));
      overlay.style.width = S + "px";
      overlay.style.height = S + "px";

      // Clear and plot
      overlay.innerHTML = '';
      Promise.all([fetchMemberAggregate(), fetchChamberIndexByNameState()]).then(function(arr){ var data = arr && arr[0] || {}; window._chamberIndexNS = window._chamberIndexNS || (arr && arr[1]) || {}; {};
        try{
          var members = (data && Array.isArray(data.members)) ? data.members : [];
          var W = overlay.clientWidth || S, H = overlay.clientHeight || S;
          var frag = document.createDocumentFragment();

          function norm(v){
            var n = parseFloat(v);
            if (!Number.isFinite(n)) return null;
            if (n > 1) n = n / 100.0;
            if (n < 0) n = 0; else if (n > 1) n = 1;
            return n;
          }

          for (var i=0;i<members.length;i++){
            var m = members[i];
            m._yamlClass = _classifyYaml(m);
            if (!_memberMatchesChamber(m, _getVRChamber())) continue;
            var a = (m && m.alignment) || {};
            var party = (m.identity && m.identity.party) || "";
            var isD = (party === "D" || party === "I");

            var pu = norm(a.party_unity_pct);
            var bp = norm(a.party_unity_bp_pct);
            if (pu == null || bp == null) continue;

            var x = isD ? bp : pu;
            var y = isD ? pu : bp;

            var px = x * W;
            var py = (1 - y) * H;

            var dot = document.createElement("div");
            dot.className = "pt";
            dot.style.position = "absolute";
            dot.style.left = px + "px";
            dot.style.top = py + "px";
            dot.style.background = isD ? "#0d6efd" : "#dc3545";
            // Tooltip
            var nm = (m.identity && m.identity.name) || "";
            var st = (m.identity && m.identity.state) || "";
            var pi = isD ? "D" : "R";
            dot.dataset.tt = nm ? (nm + " (" + pi + "-" + st + ")") : (pi + "-" + st);
            dot.addEventListener("mouseenter", function(ev){
              var tt = _getScatterTooltip(); tt.textContent = this.dataset.tt; tt.classList.add("show");
              tt.style.left = (ev.clientX + 10) + "px"; tt.style.top = (ev.clientY + 10) + "px";
            });
            dot.addEventListener("mousemove", function(ev){
              var tt = _getScatterTooltip(); tt.style.left = (ev.clientX + 10) + "px"; tt.style.top = (ev.clientY + 10) + "px";
            });
            dot.addEventListener("mouseleave", function(){ var tt = _getScatterTooltip(); tt.classList.remove("show"); });

            frag.appendChild(dot);
          }

          overlay.appendChild(frag);
          console.debug("[aggregate] party plotted pts", overlay.querySelectorAll(".pt").length);
        }catch(e){ console.warn("[aggregate] party scatter render failed", e); }
      }).catch(function(err){
        console.warn("[aggregate] member_aggregate.json load failed (party)", err);
      });

    }catch(e){ console.warn("[aggregate] ensurePartyScatter failed", e); }
  }

  // Expose a light hook
  window.ensureIdeologyScatter = ensureIdeologyScatter;
  window.ensurePartyScatter = ensurePartyScatter;

  function _getScatterTooltip(){
    var tt = document.getElementById("agg-vr-tooltip");
    if (!tt){
      tt = document.createElement("div");
      tt.id = "agg-vr-tooltip";
      tt.className = "vr-tt";
      document.body.appendChild(tt);
    }
    return tt;
  }

})();


  function layoutVotingSquares(){
    try{
      var vr = document.querySelector(".agg-vr-wrap");
      if(!vr) return;
      var card = vr.closest(".card") || document.getElementById("headerCard") || vr.parentElement;
      var colW = (card && card.clientWidth) ? card.clientWidth : (vr.clientWidth || 600);
// choose S so two squares fit side-by-side with comfortable gutters
var S = Math.max(140, Math.min(280, Math.floor((colW - 96) / 2)));
      var wraps = vr.querySelectorAll(".vr-inset-wrap");
      wraps.forEach(function(w){
        var sq = w.querySelector(".vr-inset");
        var ov = w.querySelector(".vr-inset-scatter");
        // wrapper needs to be tall enough to include x-axis label under square
        w.style.width = (S + 24) + "px";
        w.style.height = (S + 28) + "px"; // + label space
        if (sq){
          sq.style.width = S + "px";
          sq.style.height = S + "px";
          sq.style.left = "12px";
          sq.style.top = "0";
        }
        if (ov){
          ov.style.width = S + "px";
          ov.style.height = S + "px";
          ov.style.left = "12px";
          ov.style.top = "0";
        }
        var axX = w.querySelector(".vr-axis.x");
        if (axX){
          axX.style.left = "24px";
          axX.style.top = (S + 4) + "px";
          axX.style.width = Math.max(132, S - 48) + "px";
        }
        var axY = w.querySelector(".vr-axis.y");
        if (axY){
          axY.style.top = Math.floor(S/2) + "px";
        }
      });
    }catch(e){ console.warn("[aggregate] layoutVotingSquares failed", e); }
  }

  // resize handler (debounced)
  var _vrResizeTimer = null;
  function _onResizeVotingSquares(){
    if (_vrResizeTimer) clearTimeout(_vrResizeTimer);
    _vrResizeTimer = setTimeout(function(){
      layoutVotingSquares();
      try { if (window.ensureIdeologyScatter) window.ensureIdeologyScatter();
    ensurePartyScatter(); } catch(e){}
    }, 80);
  }
  window.addEventListener('resize', _onResizeVotingSquares);

  // ---------- Voting Record tabs (All / House / Senate) ----------
  function ensureVRChamberTabs(){
    try{
      // Find the "Voting Record" card
      var titles = document.querySelectorAll('.card .section-title');
      var vrCard = null;
      for (var i=0;i<titles.length;i++){
        var txt = (titles[i].textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
        if (txt === 'voting record'){ vrCard = titles[i].closest('.card') || titles[i].parentElement; break; }
      }
      if(!vrCard) return;

      // Remove and rebuild (idempotent)
      var old = vrCard.querySelector('#agg-vr-chamber-tabs');
      if (old) old.parentElement.remove();

      var wrap = document.createElement('div');
      wrap.className = 'mv-tabs-wrap';
      wrap.style.width = '100%';
      wrap.style.maxWidth = '100%';
      wrap.style.display = 'block';
      wrap.style.margin = '8px 0 10px 0';

      var tabs = document.createElement('div');
      tabs.id = 'agg-vr-chamber-tabs';
      styleTabsContainer(tabs);
      // three columns
      tabs.style.gridTemplateColumns = '1fr 1fr 1fr';

      var bAll = document.createElement('button');
      bAll.textContent = 'All';
      bAll.dataset.chamber = 'all';
      baseButtonStyle(bAll);

      var bHouse = document.createElement('button');
      bHouse.textContent = 'House';
      bHouse.dataset.chamber = 'house';
      baseButtonStyle(bHouse);

      var bSenate = document.createElement('button');
      bSenate.textContent = 'Senate';
      bSenate.dataset.chamber = 'senate';
      baseButtonStyle(bSenate);

      tabs.appendChild(bAll);
      tabs.appendChild(bHouse);
      tabs.appendChild(bSenate);
      wrap.appendChild(tabs);

      // Insert right under the "Voting Record" title, above the squares
      var squaresWrap = vrCard.querySelector('.agg-vr-wrap');
      if (squaresWrap) { squaresWrap.insertAdjacentElement('beforebegin', wrap); }
      else { var titleEl = vrCard.querySelector('.section-title'); if (titleEl) titleEl.insertAdjacentElement('afterend', wrap); else vrCard.appendChild(wrap); }
      // Force reorder if somehow tabs ended up below
      var tabsEl = vrCard.querySelector('#agg-vr-chamber-tabs');
      var squares = vrCard.querySelector('.agg-vr-wrap');
      if (tabsEl && squares && tabsEl.compareDocumentPosition(squares) & Node.DOCUMENT_POSITION_FOLLOWING){
        squares.parentNode.insertBefore(tabsEl.parentNode, squares);
      }

      // Behavior: just visual selection for now; future hook can filter scatters
      setActive(tabs, bAll);
      tabs.addEventListener('click', function(ev){
        var btn = ev.target;
        if (!btn || !btn.classList || !btn.classList.contains('tab')) return;
        setActive(tabs, btn);
        var ch = btn.dataset && btn.dataset.chamber ? btn.dataset.chamber : 'all';
        _setVRChamber(ch);
        // Clear overlays then re-render with current filter
        var ide = document.querySelector('.vr-inset-scatter'); if (ide) ide.innerHTML='';
        var par = document.querySelector('.vr-inset-scatter-party'); if (par) par.innerHTML='';
        fetchChamberIndexByNameState().then(function(idx){ window._chamberIndexNS = idx || window._chamberIndexNS || {}; })
          .finally(function(){ try { ensureIdeologyScatter(); } catch(e){} try { ensurePartyScatter(); } catch(e){} });
      });
    }catch(e){ console.warn('[aggregate] ensureVRChamberTabs failed', e); }
  }

  // ---- Voting Record chamber filter state ----
  window._vrChamber = window._vrChamber || 'all';
  function _getVRChamber(){ return window._vrChamber || 'all'; }
  function _setVRChamber(v){ window._vrChamber = (v === 'house' || v === 'senate') ? v : 'all'; }

  function _memberIsHouse(m){
  var c = m && (m._yamlClass || _classifyYaml(m));
  return c === 'house' || c === 'unknown';
}
  function _memberMatchesChamber(m, ch){
  if (!m) return false;
  if (ch === 'all') return true;
  var c = m._yamlClass || _classifyYaml(m);
  if (ch === 'house') return (c === 'house' || c === 'unknown');
  if (ch === 'senate') return c === 'senate';
  return false;
}
      // Build chamber index keyed by normalized "Name|STATE" using the latest term's type (rep/sen)
  function normalizeNameNS(s){ return String(s||'').replace(/\s+/g,' ').trim().toUpperCase(); }
  var _chamberIndexNSPromise = null;
  function fetchChamberIndexByNameState(){
    if (_chamberIndexNSPromise) return _chamberIndexNSPromise;
    var YAML_URL = "https://wyattbrannon.github.io/demosthenes-data/legislators-current.yaml";
    function parseYAMLByNameState(text){
  var map = Object.create(null);
  var lastByState = Object.create(null);
  var parts = text.split(/\n- id:/g);
  for (var i=1;i<parts.length;i++){
    var chunk = "- id:" + parts[i];
    var off = (chunk.match(/official_full:\s*([^\n]+)\n/)||[])[1] || "";
    var first = (chunk.match(/name:\s*[\s\S]*?first:\s*([^\n]+)\n/)||[])[1] || "";
    var middle = (chunk.match(/name:\s*[\s\S]*?middle:\s*([^\n]+)\n/)||[])[1] || "";
    var last  = (chunk.match(/name:\s*[\s\S]*?last:\s*([^\n]+)\n/)||[])[1] || "";
    var nick  = (chunk.match(/nickname:\s*([^\n]+)\n/)||[])[1] || "";
    var terms = (chunk.match(/terms:\s*([\s\S]*)/)||[])[1] || "";
    var m, lastType = "", lastState = "";
    var rx = /-\s*type:\s*(sen|rep)[\s\S]*?state:\s*([A-Z]{2})/gi;
    while ((m = rx.exec(terms))){ lastType = (m[1]||"").toLowerCase(); lastState = (m[2]||"").toUpperCase(); }
    if (!lastType || !lastState) continue;
    var label = (lastType === "rep") ? "house" : "senate";
    function addKeys(nm){
      var keys = _nameStateKeys({ name: nm, first: first, last: last, state: lastState });
      for (var j=0;j<keys.length;j++){ map[keys[j]] = label; }
    }
    if (off) addKeys(off);
    if (first || last){
      var fl = (first + (middle?(' '+middle):'') + ' ' + last).trim(); if (fl) addKeys(fl);
      var fl2 = (first + ' ' + last).trim(); if (fl2) addKeys(fl2);
      var lf = last && first ? (last + ', ' + first) : ''; if (lf) addKeys(lf);
    }
    if (nick && last){ addKeys((nick + ' ' + last).trim()); }
    var lastKey = _cleanName(last) + '|' + lastState;
    if (!lastByState[lastKey]) lastByState[lastKey] = 0;
    lastByState[lastKey]++;
  }
  var lastUnique = Object.create(null);
  for (var k in lastByState){ if (lastByState[k] === 1) lastUnique[k] = true; }
  return { ns: map, lastUnique: lastUnique };
}

    _chamberIndexNSPromise = fetch(YAML_URL).then(function(r){
      if (!r.ok) throw new Error("HTTP "+r.status);
      return r.text();
    }).then(function(t){ return parseYAMLByNameState(t); }).then(function(obj){ window._chamberIndexNS = obj.ns; window._chamberIndexLastUnique = obj.lastUnique; return window._chamberIndexNS; }).catch(function(e){
      console.warn("[aggregate] YAML NS load failed:", e && e.message || e);
      return {};
    });
    return _chamberIndexNSPromise;
  }

  // ===== Robust Name|State YAML classification =====
  function _stripDia(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function _cleanName(s){ return _stripDia(String(s||'').replace(/[.\-'",()]/g,' ').replace(/\s+/g,' ').trim().toUpperCase()); }
  function _removeSuffixes(s){ return String(s||'').replace(/\b(JR|SR|III|IV|II)\b/gi,'').replace(/\s+/g,' ').trim(); }
  function _dropInitials(s){ return String(s||'').split(/\s+/).filter(tok => tok.length > 1).join(' '); }
  function _splitNameGuess(full){
    var nm = String(full||'').trim();
    if (!nm) return {first:'', last:''};
    if (nm.indexOf(',') !== -1){
      var parts = nm.split(','); var last = (parts[0]||'').trim(); var first = (parts[1]||'').trim();
      return {first:first, last:last};
    }
    var toks = nm.split(/\s+/);
    if (toks.length >= 2) return { first: toks.slice(0,-1).join(' '), last: toks[toks.length-1] };
    return { first: nm, last: '' };
  }
  function _nameStateKeys(params){
    var name = params.name||'', first=params.first||'', last=params.last||'', state=(params.state||'').toUpperCase();
    var keys = new Set();
    function add(nm){
      if (!nm || !state) return;
      var base = _cleanName(_removeSuffixes(nm));
      var noInit = _cleanName(_removeSuffixes(_dropInitials(nm)));
      if (base) keys.add(base + '|' + state);
      if (noInit) keys.add(noInit + '|' + state);
    }
    if (name) add(name);
    if (first || last){
      var fl = (first + ' ' + last).trim();
      var lf = last && first ? (last + ', ' + first) : '';
      if (fl) add(fl);
      if (lf) add(lf);
    }
    return Array.from(keys);
  }
  function _classifyYaml(m){
  var idx = window._chamberIndexNS || {};
  var lastUnique = window._chamberIndexLastUnique || {};
  var ident = (m && m.identity) || {};
  var name = ident.name || '';
  var state = ident.state || '';
  var parts = _splitNameGuess(name);
  var keys = _nameStateKeys({name:name, first:parts.first, last:parts.last, state:state});
  for (var i=0;i<keys.length;i++){ var v = idx[keys[i]]; if (v){ m._yamlClass = v; return v; } }
  // fallback: unique last name within state
  var lastOnly = _cleanName(parts.last) + '|' + String(state||'').toUpperCase();
  if (parts.last && lastUnique[lastOnly]){
    var prefix = _cleanName(parts.last) + '|'; var want = '|' + String(state||'').toUpperCase();
    for (var k in idx){ if (k.indexOf(prefix) === 0 && k.endsWith(want)) { m._yamlClass = idx[k]; return m._yamlClass; } }
  }
  // absolute fallback: use district presence in member JSON
  var d = ident.district; var fallback = (d !== undefined && d !== null && String(d).trim() !== '') ? 'house' : 'senate';
  m._yamlClass = fallback; return fallback;
}
  function _ensureYamlIndexNS(){
    if (window._chamberIndexNS) return Promise.resolve(window._chamberIndexNS);
    return fetchChamberIndexByNameState().then(function(idx){ window._chamberIndexNS = idx||{}; return window._chamberIndexNS; });
  }
      // ---------- Boot ----------
  ready(async function(){
    buildChamberTabs();
    buildModeTabs();
    ensureMapContainer();
    fetchChamberIndexByNameState().then(function(idx){ window._chamberIndexNS = idx || {}; }).catch(function(){});
    fetchChamberIndexByNameState().then(function(idx){ window._chamberIndexNS = idx || {}; }).catch(function(){});
    ensureVRChamberTabs();
    ensureAggregateVotingSquares();
    layoutVotingSquares();
    ensureIdeologyScatter();
    ensurePartyScatter();

    try{
      await ensureLeafletLoaded();
      initMap();
      updateOverlayForView(_currentView);
    } catch(e){
      const note = document.getElementById("agg-map-note");
      note && (note.textContent = "Map failed to load: " + e.message);
    }
  });


  // --- Data Visualizer (non-invasive) ---
  (function DataVisualizerModule(){
    try {
      var card = document.getElementById("data-visualizer");
      if (!card) return;

      // Tabs
      var tabUni = document.getElementById("dv-tab-uni");
      var tabBi  = document.getElementById("dv-tab-bi");
      var secUni = document.getElementById("dv-uni");
      var secBi  = document.getElementById("dv-bi");

      function setTab(which) {
  var isUni = (which === "uni");
  if (tabUni && tabBi && secUni && secBi) {
    tabUni.classList.toggle("active", isUni);
    tabBi.classList.toggle("active", !isUni);
    tabUni.setAttribute("aria-pressed", String(isUni));
    tabBi.setAttribute("aria-pressed", String(!isUni));
    secUni.style.display = isUni ? "block" : "none";
    secBi.style.display = isUni ? "none" : "block";
  }
}
      tabUni && tabUni.addEventListener("click", function(){ setTab("uni"); });
      tabBi  && tabBi.addEventListener("click",  function(){ setTab("bi");  });

      // Controls
      var uniVar = document.getElementById("dv-uni-var");
      var uniBin = document.getElementById("dv-uni-bin");
      var uniCanvas = document.getElementById("dv-uni-chart");
      var biX = document.getElementById("dv-bi-x");
      var biY = document.getElementById("dv-bi-y");
      var biCanvas = document.getElementById("dv-bi-chart");

      // Display current bin width
      var binLabel = (function(){
        var lbl = uniBin && uniBin.closest("label");
        if (!lbl) return null;
        var s = document.createElement("span");
        s.style.marginLeft = "8px";
        s.style.fontVariantNumeric = "tabular-nums";
        lbl.appendChild(s);
        return s;
      })();

      // Lazy-load Chart.js if needed
      function ensureChartJs(){
        return new Promise(function(resolve, reject){
          if (window.Chart && typeof window.Chart === "function") return resolve();
          var s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/chart.js";
          s.async = true;
          s.onload = function(){ resolve(); };
          s.onerror = function(){ reject(new Error("Failed to load Chart.js")); };
          document.head.appendChild(s);
        });
      }

      function get(obj, path){
        try{
          return path.split(".").reduce(function(acc, k){ return (acc && acc[k] !== undefined) ? acc[k] : undefined; }, obj);
        }catch(e){ return undefined; }
      }

      function partyLetter(p){
        if (!p) return "I";
        var s = String(p).toLowerCase();
        if (s.startsWith("d")) return "D";
        if (s.startsWith("r")) return "R";
        return s.toUpperCase().slice(0,1) || "I";
      }

      function namePartyState(m){
        var nm = (m.identity && m.identity.name) || m.name || m.member_name || "Unknown";
        var st = (m.identity && m.identity.state) || m.state || "";
        var p  = (m.identity && m.identity.party) || m.party || "";
        return nm + " " + partyLetter(p) + "-" + (String(st||"")).toUpperCase();
      }

      // Numeric paths (top-level + nested up to depth 3)
      function numericPathsForMember(m){
  var paths = [];
  function addPath(path, obj, depth) {
    if (depth > 6) return;
    for (var k in obj) {
      var v = obj[k];
      var newPath = path ? path + "." + k : k;
      if (v === null || v === undefined) continue;
      if (typeof v === "number" && Number.isFinite(v)) {
        paths.push(newPath);
      } else if (typeof v === "string") {
        var vv = v.replace(/[,$\s]/g, "");
        var n = Number(vv);
        if (Number.isFinite(n)) { paths.push(newPath); continue; }
      }
      if (v && typeof v === "object") addPath(newPath, v, depth + 1);
    }
  }
  addPath("", m, 0);
  // Normalize FEC totals: collapse any depth to final leaf key
  paths = paths.map(function(p){
    return p.replace(/^fec\.totals\.(?:[^.]+\.)+([^.]+)$/,"fec.totals.$1");
  });

  paths = paths.filter(function(p){
    return !/^identity(\.|$)/.test(p)
        && !/^bioguide_id$/.test(p)
        && !/^id$/.test(p)
        && !/^fec\.top_contributors(\.|$)/.test(p);
  });
  return Array.from(new Set(paths)).sort();
}
function unionNumericPaths(members){
        var set = new Set();
        for (var i=0;i<members.length;i++){
          numericPathsForMember(members[i]).forEach(set.add, set);
          if (set.size > 0 && i > 300) break;
        }
        return Array.from(set).sort();
      }

      // Histogram utilities
      function computeBinsByWidth(values, width){
        var finite = values.filter(function(v){ return Number.isFinite(v); });
        if (!finite.length || !(width > 0)) return { edges: [], counts: [], min: NaN, max: NaN, width: width };
        var min = Math.min.apply(null, finite);
        var max = Math.max.apply(null, finite);
        if (min === max) { min -= 0.5; max += 0.5; }
        var edges = [];
        for (var e = min; e < max + width; e += width) edges.push(e);
        var counts = new Array(Math.max(1, edges.length - 1)).fill(0);
        for (var j=0;j<finite.length;j++){
          var x = finite[j];
          var idx = Math.min(counts.length-1, Math.max(0, Math.floor((x - min) / width)));
          counts[idx]++;
        }
        return { edges: edges, counts: counts, min: min, max: max, width: width };
      }

      // Renderers
      var uniChart = null, biChart = null;

      function renderHistogram(values, label, width){
        if (!uniCanvas) return;
        var cfg = computeBinsByWidth(values, width);
        var labels = [];
        for (var i=0;i<cfg.counts.length;i++){
          var a = cfg.edges[i], b = cfg.edges[i+1];
          labels.push(a.toFixed(2) + "–" + b.toFixed(2));
        }
        var ds = { label: label, data: cfg.counts };
        if (uniChart) { try{ uniChart.destroy(); }catch(e){} }
        uniChart = new Chart(uniCanvas.getContext("2d"), {
          type: "bar",
          data: { labels: labels, datasets: [ds] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          aspectRatio: 2,
            scales: {
              x: { title: { display: true, text: label } },
              y: { title: { display: true, text: "Count" }, beginAtZero: true, ticks: { precision:0 } }
            }
          }
        });
      }

      function renderScatter(points, xLabel, yLabel, bounds){
        if (!biCanvas) return;
        if (biChart) { try{ biChart.destroy(); }catch(e){} }
        biChart = new Chart(biCanvas.getContext("2d"), {
          type: "scatter",
          data: { datasets: [{ label: xLabel + " vs " + yLabel, data: points, pointRadius: 3 }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2,
            parsing: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(ctx){
                    var p = ctx.raw || {};
                    return (p._label || "") + ": (" + xLabel + "=" + Number(p.x).toFixed(2) + ", " + yLabel + "=" + Number(p.y).toFixed(2) + ")";
                  }
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: xLabel },
                min: bounds?.xMin,
                max: bounds?.xMax
              },
              y: {
                title: { display: true, text: yLabel },
                min: bounds?.yMin,
                max: bounds?.yMax
              }
            }
          }
        });
      }

      // Hook into existing aggregate data (function exists in this IIFE scope)
      function initWithMembers(members){
        if (!Array.isArray(members) || !members.length) return;

        var vars = unionNumericPaths(members);
        function fillSelect(sel){
          if (!sel) return;
          sel.innerHTML = "";
          vars.forEach(function(v){ var opt = document.createElement("option"); opt.value = v; opt.textContent = v; sel.appendChild(opt); });
        }
        fillSelect(uniVar); fillSelect(biX); fillSelect(biY);

        function valuesForPath(path) {
      return members.map(function(m){
        var v = get(m, path);
        if (v === null || v === undefined) return NaN;
        var num = Number(v);
        return Number.isFinite(num) ? num : NaN;
      }).filter(Number.isFinite);
    }

        function updateUni(){
          var path = uniVar && uniVar.value;
          if (!path) return;
          var base = dvGetBaseMembers();
          var fm = dvFilterMembersByControls("uni", base);
          // compute values from filtered members
          var vals = fm.map(function(m){
            var v = get(m, path);
            if (v === null || v === undefined) return NaN;
            var num = Number(v);
            return Number.isFinite(num) ? num : NaN;
          }).filter(Number.isFinite);
          if (!vals.length) return;
          var min = Math.min.apply(null, vals);
          var max = Math.max.apply(null, vals);
          var sliderVal = uniBin ? Number(uniBin.value) : 20;
          var width = (max - min) / Math.max(1, sliderVal);
          if (binLabel) binLabel.textContent = isFinite(width) ? ("width ≈ " + width.toFixed(2)) : "";
          updateUnivariateTable(fm, path);
          renderHistogram(vals, path, width);
        }
        uniVar && uniVar.addEventListener("change", updateUni);
        uniBin && uniBin.addEventListener("input", updateUni);

        function updateBi(){
          var xPath = biX && biX.value;
          var yPath = biY && biY.value;
          if (!xPath || !yPath) return;
          var base = dvGetBaseMembers();
          var fm = dvFilterMembersByControls("bi", base);
          var pts = fm.map(function(m){
            var xv = get(m, xPath);
            var yv = get(m, yPath);
            var x = parseFloat(xv);
            var y = parseFloat(yv);
            if (!isFinite(x)) x = 0;
            if (!isFinite(y)) y = 0;
            return { x:x, y:y, _label: namePartyState(m) };
          });
          if (!pts.length) return;
          var xs = pts.map(function(p){ return Number(p.x); }).filter(Number.isFinite);
          var ys = pts.map(function(p){ return Number(p.y); }).filter(Number.isFinite);
          if (!xs.length || !ys.length) return;
          var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
          var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
          var rangeX = xmax - xmin; if (!(rangeX > 0)) rangeX = 1;
          var rangeY = ymax - ymin; if (!(rangeY > 0)) rangeY = 1;
          var padX = Math.max(rangeX * 0.10, 0.05 * (Math.abs(xmax) || 1));
          var padY = Math.max(rangeY * 0.10, 0.05 * (Math.abs(ymax) || 1));
          var bounds = { xMin: xmin - padX, xMax: xmax + padX, yMin: ymin - padY, yMax: ymax + padY };
          renderScatter(pts, xPath, yPath, bounds);
        }
        biX && biX.addEventListener("change", updateBi);
        biY && biY.addEventListener("change", updateBi);

        if (uniVar && uniVar.options.length) { uniVar.selectedIndex = 0; updateUni(); }
        if (biX && biX.options.length) { biX.selectedIndex = 0; }
        if (biY && biY.options.length) { biY.selectedIndex = Math.min(1, biY.options.length-1); updateBi(); }
      }

      function bootstrap(){
        ensureChartJs().then(function(){
          if (typeof fetchMemberAggregate === "function"){
            waitForMemberAggregate().then(f => f()).then(function(data){
              var members = (data && Array.isArray(data.members)) ? data.members : [];
              initWithMembers(members);
            }).catch(function(err){ console.warn("[DataVisualizer] member_aggregate load error:", err); });
          } else {
            console.warn("[DataVisualizer] fetchMemberAggregate not found in scope.");
          }
        }).catch(function(e){ console.warn("[DataVisualizer] Chart.js failed to load:", e && e.message); });
      }

      // Wait for original DOM setup
      if (document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", bootstrap);
      } else {
        setTimeout(bootstrap, 0);
      }

    } catch (e) {
      console.warn("[DataVisualizer] init failed", e);
    }
  })();

})();





// === DataVisualizer Filters for Univariate and Bivariate ===
function applyFilters(members, chamberSel, partySel){
  let filtered = [...members];
  if(chamberSel && chamberSel !== "all"){
    filtered = filtered.filter(m => (m.chamber || "").toLowerCase() === chamberSel);
  }
  if(partySel && partySel !== "all"){
    if(partySel === "dem") filtered = filtered.filter(m => ["D","I"].includes(m.party));
    else if(partySel === "rep") filtered = filtered.filter(m => m.party === "R");
  }
  return filtered;
}

function createFilterControls(prefix, onChange){
  const wrap = document.createElement("div");
  wrap.className = "dv-filter-row";
  wrap.innerHTML = `
    <label>Chamber:</label>
    <select id="${prefix}ChamberFilter">
      <option value="all" selected>All</option>
      <option value="house">House</option>
      <option value="senate">Senate</option>
    </select>
    <label>Party:</label>
    <select id="${prefix}PartyFilter">
      <option value="all" selected>All</option>
      <option value="dem">Democrats</option>
      <option value="rep">Republicans</option>
    </select>
  `;
  // ✅ Attach listeners to immediately re-render
  wrap.querySelectorAll("select").forEach(sel => {
    sel.addEventListener("change", () => {
      if (prefix === "uni" && typeof updateUni === "function") updateUni();
      if (prefix === "bi" && typeof updateBi === "function") updateBi();
    });
  });
  return wrap;
}

window.addEventListener("DOMContentLoaded", () => {
  const uniChart = document.getElementById("dv-uni-chart");
  if(uniChart && !document.getElementById("uniChamberFilter")){
    uniChart.insertAdjacentElement("afterend", createFilterControls("uni", () => updateUni()));
  }
  const biChart = document.getElementById("dv-bi-chart");
  if(biChart && !document.getElementById("biChamberFilter")){
    biChart.insertAdjacentElement("afterend", createFilterControls("bi", () => updateBi()));
  }
});

const _origUpdateUni = typeof updateUni === "function" ? updateUni : null;
const _origUpdateBi = typeof updateBi === "function" ? updateBi : null;

updateUni = function(){
  const chamberSel = (document.getElementById("uniChamberFilter")||{}).value || "all";
  const partySel = (document.getElementById("uniPartyFilter")||{}).value || "all";
  if(typeof fetchMemberAggregate === "function"){
    const members = fetchMemberAggregate() || [];
    const filtered = applyFilters(members, chamberSel, partySel);
    window._uniFilteredMembers = filtered;
  }
  if(_origUpdateUni) _origUpdateUni();
};

updateBi = function(){
  const chamberSel = (document.getElementById("biChamberFilter")||{}).value || "all";
  const partySel = (document.getElementById("biPartyFilter")||{}).value || "all";
  if(typeof fetchMemberAggregate === "function"){
    const members = fetchMemberAggregate() || [];
    const filtered = applyFilters(members, chamberSel, partySel);
    window._biFilteredMembers = filtered;
  }
  if(_origUpdateBi) _origUpdateBi();
};
// === End Filters ===


// === DataVisualizer Filters: ensure charts use filtered members by overriding fetch during update ===
function _dvWrapFetchWithFilter(chamberSel, partySel) {
  const original = window.fetchMemberAggregate;
  window.fetchMemberAggregate = function() {
    const res = original();
    // Handle promise or sync result
    if (res && typeof res.then === 'function') {
      return res.then(data => {
        const members = (data && data.members) ? data.members : [];
        const filtered = applyFilters(members, chamberSel, partySel);
        return Object.assign({}, data, { members: filtered });
      });
    } else {
      const data = res;
      const members = (data && data.members) ? data.members
                     : (Array.isArray(data) ? data : []);
      const filtered = applyFilters(members, chamberSel, partySel);
      if (data && data.members) {
        return Object.assign({}, data, { members: filtered });
      }
      return { members: filtered };
    }
  };
  // Return a restore function
  return function _restore() { window.fetchMemberAggregate = original; };
}

// Replace our earlier shallow wrappers with ones that actually drive the data used by charts
if (typeof _origUpdateUni === "function") {
  updateUni = function(){
    const chamberSel = (document.getElementById("uniChamberFilter")||{}).value || "all";
    const partySel = (document.getElementById("uniPartyFilter")||{}).value || "all";
    const restore = _dvWrapFetchWithFilter(chamberSel, partySel);
    try { _origUpdateUni(); } finally { restore(); }
  };
}
if (typeof _origUpdateBi === "function") {
  updateBi = function(){
    const chamberSel = (document.getElementById("biChamberFilter")||{}).value || "all";
    const partySel = (document.getElementById("biPartyFilter")||{}).value || "all";
    const restore = _dvWrapFetchWithFilter(chamberSel, partySel);
    try { _origUpdateBi(); } finally { restore(); }
  };
}
// Trigger initial render to respect default filters
window.addEventListener("load", () => { try { if (typeof updateUni === 'function') updateUni(); } catch(e){} try { if (typeof updateBi === 'function') updateBi(); } catch(e){} });
// === End DataVisualizer Filters override ===


// === Filtering helpers for DV (identity-based) ===
function dvFilterMembersByControls(prefix, baseMembers){
  var chamberSelEl = document.getElementById(prefix + "ChamberFilter");
  var partySelEl = document.getElementById(prefix + "PartyFilter");
  var chamberSel = chamberSelEl ? chamberSelEl.value : "all";
  var partySel = partySelEl ? partySelEl.value : "all";
  var arr = Array.isArray(baseMembers) ? baseMembers.slice() : [];
  // Chamber: infer by identity.district (House has a district string, Senate is null/empty)
  if (chamberSel !== "all") {
    arr = arr.filter(function(m){
      var dist = m && m.identity ? m.identity.district : null;
      var isHouse = dist != null && String(dist).trim() !== "";
      return chamberSel === "house" ? isHouse : !isHouse;
    });
  }
  // Party: identity.party
  if (partySel !== "all") {
    arr = arr.filter(function(m){
      var p = m && m.identity ? m.identity.party : null;
      if (partySel === "dem") return p === "D" || p === "I";
      if (partySel === "rep") return p === "R";
      return true;
    });
  }
  return arr;
}

// === DV global cache of members to ensure filters drive charts ===
(function(){ try {
  if (!window.__DV_MEMBERS) {
    if (typeof waitForMemberAggregate === "function") {
      try { waitForMemberAggregate().then(f => f()).then(function(data){ 
        var arr = (data && Array.isArray(data.members)) ? data.members : (Array.isArray(data) ? data : []);
        if (arr && arr.length) window.__DV_MEMBERS = arr;
      }).catch(function(){}); } catch(e){}
    }
  }
} catch(e){} })();

function dvGetBaseMembers(){
  if (Array.isArray(window.__DV_MEMBERS)) return window.__DV_MEMBERS;
  try { if (typeof members !== "undefined") return members; } catch(e){}
  return [];
}
// === end DV cache ===


// === Robust re-render wiring for DV filters ===
(function(){
  function applyFiltersArr(arr, chamberSel, partySel){
    var out = Array.isArray(arr) ? arr.slice() : [];
    if (chamberSel && chamberSel !== "all") {
      out = out.filter(function(m){
        var dist = m && m.identity ? m.identity.district : null;
        var isHouse = dist != null && String(dist).trim() !== "";
        return chamberSel === "house" ? isHouse : !isHouse;
      });
    }
    if (partySel && partySel !== "all") {
      out = out.filter(function(m){
        var p = m && m.identity ? m.identity.party : null;
        if (partySel === "dem") return p === "D" || p === "I";
        if (partySel === "rep") return p === "R";
        return true;
      });
    }
    return out;
  }

  function _dvWrapFetchWithFilter(chamberSel, partySel){
    var original = window.fetchMemberAggregate;
    if (typeof original !== "function") {
      return function(){}; // nothing to wrap
    }
    window.fetchMemberAggregate = function(){
      var res = original();
      if (res && typeof res.then === "function"){
        return res.then(function(data){
          var members = (data && Array.isArray(data.members)) ? data.members : (Array.isArray(data) ? data : []);
          var filtered = applyFiltersArr(members, chamberSel, partySel);
          return data && data.members ? Object.assign({}, data, { members: filtered }) : { members: filtered };
        });
      } else {
        var data = res;
        var members = (data && Array.isArray(data.members)) ? data.members : (Array.isArray(data) ? data : []);
        var filtered = applyFiltersArr(members, chamberSel, partySel);
        return data && data.members ? Object.assign({}, data, { members: filtered }) : { members: filtered };
      }
    };
    return function restore(){ window.fetchMemberAggregate = original; };
  }

  function dvTrigger(prefix){
    var chamberSel = (document.getElementById(prefix+"ChamberFilter")||{}).value || "all";
    var partySel = (document.getElementById(prefix+"PartyFilter")||{}).value || "all";
    var restore = _dvWrapFetchWithFilter(chamberSel, partySel);
    try {
      if (prefix === "uni"){
        var uniVarSel = document.getElementById("dv-uni-var");
        if (uniVarSel) {
          uniVarSel.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (typeof updateUni === "function") {
          updateUni();
        }
      } else {
        var biX = document.getElementById("dv-bi-x");
        var biY = document.getElementById("dv-bi-y");
        if (biX) biX.dispatchEvent(new Event("change", { bubbles: true }));
        else if (biY) biY.dispatchEvent(new Event("change", { bubbles: true }));
        else if (typeof updateBi === "function") updateBi();
      }
    } finally {
      restore();
    }
  }

  function bindNow(){
    var uniC = document.getElementById("uniChamberFilter");
    var uniP = document.getElementById("uniPartyFilter");
    var biC = document.getElementById("biChamberFilter");
    var biP = document.getElementById("biPartyFilter");
    if (uniC && !uniC._dvBound) { uniC.addEventListener("change", function(){ dvTrigger("uni"); }); uniC._dvBound = true; }
    if (uniP && !uniP._dvBound) { uniP.addEventListener("change", function(){ dvTrigger("uni"); }); uniP._dvBound = true; }
    if (biC && !biC._dvBound) { biC.addEventListener("change", function(){ dvTrigger("bi"); }); biC._dvBound = true; }
    if (biP && !biP._dvBound) { biP.addEventListener("change", function(){ dvTrigger("bi"); }); biP._dvBound = true; }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(bindNow, 0);
  } else {
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(bindNow, 0); });
  }
  window.addEventListener("load", bindNow);
})();
// === End robust re-render wiring ===
