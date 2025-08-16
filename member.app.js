// member.app.js — v2025-08-16-4 — loads /members/{bioguide}.json and renders four sections
(function(){
  "use strict";

  function byId(id){ return document.getElementById(id); }
  function setDbg(html){ var d=byId('dbg'); if(d){ d.innerHTML = html; } }
  function setErr(html){
    var d=byId('dbg'); if(d){ d.innerHTML = '<span class="err">'+html+'</span>'; }
    var h=byId('headerCard'); if(h && /Loading|Fetching/.test(h.textContent)){ h.textContent='Error — see message above.'; }
  }

  function pad2(n){ n = String(n); return n.length<2 ? ("0"+n) : n; }
  function partyLetter(s){
    var t=(s||"").toUpperCase();
    if (t.indexOf("D")===0 || t==="100") return "D";
    if (t.indexOf("R")===0 || t==="200") return "R";
    return "I";
  }
  function seatText(chamber, state, district){
    var c=(chamber||"").toLowerCase();
    if (c==="house" || c==="rep") {
      var dd = (district==="" || district==="0" || district==null) ? "AL" : pad2(district);
      return "(" + (state||"??") + "-" + dd + ")";
    }
    return "(" + (state||"??") + ")";
  }

  function renderDial(container, valuePct, centerText, label, tooltip){
    var size=140, stroke=12, r=(size/2)-stroke, C=2*Math.PI*r;
    var pct = (valuePct==null || isNaN(valuePct)) ? 0 : Math.max(0,Math.min(100,Number(valuePct)));
    var offset = C*(1 - pct/100);
    var wrap=document.createElement('div'); wrap.className='dial'; if (tooltip) wrap.title=tooltip;
    wrap.innerHTML = ''
      + '<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="'+label+': '+(isNaN(valuePct)?'N/A':pct.toFixed(1))+'%">'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="#e5e7eb" stroke-width="'+stroke+'"></circle>'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="#2563eb" stroke-width="'+stroke+'" stroke-linecap="round"'
      +           ' stroke-dasharray="'+C+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 '+(size/2)+' '+(size/2)+')"></circle>'
      +   '<text x="50%" y="48%" text-anchor="middle" font-size="16" font-weight="700">'+centerText+'</text>'
      +   '<text x="50%" y="66%" text-anchor="middle" font-size="12" fill="#6b7280">'+(isNaN(valuePct)?'N/A':pct.toFixed(1))+'%</text>'
      + '</svg>'
      + '<div class="label">'+label+'</div>';
    container.appendChild(wrap);
  }

  function main(){
    var DEFAULT_DATA_BASE = "https://WyattBrannon.github.io/demosthenes-data";
    var DB = (localStorage.getItem("DEMOS_DATA_BASE") || DEFAULT_DATA_BASE).replace(/\/+$/,"");
    var params = new URL(location.href).searchParams;
    var bioguide = params.get('bioguide') || "";

    var memberURL = DB + "/members/" + bioguide + ".json";
    setDbg("<code>DATA_BASE</code> = " + DB + " · <code>bioguide</code> = " + (bioguide||"(missing)") + " · <code>URL</code> = " + (bioguide?memberURL:"(n/a)"));

    var header = byId('headerCard');
    if (!bioguide){
      if (header) header.textContent = "Missing ?bioguide=…";
      return;
    }

    if (header) header.textContent = "Fetching member JSON…";

    fetch(memberURL, {cache:"no-store"}).then(function(r){
      if(!r.ok){ if (header) header.textContent="Failed to load member JSON."; setErr("HTTP "+r.status+" for <code>"+memberURL+"</code>"); return Promise.reject(); }
      return r.json();
    }).then(function(data){
      if(!data || !data.identity || !data.alignment){ if (header) header.textContent="Invalid member JSON."; setErr("JSON missing identity/alignment"); return; }

      // ---- 1) Header section
      var id = data.identity || {};
      var party = id.party || "";
      var state = id.state || "";
      var district = id.district || null;
      var chamber = (id.chamber && (""+id.chamber).toLowerCase()) || (function(){
  var d = id.district;
  if (typeof d === "string" && d.length) return "house";
  if (typeof d === "number") return "house";
  if (d === "AL") return "house";
  return "senate";
})();
      var displayName = (data.name && data.name.official_full) ? data.name.official_full
  : (id.official_full || id.display_name || (id.first && id.last ? (id.first + " " + id.last) : null) || data.bioguide);

      header.innerHTML = "";
      var img = new Image(); img.className="portrait"; img.alt=displayName||"Portrait"; img.src = DB + "/images/" + data.bioguide + ".jpg"; img.onerror=function(){ img.style.display='none'; };
      var nameEl = document.createElement('div'); nameEl.className='name'; nameEl.textContent = displayName;
      var pill = document.createElement('span'); pill.className='pill ' + partyLetter(party); pill.textContent = partyLetter(party);
      var seat = document.createElement('div'); seat.className='muted'; seat.textContent = (chamber==="senate"?"Senator":"Representative") + " " + seatText(chamber, state, district);
      var tenure = document.createElement('div'); tenure.className='muted'; tenure.textContent = "Tenure: " + (id.tenure_years==null?"?":id.tenure_years) + " years";

      var commWrap = document.createElement('div'); commWrap.className='stack';
      var commTitle = document.createElement('div'); commTitle.className='section-title'; commTitle.textContent = "Committees";
      var commList = document.createElement('ul'); commList.className='list';
      var committees = Array.isArray(id.committees) ? id.committees : [];
committees = committees.filter(function(c){
  var code = (c && (c.code || c.id || c.committee || "")) + "";
  var name = (c && c.name) ? c.name : "";
  if (/\d$/.test(code)) return false; // drop subcommittees with numeric codes
  if (/subcommittee/i.test(name)) return false; // heuristically drop
  return true;
});
      if (committees.length){
        committees.forEach(function(c){
          var li=document.createElement('li');
          var role = (c.role && c.role !== 'Member') ? (" — " + c.role) : '';
          li.textContent = (c.name || 'Unknown') + role;
          commList.appendChild(li);
        });
      } else {
        var li=document.createElement('li'); li.textContent="N/A"; commList.appendChild(li);
      }
      commWrap.appendChild(commTitle); commWrap.appendChild(commList);
      var row = document.createElement('div'); row.className='row';
      var right = document.createElement('div'); right.className='stack'; right.appendChild(nameEl); right.appendChild(pill); right.appendChild(seat); right.appendChild(tenure); right.appendChild(commWrap);
      row.appendChild(img); row.appendChild(right);
      header.appendChild(row);

      // ---- 2) Voting record dials
      var dials = byId('dials');
      var al = data.alignment || {};
      var dim1 = (typeof al.dw_nominate_dim1 === "number") ? al.dw_nominate_dim1 : NaN;
      var ideologyPct = isNaN(dim1) ? NaN : Math.max(0, Math.min(100, ((dim1 + 1)/2)*100));
      renderDial(dials, ideologyPct, (isNaN(dim1)?"N/A":dim1.toFixed(2)), "Ideology", "−1 liberal … +1 conservative");

      var pu = (typeof al.party_unity_pct === "number") ? (al.party_unity_pct * 100) : NaN;
      renderDial(dials, pu, (isNaN(pu)?"—":String(Math.round(pu))), "Party Unity", "100 − (% maverick votes)");

      var total = Number(al.total_votes||0);
      var missed = Number(al.missed_votes||0);
      var denom = total + missed;
      var reliability = denom ? (100 - (missed / denom) * 100) : NaN;
      renderDial(dials, reliability, (isNaN(reliability)?"—":String(Math.round(reliability))), "Vote Reliability", "100 − (missed / (total + missed))");
    }).catch(function(e){
      if(e){ setErr("Runtime error: " + (e.message || e)); }
    });
  }

  if (document.readyState === "loading"){
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
