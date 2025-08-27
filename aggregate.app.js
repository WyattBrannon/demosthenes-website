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
      }).then(function(t){
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

})();
