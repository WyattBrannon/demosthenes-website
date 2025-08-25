// member.app.js — v2025-08-16-24d — YAML-first names, robust parsing
(function(){"use strict";
  function byId(id){return document.getElementById(id);}
  function setDbg(html){var d=byId('dbg'); if(d) d.innerHTML=html;}
  function setErr(html){var d=byId('dbg'); if(d) d.innerHTML='<span class="err">'+html+'</span>'; var h=byId('headerCard'); if(h&&/Loading|Fetching/.test(h.textContent)) h.textContent='Error — see message above.';}
  function pad2(n){n=String(n);return n.length<2?('0'+n):n;}
  function partyLetter(s){var t=(s||'').toUpperCase(); if(t.indexOf('D')===0||t==='100')return'D'; if(t.indexOf('R')===0||t==='200')return'R'; return'I';}
  function partyNoun(letter){ return letter==='R' ? 'Republicans' : 'Democrats'; }
  function seatText(chamber,state,district){var c=(chamber||'').toLowerCase(); if(c==='house'||c==='rep'){var dd=(district===''||district==='0'||district==null)?'AL':pad2(district); return '('+(state||'??')+'-'+dd+')';} return '('+(state||'??')+')';}

  function renderDial(container, valuePct, centerText, label, tooltip, strokeColor){
    var size=120, stroke=12, r=(size/2)-stroke, C=2*Math.PI*r;
    var pct=(valuePct==null||isNaN(valuePct))?0:Math.max(0,Math.min(100,Number(valuePct)));
    var offset=C*(1-pct/100);
    var wrap=document.createElement('div'); wrap.className='dial'; if(tooltip) wrap.title=tooltip;
    var color=strokeColor||'#2563eb';
    wrap.innerHTML=''
      + '<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="'+label+'">'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="#e5e7eb" stroke-width="'+stroke+'"></circle>'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+stroke+'" stroke-linecap="round"'
      +           ' stroke-dasharray="'+C+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 '+(size/2)+' '+(size/2)+')"></circle>'
      +   '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="800">'+centerText+'</text>'
      + '</svg>'
      + '<div class="label" style="text-align:center">'+label+'</div>';
    container.appendChild(wrap);
  }

  function findBlockForBioguide(yamlText, bioguide){
    var lines = yamlText.split(/\r?\n/);
    var blocks = [];
    var current = null;
    for (var i=0;i<lines.length;i++){
      var ln = lines[i];
      if (/^\-\s/.test(ln)){
        if (current) blocks.push(current);
        current = [ln];
      } else if (current) {
        current.push(ln);
      }
    }
    if (current) blocks.push(current);
    var found = null;
    for (var b=0; b<blocks.length; b++){
      var blk = blocks[b];
      var matched = false;
      for (var j=0;j<blk.length;j++){
        var l = (blk[j]||'').trim();
        if (l === 'bioguide: '+bioguide || l === "bioguide: '"+bioguide+"'" || l === 'bioguide: "'+bioguide+'"' ){
          matched = true; break;
        }
      }
      if (matched){ found = blk; break; }
    }
    return found;
  }

  // NEW: YAML-only helper to read latest term type (‘sen’/‘rep’) and map to 'senate'/'house'
  function latestTermTypeFromBlock(blockLines){
    if (!blockLines || !blockLines.length) return '';
    // Find the 'terms:' section and collect all '- type: …' entries beneath it
    var start = -1, baseIndent = 0;
    for (var i=0;i<blockLines.length;i++){
      var m = /^(\s*)terms\s*:\s*$/.exec(blockLines[i]);
      if (m){ start = i+1; baseIndent = m[1].length; break; }
    }
    if (start === -1) return '';
    var last = '';
    for (var j=start;j<blockLines.length;j++){
      var L = blockLines[j] || '';
      var indent = (L.match(/^\s*/)||[''])[0].length;
      if (indent <= baseIndent && !/^\s*-/.test(L)) break; // left the terms list
      var t = /-\s*type\s*:\s*(\w+)/.exec(L);
      if (t){
        var v = (t[1]||'').toLowerCase();
        if (v === 'sen' || v === 'senate') last = 'senate';
        else if (v === 'rep' || v === 'house') last = 'house';
      }
    }
    return last;
  }

  function extractNameFromBlock(blockLines){
    if (!blockLines) return null;
    var inName = false;
    var nameIndent = 0;
    var first=null, middle=null, last=null, official=null;
    for (var i=0;i<blockLines.length;i++){ 
      var ln = blockLines[i];
      var mName = ln.match(/^(\s*)name\s*:\s*$/);
      if (mName){ inName = true; nameIndent = mName[1].length; continue; }
      if (inName){ 
        var mIndent = ln.match(/^(\s*)/);
        var indent = mIndent ? mIndent[1].length : 0;
        if (indent <= nameIndent) { inName = false; }
        else {
          var mOff = ln.match(/official_full\s*:\s*(.*)$/);
          if (mOff && mOff[1] != null) { official = mOff[1].trim().replace(/^['\"]|['\"]$/g, ''); }
          var mf = ln.match(/first\s*:\s*(.*)$/);  if (mf && mf[1] != null) first  = mf[1].trim().replace(/^['\"]|['\"]$/g, '');
          var mm = ln.match(/middle\s*:\s*(.*)$/); if (mm && mm[1] != null) middle = mm[1].trim().replace(/^['\"]|['\"]$/g, '');
          var ml = ln.match(/last\s*:\s*(.*)$/);   if (ml && ml[1] != null) last   = ml[1].trim().replace(/^['\"]|['\"]$/g, '');
        }
      }
    }
    if (official) return official;
    var parts=[]; if(first) parts.push(first); if(middle) parts.push(middle); if(last) parts.push(last);
    return parts.length ? parts.join(' ') : null;
  }

  function isSubcommittee(c){
    if(!c) return false;
    var code=String((c.code||c.id||c.committee||''));
    var name=String(c.name||'');
    if(c.subcommittee===true || c.is_subcommittee===true || c.parent) return true;
    if(/subcommittee/i.test(name)) return true;
    if(/[A-Za-z\-]*\d+$/.test(code)) return true;
    if(/\d+\s*$/.test(name)) return true;
    return false;
  }

  function main(){
    var DEFAULT_DATA_BASE='https://WyattBrannon.github.io/demosthenes-data';
    var DB=(localStorage.getItem('DEMOS_DATA_BASE')||DEFAULT_DATA_BASE).replace(/\/+$/,'');
    var params=new URL(location.href).searchParams;
    var bioguide=params.get('bioguide')||'';
    var memberURL=DB+'/members/'+bioguide+'.json';
    var yamlURL=DB+'/legislators-current.yaml';

    setDbg('<code>DATA_BASE</code> = '+DB+' · <code>bioguide</code> = '+(bioguide||'(missing)')+' · <code>URL</code> = '+(bioguide?memberURL:'(n/a)'));

    var header=byId('headerCard'); if(!bioguide){ if(header) header.textContent='Missing ?bioguide=...'; return; }
    if(header) header.textContent='Fetching member JSON & YAML...';

    Promise.all([
      fetch(memberURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+memberURL); return r.json(); }),
      fetch(yamlURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+yamlURL); return r.text(); })
    ]).then(function(results){
      var data = results[0] || {}, yamlText = results[1] || '';
      try { window.__memberData = data; } catch(e){}
      // --- District Map: render small Leaflet map with district polygon over OSM basemap ---
      try {
        (function(){
          var noteEl = document.getElementById('district-map-note');
          var mapEl  = document.getElementById('district-map');
          if (!mapEl || typeof L === 'undefined') return;

          function pad2(n){ n=String(n||''); return n.length<2 ? ('0'+n) : n; }
          var STATE_FIPS = {"AL":"01","AK":"02","AZ":"04","AR":"05","CA":"06","CO":"08","CT":"09","DE":"10","FL":"12","GA":"13","HI":"15","ID":"16","IL":"17","IN":"18","IA":"19","KS":"20","KY":"21","LA":"22","ME":"23","MD":"24","MA":"25","MI":"26","MN":"27","MS":"28","MO":"29","MT":"30","NE":"31","NV":"32","NH":"33","NJ":"34","NM":"35","NY":"36","NC":"37","ND":"38","OH":"39","OK":"40","OR":"41","PA":"42","RI":"44","SC":"45","SD":"46","TN":"47","TX":"48","UT":"49","VT":"50","VA":"51","WA":"53","WV":"54","WI":"55","WY":"56","DC":"11","PR":"72"};

          var id = data && data.identity || {};
          var state = (id.state || '').toUpperCase();
          var district = (id.district || '').toString().toUpperCase();
          if (!state) { if (noteEl) noteEl.textContent = 'Map unavailable (missing state)'; return; }
          if (district === 'AL' || district === 'AT-LARGE' || district === '0' || district === '00') district = '00';
          if (/^\d+$/.test(district)) district = pad2(district);

          var stfp = STATE_FIPS[state];
          if (!stfp) { if (noteEl) noteEl.textContent = 'Map unavailable (unknown state)'; return; }

          var useStateOverlay = (!district || district === '00');
var layerURL, where;
if (useStateOverlay) {
  layerURL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/76"; // States
  where = "STATE='" + stfp + "'";
} else {
  layerURL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/50"; // 118th CDs
  where = "STATE='" + stfp + "' AND CD118='" + district + "'";
}
var url = layerURL + "/query?where=" + encodeURIComponent(where) + "&outFields=*&returnGeometry=true&f=geojson";

          // Initialize map
          var map = L.map(mapEl, { scrollWheelZoom:false, dragging:true, touchZoom:true });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          fetch(url, { cache:'force-cache' }).then(function(r){ return r.json(); }).then(function(geo){
            try{
              if (!geo || !geo.features || !geo.features.length) {
                if (noteEl) noteEl.textContent = 'District boundary not found.';
                return;
              }
              var layer = L.geoJSON(geo, {
                style: { color: '#2563eb', weight: 2, fillOpacity: 0.10 }
              }).addTo(map);
              map.fitBounds(layer.getBounds(), { padding:[12,12] });
              if (noteEl) {
              var chamber = (id && id.chamber ? String(id.chamber).toLowerCase() : '');
              var atLarge = (!district || district==='00');
              if (chamber === 'senate' || atLarge) {
                noteEl.textContent = state + ' (118th CD)';
              } else {
                noteEl.textContent = state + '-' + district + ' (118th CD)';
              }
            }
            }catch(e){ if (noteEl) noteEl.textContent = 'Map error'; }
          }).catch(function(){ if (noteEl) noteEl.textContent = 'Map unavailable (network)'; });
        })();
      } catch (e) { /* do nothing; map is optional */ }
    

      // --- Office list (first three, with Show more/less toggle) ---
      (function(){
        try {
          var list = document.getElementById('office-list');
          var none = document.getElementById('office-list-none');
          if (!list) return;
          var officesAll = (data && Array.isArray(data.offices)) ? data.offices.slice() : [];
          var expandedOffices = false;

          // Create / get toggle container
          var ctr = document.getElementById('office-list-ctr');
          if (!ctr) {
            ctr = document.createElement('div');
            ctr.id = 'office-list-ctr';
            ctr.style.paddingTop = '8px';
            if (list.parentNode) list.parentNode.insertBefore(ctr, list.nextSibling);
          }
          var btn = document.getElementById('office-list-toggle');
          if (!btn) {
            btn = document.createElement('button');
            btn.id = 'office-list-toggle';
            btn.className = 'btn';
            ctr.appendChild(btn);
          }

          function renderOffices(){
            list.innerHTML = '';
            if (!officesAll.length) {
              if (none) { none.style.display = ''; }
              list.style.display = 'none';
              ctr.style.display = 'none';
              return;
            }
            var slice = expandedOffices ? officesAll : officesAll.slice(0, 3);
            slice.forEach(function(o){
              var city  = (o.city  || '').toString();
              var state = (o.state || '').toString();
              var zip   = (o.zip   || o.zip5 || '').toString();
              var addr  = (o.address || '').toString();
              var suite = (o.suite   || '').toString();
              var phone = (o.phone   || '').toString();

              var item  = document.createElement('div');
              item.className = 'office-entry';
              item.style.padding = '8px 0';
              item.style.borderTop = '1px solid var(--border)';

              var top = document.createElement('div');
              var cityState = [city, state].filter(Boolean).join(', ');
              top.innerHTML = (cityState ? ('<strong>' + cityState + '</strong>') : '') + (zip ? (' ' + zip) : '');
              item.appendChild(top);

              var line2 = document.createElement('div');
              var line2txt = addr + (addr && suite ? ', ' : '') + suite;
              line2.textContent = line2txt;
              item.appendChild(line2);

              if (phone) {
                var line3 = document.createElement('div');
                line3.textContent = phone;
                item.appendChild(line3);
              }

              list.appendChild(item);
            });
            list.style.display = '';

            if (officesAll.length > 3) {
              ctr.style.display = '';
              btn.textContent = expandedOffices ? 'Show less' : 'Show more';
            } else {
              ctr.style.display = 'none';
            }

            if (none) { none.style.display = 'none'; }
          }

          btn.onclick = function(e){ e.preventDefault(); expandedOffices = !expandedOffices; renderOffices(); };
          renderOffices();
        } catch (e) { /* non-fatal */ }
      })();


      // --- District contact buttons (Website / Contact) ---
      (function(){
        try {
          var wrap = document.getElementById('district-contact-btns');
          var wBtn = document.getElementById('btn-website');
          var cBtn = document.getElementById('btn-contact');
          var url  = (data && data.contact && data.contact.url) ? String(data.contact.url) : "";
          var cf   = (data && data.contact && data.contact.contact_form) ? String(data.contact.contact_form) : "";
          var shown = false;

          if (wBtn) {
            if (/^https?:\/\//i.test(url)) { wBtn.href = url; wBtn.style.display=''; shown = true; }
            else { wBtn.style.display='none'; }
          }
          if (cBtn) {
            if (/^https?:\/\//i.test(cf)) { cBtn.href = cf; cBtn.style.display=''; shown = true; }
            else { cBtn.style.display='none'; }
          }
          if (wrap) wrap.style.display = shown ? '' : 'none';
          // Move the district map note below the buttons
          try {
            var note = document.getElementById('district-map-note');
            if (wrap && note && note.parentNode) {
              wrap.parentNode.insertBefore(note, wrap.nextSibling);
            }
          } catch(e) { /* ignore */ }
        } catch (e) { /* non-fatal */ }
      })();


      var id = data.identity || {};
      // ===== Campaign Finance Overview: pie + summary + top committees (toggle like Key Votes) + top employers (toggle) =====
      (function(){
        try {
          var financeNone = document.getElementById('finance-none');
          var financeContent = document.getElementById('finance-content');
          var fec = data && data.fec;
          var hasTotals = !!(fec && fec.totals);
          var hasTop = !!(fec && fec.top_contributors);
          var hasData = hasTotals || hasTop;

          if (financeNone) financeNone.style.display = hasData ? 'none' : '';
          if (!hasData) { if (financeContent) financeContent.innerHTML = ''; return; }

          function num(x){ if (x==null) return 0; var s=(''+x).replace(/[\$,]/g,''); var n=parseFloat(s); return isNaN(n)?0:n; }
          function pickTotals(obj){
            if (!obj || typeof obj !== 'object') return null;
            var keys = Object.keys(obj);
            var need = ['individual_itemized_contributions','individual_unitemized_contributions','other_political_committee_contributions','political_party_committee_contributions','candidate_contribution','receipts'];
            var hasOne = need.some(function(k){ return Object.prototype.hasOwnProperty.call(obj,k); });
            if (hasOne) return obj;
            var first = (keys.length ? obj[keys[0]] : null);
            return (first && typeof first === 'object') ? first : null;
          }
          function fmtMoney(n){ return '$' + Math.round(n).toLocaleString(); }

          if (financeContent) financeContent.innerHTML = '';

          // ----- PIE CHART -----
          var totalsObj = hasTotals ? pickTotals(fec.totals) : null;
          var chartSum = 0;
          if (totalsObj) {
            var parts = [
              { label: 'Small-dollar individual donations', value: num(totalsObj['individual_unitemized_contributions']) },
              { label: 'Large-dollar individual donations', value: num(totalsObj['individual_itemized_contributions']) },
              { label: 'Committee donations', value: num(totalsObj['other_political_committee_contributions']) + num(totalsObj['political_party_committee_contributions']) },
              { label: 'Self-funded donations', value: num(totalsObj['candidate_contribution']) },
              { label: 'Other donations', value: num(totalsObj['other_receipts']) }
            ];
            chartSum = parts.reduce(function(a,b){ return a + (b.value||0); }, 0);
            if (chartSum > 0) {
              var tip = document.getElementById('finance-tooltip');
              if (!tip){
                tip = document.createElement('div');
                tip.id = 'finance-tooltip';
                tip.style.position = 'fixed'; tip.style.pointerEvents = 'none'; tip.style.zIndex = '9999';
                tip.style.background = 'rgba(17,24,39,0.92)'; tip.style.color = '#fff';
                tip.style.padding = '8px 10px'; tip.style.borderRadius = '8px';
                tip.style.fontSize = '12px'; tip.style.lineHeight = '1.2';
                tip.style.transform = 'translate(-50%, -120%)'; tip.style.opacity = '0';
                tip.style.transition = 'opacity .12s ease';
                document.body.appendChild(tip);
              }
              function showTip(x,y, html){ tip.innerHTML = html; tip.style.left = x+'px'; tip.style.top = y+'px'; tip.style.opacity='1'; }
              function hideTip(){ tip.style.opacity = '0'; }

              var W=160, H=160, R=58, CX=W/2, CY=H/2;
              var C = 2*Math.PI*R, COLORS=['#0ea5e9','#f97316','#22c55e','#a855f7','#eab308'], STROKE=22;

              var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
              svg.setAttribute('viewBox','0 0 '+W+' '+H); svg.setAttribute('width', W); svg.setAttribute('height', H);
              svg.style.maxWidth = '170px'; svg.style.display='block';

              var bg = document.createElementNS('http://www.w3.org/2000/svg','circle');
              bg.setAttribute('cx', CX); bg.setAttribute('cy', CY); bg.setAttribute('r', R);
              bg.setAttribute('fill','none'); bg.setAttribute('stroke','#e5e7eb'); bg.setAttribute('stroke-width', STROKE);
              svg.appendChild(bg);

              var offset=0;
              parts.forEach(function(p, idx){
                var frac = (p.value||0) / chartSum; if (frac <= 0) return;
                var seg = document.createElementNS('http://www.w3.org/2000/svg','circle');
                seg.setAttribute('cx', CX); seg.setAttribute('cy', CY); seg.setAttribute('r', R);
                seg.setAttribute('fill','none'); seg.setAttribute('stroke', COLORS[idx % COLORS.length]);
                seg.setAttribute('stroke-width', STROKE);
                seg.setAttribute('stroke-dasharray', (frac*C) + ' ' + (C - frac*C));
                seg.setAttribute('stroke-dashoffset', -offset*C);
                seg.setAttribute('transform','rotate(-90 '+CX+' '+CY+')');
                seg.addEventListener('mouseenter', function(e){ var percent=Math.round(frac*100); showTip(e.clientX,e.clientY,'<b>'+p.label+'</b><br>'+fmtMoney(p.value)+' ('+percent+'%)'); });
                seg.addEventListener('mousemove', function(e){ showTip(e.clientX,e.clientY, tip.innerHTML); });
                seg.addEventListener('mouseleave', hideTip);
                seg.addEventListener('touchstart', function(e){ var tchg=(e.touches&&e.touches[0])||null; var percent=Math.round(frac*100); if(tchg) showTip(tchg.clientX,tchg.clientY,'<b>'+p.label+'</b><br>'+fmtMoney(p.value)+' ('+percent+'%)'); }, {passive:true});
                seg.addEventListener('touchend', hideTip);
                svg.appendChild(seg); offset += frac;
              });

              var legend = document.createElement('div');
              legend.style.display='grid'; legend.style.gridTemplateColumns='1fr'; legend.style.gap='6px';
              legend.style.margin='0'; legend.style.padding='0 8px'; legend.style.textAlign='center';
              parts.forEach(function(p, idx){
                var row=document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px'; row.style.justifyContent='center';
                var sw=document.createElement('span'); sw.style.display='inline-block'; sw.style.width='12px'; sw.style.height='12px'; sw.style.borderRadius='3px'; sw.style.background=COLORS[idx%COLORS.length];
                var lbl=document.createElement('span'); lbl.textContent=p.label;
                row.appendChild(sw); row.appendChild(lbl); legend.appendChild(row);
              });

              var wrap=document.createElement('div'); wrap.style.display='inline-flex'; wrap.style.justifyContent='center'; wrap.style.alignItems='center'; wrap.style.gap='16px'; wrap.style.flexWrap='wrap';
              wrap.appendChild(svg); wrap.appendChild(legend);
              var center=document.createElement('div'); center.style.width='100%'; center.style.textAlign='center'; center.appendChild(wrap);
              financeContent.appendChild(center);
            }
          }

          // ----- Summary line -----
          var id = data.identity || {};
          var cname = (id && (id.name || id.display_name || id.official_full || id.full || (id.first&&id.last&&(id.first+' '+id.last)) || (id.firstname&&id.lastname&&(id.firstname+' '+id.lastname)))) || (id && id.bioguide) || 'This member';
          var receiptsVal = num(fec && (fec.receipts || (totalsObj && totalsObj.receipts))); if (!receiptsVal && chartSum) receiptsVal = chartSum;
          var summary = document.createElement('div'); summary.style.marginTop='8px'; summary.style.fontSize='0.95rem'; summary.style.textAlign='center';
          summary.textContent = cname + ' has raised ' + fmtMoney(receiptsVal) + ' this cycle thus far.';
          financeContent.appendChild(summary);

          // ----- Major Committee Donations (with toggle styled like Key Votes) -----
          var nextTitle = document.createElement('div'); nextTitle.className = 'section-title'; nextTitle.style.marginTop='12px'; nextTitle.textContent='Major Committee Donations';
          financeContent.appendChild(nextTitle);

          var pacs = (((fec||{}).top_contributors||{}).top_contributors||{}).pacs || [];
          if (Array.isArray(pacs) && pacs.length){
            pacs.sort(function(a,b){ return num((b&&b.total)) - num((a&&a.total)); });

            var listWrap = document.createElement('div');
            listWrap.id = 'committee-list-wrap';

            var expanded = false;
            function renderPacs(){
              listWrap.innerHTML = '';
              var limit = expanded ? Math.min(10, pacs.length) : Math.min(3, pacs.length);
              var slice = pacs.slice(0, limit);
              slice.forEach(function(p){
                var name = (p && (p.name || p.committee_name)) || (p && p.committee_id) || 'Unknown committee';
                var dollars = fmtMoney(num(p && p.total));
                var row = document.createElement('div');
                row.className = 'stack';
                row.style.borderTop = '1px solid var(--border)';
                row.style.paddingTop = '10px';
                row.style.paddingBottom = '10px';
                row.style.lineHeight = '1.35';
                var head = document.createElement('div');
                var strong = document.createElement('strong'); strong.textContent = String(name); head.appendChild(strong);
                var sep = document.createTextNode(' \u2022 ');
                head.appendChild(sep);
                var amt = document.createElement('span'); amt.textContent = dollars; head.appendChild(amt);
                row.appendChild(head);
                listWrap.appendChild(row);
              });

              ctr1.innerHTML = '';
              if (pacs.length > 3){
                var btn = document.createElement('button');
                btn.className = 'btn';
                btn.textContent = expanded ? 'Show less' : 'Show more';
                btn.addEventListener('click', function(e){ e.preventDefault(); expanded = !expanded; renderPacs(); });
                ctr1.appendChild(btn);
              }
            }

            var ctr1 = document.createElement('div');
            ctr1.style.paddingTop = '8px';

            renderPacs();
            financeContent.appendChild(listWrap);
            financeContent.appendChild(ctr1);
          } else {
            var none = document.createElement('div'); none.className='muted'; none.style.textAlign='left'; none.textContent='No committee donations available.';
            financeContent.appendChild(none);
          }

          } catch(e) { /* non-fatal */ }
        })();


      var block = findBlockForBioguide(yamlText, bioguide);
      var displayName = extractNameFromBlock(block) || '(Name unavailable)';

      header.innerHTML='';
      var party=id.party||'';

      
      // Party color for dials
      var pLetter = partyLetter(party);
      var colorParty = (pLetter==='R') ? '#dc2626' : '#2563eb';
var nameLine=document.createElement('div'); nameLine.className='name-line';
      var nameEl=document.createElement('span'); nameEl.className='name'; nameEl.textContent=displayName; nameEl.title=displayName;
      var pill=document.createElement('span'); pill.className='pill '+partyLetter(party); pill.textContent=partyLetter(party);
      nameLine.appendChild(nameEl); nameLine.appendChild(pill);

      var img=new Image(); img.className='portrait'; img.alt=(displayName||'Portrait'); img.src=DB+'/images/'+bioguide+'.jpg'; img.onerror=function(){img.style.display='none';};

      // YAML-only chamber resolution (single source of truth)
      var chamber=(function(){ 
        try { return latestTermTypeFromBlock(block) || ''; } 
        catch(e){ return ''; } 
      })();

      var state=id.state||''; var district=id.district||null;
      var seat=document.createElement('div'); seat.className='muted'; seat.textContent=(chamber==='senate'?'Senator':'Representative')+' '+seatText(chamber,state,district);

      var tenure=document.createElement('div'); tenure.className='muted'; tenure.textContent='Tenure in Congress: '+(id.tenure_years==null?'?':id.tenure_years)+' years';

      var commWrap=document.createElement('div'); commWrap.className='stack';
      var commTitle=document.createElement('div'); commTitle.className='section-title'; commTitle.textContent='Committees';
      commTitle.style.fontSize = '1.10rem';
      var commList=document.createElement('ul'); commList.className='list';
      var committees=Array.isArray(id.committees)?id.committees:[];
      committees=committees.filter(function(c){return !isSubcommittee(c);});
      if(committees.length){ committees.forEach(function(c){ var li=document.createElement('li'); var role=(c.role&&c.role!=='Member')?(' — '+c.role):''; li.textContent=(c.name||'Unknown')+role; commList.appendChild(li); }); } else { var li=document.createElement('li'); li.textContent='N/A'; commList.appendChild(li); }
      commWrap.appendChild(commTitle); commWrap.appendChild(commList);

      var row=document.createElement('div'); row.className='row';
      var right=document.createElement('div'); right.className='stack'; right.appendChild(nameLine); right.appendChild(seat); right.appendChild(tenure); right.appendChild(commWrap);
      row.appendChild(img); row.appendChild(right); header.appendChild(row);

      var dials=byId('dials'); var al=data.alignment||{};
      var dim1=(typeof al.dw_nominate_dim1==='number')?al.dw_nominate_dim1:NaN;
      var mag=isNaN(dim1)?NaN:Math.max(0,Math.min(1,Math.abs(dim1)));
      var colorIdeo=isNaN(dim1)?'#2563eb':(dim1>0?'#dc2626':'#2563eb');
      var magDisplay=(isNaN(mag)?'N/A':String(Math.round(mag*100))+'%');
      renderDial(dials, isNaN(mag)?NaN:(mag*100), magDisplay, 'Ideology', 'Left (−) to Right (+)', colorIdeo);

      (function(){ 
        var firstDial = dials.querySelector('.dial');
        var dirParty = al.dim1_direction_party;
        var pctParty = (typeof al.dim1_percentile_party === 'number') ? Math.round(al.dim1_percentile_party) : null;
        var pLetter = partyLetter(id.party);
        var pNoun = partyNoun(pLetter);
        if (dirParty && pctParty != null && firstDial) {
          var subP = document.createElement('div');
          subP.className = 'muted';
          subP.style.fontSize = '0.9rem';
          subP.style.textAlign = 'center';
          var side = (dirParty === 'left' ? 'left' : (dirParty === 'right' ? 'right' : 'center'));
          
            // Adjust text for <50%: flip side and use complement
            if (typeof pctParty === 'number') {
              var adjSide = side;
              var adjPct  = pctParty;
              if (pctParty < 50 && side !== 'center') {
                adjSide = (side === 'left') ? 'right' : 'left';
                adjPct = 100 - pctParty;
              }
              subP.textContent = (side === 'center')
                ? ('At the center of ' + pNoun)
                : ('To the ' + adjSide + ' of ' + adjPct + '% of ' + pNoun);
            } else {
              subP.textContent = (side === 'center')
                ? ('At the center of ' + pNoun)
                : ('To the ' + side + ' of ' + pctParty + '% of ' + pNoun);
            }
          firstDial.appendChild(subP);
        }
      })();;

      var pu=(typeof al.party_unity_pct==='number')?(al.party_unity_pct*100):NaN;
      var puDisplay=(isNaN(pu)?'—':String(Math.round(pu))+'%');
      renderDial(dials, pu, puDisplay, 'Party Loyalty', '100 − (% maverick votes)', colorParty);
      (function(){
        var dialsList = dials.querySelectorAll('.dial');
        var puDial = dialsList && dialsList[1];
        var pctPUraw = (typeof al.party_unity_percentile_party === 'number') ? Math.round(al.party_unity_percentile_party) : null;
        var pLetter = partyLetter(id.party);
        var pNoun = partyNoun(pLetter);
        if (puDial && pctPUraw != null) {
          var sub = document.createElement('div');
          sub.className = 'muted';
          sub.style.fontSize = '0.9rem';
          sub.style.textAlign = 'center';
          if (pctPUraw > 50) {
            sub.textContent = 'More loyal than ' + pctPUraw + '% of ' + pNoun;
          } else {
            sub.textContent = 'More maverick than ' + (100 - pctPUraw) + '% of ' + pNoun;
          }
          puDial.appendChild(sub);
        }
      })();

      var total=Number(al.total_votes||0); var missed=Number(al.missed_votes||0); var denom=total+missed;
      var reliability=denom?(100-(missed/denom)*100):NaN;
      var relDisplay=(isNaN(reliability)?'—':String(Math.round(reliability))+'%');
      renderDial(dials, reliability, relDisplay, 'Vote Attendance', '100 − (missed / (total + missed))', colorParty);
      (function(){
        var dialsList = dials.querySelectorAll('.dial');
        var relDial = dialsList && dialsList[2];
        var pctRel = (typeof al.reliability_percentile_party === 'number') ? Math.round(al.reliability_percentile_party) : null;
        var pLetter = partyLetter(id.party);
        var pNoun = partyNoun(pLetter);
        if (relDial && pctRel != null) {
          var sub = document.createElement('div');
          sub.className = 'muted';
          sub.style.fontSize = '0.9rem';
          sub.style.textAlign = 'center';
          
            if (typeof pctRel === 'number') {
              if (pctRel < 50) {
                sub.textContent = 'Less reliable than ' + (100 - pctRel) + '% of ' + pNoun;
              } else {
                sub.textContent = 'More reliable than ' + pctRel + '% of ' + pNoun;
              }
            } else {
              sub.textContent = '';
            }
          relDial.appendChild(sub);
        }
      
            })();
      // --- Signature Work Dials (Total Bills Passed & Bipartisan Bills Sponsored) ---
      
        try {
          // Find Signature Work card and container
          var sigCard = null;
          var cards = document.querySelectorAll('.card');
          for (var i=0;i<cards.length;i++){
            var h = cards[i].querySelector('.section-title');
            if (h && (function(t){ t=(t||'').trim(); return t==='Signature Work' || t==='Signature Works'; })(h.textContent)) { sigCard = cards[i]; break; }
          }
          if (!sigCard) return;
          var container = document.getElementById('sigwork-dials');
          if (!container) {
            container = document.createElement('div');
            container.id = 'sigwork-dials';
            container.className = 'grid two';
            var headerEl = sigCard.querySelector('.section-title');
            if (headerEl) headerEl.insertAdjacentElement('afterend', container);
            else sigCard.appendChild(container);
          }
          container.innerHTML = '';

                    var ws = (data && data.work_statistics) || {};
          var hasTotal = (ws && Object.prototype.hasOwnProperty.call(ws, 'total_hr_sr'));
          container.innerHTML = '';

          if (!hasTotal) {
            var no = document.createElement('div');
            no.className = 'muted';
            no.style.textAlign = 'left';
            no.textContent = 'No information available.';
            container.appendChild(no);
          } else {
            function toNum(x){ var n = Number(x); return isNaN(n) ? 0 : n; }
            var total = toNum(ws.total_hr_sr);
            var passed = toNum(ws.total_hr_sr_became_public_law);
            var bipart = toNum(ws.total_hr_sr_bipartisan);

            var pctPassed = total > 0 ? (passed / total) * 100 : NaN;
            var pctBipart = total > 0 ? (bipart / total) * 100 : NaN;

            // Keep dial style consistent with Voting Record (party color)
            renderDial(container, isNaN(pctPassed) ? NaN : Math.max(0, Math.min(100, Math.round(pctPassed))), String(passed), 'Total Bills Passed', 'Became Public Law / Total HR+SR', colorParty);
            renderDial(container, isNaN(pctBipart) ? NaN : Math.max(0, Math.min(100, Math.round(pctBipart))), String(bipart), 'Bipartisan Bills Sponsored', 'Bipartisan HR+SR / Total HR+SR', colorParty);

            // Subtexts under dial labels (only when there are some bills)
            if (total > 0) {
              var dials = container.querySelectorAll('.dial');
              if (dials && dials.length >= 2) {
                var dialPassed = dials[dials.length - 2];
                var dialBipart = dials[dials.length - 1];
                var sub1 = document.createElement('div');
                sub1.className = 'muted';
                sub1.style.fontSize = '0.9rem';
                sub1.style.textAlign = 'center';
                sub1.textContent = String(Math.round(pctPassed)) + '% of bills sponsored passed';
                dialPassed.appendChild(sub1);
                // Extra subtext: effectiveness percentile (party-relative)
                var partyWord = (typeof partyNoun === 'function' ? partyNoun(pLetter) : (pLetter==='R' ? 'Republicans' : 'Democrats'));
                var pEff = ws && typeof ws.passed_rate_percentile_party === 'number' ? ws.passed_rate_percentile_party : null;
                if (pEff != null) {
                  var sub1b = document.createElement('div');
                  sub1b.className = 'muted';
                  sub1b.style.fontSize = '0.9rem';
                  sub1b.style.textAlign = 'center';
                  sub1b.textContent = (pEff < 50
  ? ('Less effective than ' + String(Math.round(100 - pEff)) + '% of ' + partyWord)
  : ('More effective than ' + String(Math.round(pEff)) + '% of ' + partyWord)
);
dialPassed.appendChild(sub1b);
                }

                var sub2 = document.createElement('div');
                sub2.className = 'muted';
                sub2.style.fontSize = '0.9rem';
                sub2.style.textAlign = 'center';
                sub2.textContent = String(Math.round(pctBipart)) + '% of bills sponsored were bipartisan';
                dialBipart.appendChild(sub2);
                // Extra subtext: bipartisanship percentile (party-relative)
                var pBip = ws && typeof ws.bipartisan_rate_percentile_party === 'number' ? ws.bipartisan_rate_percentile_party : null;
                if (pBip != null) {
                  var sub2b = document.createElement('div');
                  sub2b.className = 'muted';
                  sub2b.style.fontSize = '0.9rem';
                  sub2b.style.textAlign = 'center';
                  sub2b.textContent = (pBip < 50
  ? ('Less bipartisan than ' + String(Math.round(100 - pBip)) + '% of ' + partyWord)
  : ('More bipartisan than ' + String(Math.round(pBip)) + '% of ' + partyWord)
);
dialBipart.appendChild(sub2b);
                }
              }
            }
          }
        } catch (e) { /* non-fatal */ }
      ;


      
      // --- Sponsored Bills list (with Policy Area filter + Show more/less) ---
(function(){
  try {
    // Find (or create) title + list container
    var billsWrap = document.getElementById('sponsored-bills');
    var sbTitleEl = null;

    if (!billsWrap) {
      var sigCard = null;
      var cards = document.querySelectorAll('.card');
      for (var i=0;i<cards.length;i++){
        var h = cards[i].querySelector('.section-title');
        if (h && (h.textContent||'').trim().startsWith('Signature Work')){ sigCard = cards[i]; break; }
      }
      if (sigCard) {
        sbTitleEl = document.createElement('div');
        sbTitleEl.className = 'section-title';
        sbTitleEl.textContent = 'Sponsored Bills';
        sigCard.appendChild(sbTitleEl);

        billsWrap = document.createElement('div');
        billsWrap.id = 'sponsored-bills';
        billsWrap.className = 'stack';
        sigCard.appendChild(billsWrap);
      }
    } else {
      // Page already has the header markup; grab the title on the line above the list
      var maybeTitle = billsWrap.previousElementSibling;
      if (maybeTitle && maybeTitle.classList && maybeTitle.classList.contains('section-title')) {
        sbTitleEl = maybeTitle;
      }
    }
    if (!billsWrap) return;

    // Prepare data (newest first)
    var billsAll = (function(){
      var arrSource = (typeof window !== 'undefined' && window.__memberData && window.__memberData.bills) ||
                      (typeof data !== 'undefined' && data && data.bills) || [];
      var arr = Array.isArray(arrSource) ? arrSource.slice() : [];
      arr.sort(function(a,b){
        var ad = new Date((a && a.introducedDate) || 0).getTime();
        var bd = new Date((b && b.introducedDate) || 0).getTime();
        return bd - ad; // newest first
      });
      return arr;
    })();

    // Unique policy areas (skip blanks), sorted
    var policyAreas = Array.from(
      new Set(
        billsAll
          .map(function(b){ return String(b && b.policy_area || '').trim(); })
          .filter(function(s){ return !!s; })
      )
    ).sort();

    // State
    var expandedSB = false;
    var activePolicy = null; // null = no filter (show all)

    // --- Header: put a right-aligned Filter button on the same line as "Sponsored Bills"
    if (sbTitleEl) {
      sbTitleEl.style.display = 'flex';
      sbTitleEl.style.alignItems = 'center';
      sbTitleEl.style.gap = '8px';

      var filterBtn = document.createElement('button');
      filterBtn.className = 'btn';
      filterBtn.textContent = 'Filter';
      filterBtn.style.marginLeft = 'auto'; // right-align
      filterBtn.setAttribute('aria-haspopup', 'true');
      filterBtn.setAttribute('aria-expanded', 'false');
      sbTitleEl.appendChild(filterBtn);

      // Popover (simple, self-styled)
      var pop = document.createElement('div');
      pop.style.position = 'fixed';
      pop.style.zIndex = '10000';
      pop.style.background = '#fff';
      pop.style.border = '1px solid var(--border)';
      pop.style.borderRadius = '12px';
      pop.style.boxShadow = '0 8px 20px rgba(0,0,0,.08)';
      pop.style.padding = '10px';
      pop.style.minWidth = '260px';
      pop.style.maxWidth = 'min(96vw, 420px)';
      pop.style.display = 'none';

      // Build content inside popover
      var title = document.createElement('div');
      title.style.fontWeight = '700';
      title.style.marginBottom = '6px';
      title.textContent = 'Filter by policy area';
      pop.appendChild(title);

      if (!policyAreas.length) {
        var none = document.createElement('div');
        none.className = 'muted';
        none.textContent = 'No policy areas in this list.';
        pop.appendChild(none);
        filterBtn.disabled = true;
      } else {
        // Search box (client-side)
        var search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Search areas…';
        search.style.width = '100%';
        search.style.padding = '8px 10px';
        search.style.border = '1px solid var(--border)';
        search.style.borderRadius = '8px';
        search.style.marginBottom = '8px';
        pop.appendChild(search);

        // Chip grid
        var chipWrap = document.createElement('div');
        chipWrap.style.display = 'flex';
        chipWrap.style.flexWrap = 'wrap';
        chipWrap.style.gap = '8px';
        chipWrap.style.maxHeight = '220px';
        chipWrap.style.overflow = 'auto';
        pop.appendChild(chipWrap);

        function makeChip(label, isActive){
          var c = document.createElement('button');
          c.type = 'button';
          c.className = 'pill N';
          c.style.cursor = 'pointer';
          c.style.borderWidth = '1px';
          c.style.userSelect = 'none';
          c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          c.textContent = (isActive ? '✓ ' : '') + label;
          if (isActive) {
            c.style.background = '#e5e7eb';
            c.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,.08)';
            c.style.fontWeight = '700';
            c.style.outline = '2px solid rgba(0,0,0,.12)';
          }
          c.addEventListener('click', function(e){
            e.preventDefault();
            if (label === '(All)') {
              activePolicy = null;
            } else {
              activePolicy = (activePolicy === label) ? null : label; // toggle
            }
            // Keep the popover open and update emphasis in-place
            renderChips(search.value);
            renderSponsoredBills(); // re-render with new filter
          });
          return c;
        }

        function renderChips(q){
          chipWrap.innerHTML = '';
          var qry = (q||'').toLowerCase().trim();
          // Always include an (All) chip at the front
          chipWrap.appendChild(makeChip('(All)', activePolicy === null));
          policyAreas
            .filter(function(a){ return !qry || a.toLowerCase().indexOf(qry) !== -1; })
            .forEach(function(a){
              chipWrap.appendChild(makeChip(a, activePolicy === a));
            });
        }
        renderChips('');

        search.addEventListener('input', function(){
          renderChips(search.value);
        });
      }

      document.body.appendChild(pop);

      function openPop(){
        if (filterBtn.disabled) return;
        var r = filterBtn.getBoundingClientRect();
        var top = (r.bottom + 8);
        var left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 12);
        pop.style.display = 'block';
        pop.style.top = top + 'px';
        pop.style.left = left + 'px';
        filterBtn.setAttribute('aria-expanded', 'true');
        var inp = pop.querySelector('input[type="search"]');
        if (inp) { setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 0); }
        setTimeout(function(){
          window.addEventListener('mousedown', onDocClick, { once:true });
          window.addEventListener('keydown', onEsc, { once:true });
        },0);
      }
      function closePop(){
        pop.style.display = 'none';
        filterBtn.setAttribute('aria-expanded', 'false');
      }
      function onDocClick(e){
        if (pop.contains(e.target) || e.target === filterBtn) {
          if (!pop.contains(e.target)) closePop();
          else {
            window.addEventListener('mousedown', onDocClick, { once:true });
          }
          return;
        }
        closePop();
      }
      function onEsc(e){ if (e.key === 'Escape') closePop(); }

      filterBtn.addEventListener('click', function(e){
        e.preventDefault();
        if (pop.style.display === 'block') closePop(); else openPop();
      });
    }

    function fmtType(bt){
      bt = String(bt||'').toLowerCase();
      if (bt==='hr') return 'H.R.';
      if (bt==='sr') return 'S.R.';
      return bt.toUpperCase();
    }

    function renderSponsoredBills(){
      billsWrap.innerHTML = '';

      // Apply filter (if any)
      var list = activePolicy
        ? billsAll.filter(function(b){ return String(b && b.policy_area || '') === activePolicy; })
        : billsAll.slice();

      var show = expandedSB ? list.slice(0, Math.min(10, list.length))
                            : list.slice(0, Math.min(3, list.length));

      show.forEach(function(b){
        var type = fmtType(b && b.billType);
        var num = String(b && b.number || '');
        var date = String(b && b.introducedDate || '');
        var title = String(b && b.title || '');
        var latest = b && b.latestAction && b.latestAction.text ? String(b.latestAction.text) : '';
        var policyArea = String(b && b.policy_area || '');

        var row = document.createElement('div');
        row.className = 'stack';
        row.style.borderTop = '1px solid var(--border)';
        row.style.paddingTop = '8px';

        // First line: TYPE NUM • DATE (+ pills)
        var head = document.createElement('div');
        var strong = document.createElement('strong'); strong.textContent = String(type + (num ? (' ' + num) : '')); head.appendChild(strong);
        if (date) {
          var sep = document.createTextNode(' • ');
          head.appendChild(sep);
          var span = document.createElement('span'); span.className = 'muted';
          try { span.textContent = new Date(date).toLocaleDateString(); } catch(e) { span.textContent = String(date); }
          head.appendChild(span);
        }
        if (b && b.bipartisan === true) {
          head.appendChild(document.createTextNode(' '));
          var bp = document.createElement('span'); bp.className = 'pill P'; bp.textContent = 'Bipartisan'; head.appendChild(bp);
        }
        if (latest && /became public law/i.test(latest)) {
          head.appendChild(document.createTextNode(' '));
          var bl = document.createElement('span'); bl.className = 'pill N'; bl.textContent = 'Became Law'; head.appendChild(bl);
        }
        row.appendChild(head);

        // Second line: title
        if (title) {
          var titleLine = document.createElement('div');
          titleLine.textContent = title;
          row.appendChild(titleLine);
        }

        // Third: latest action
        if (latest) {
          var meta = document.createElement('div');
          meta.className = 'muted';
          meta.textContent = 'Latest action: ' + latest;
          row.appendChild(meta);
        }

        // Fourth: Policy Area (neutral pill)
        if (policyArea) {
          var subj = document.createElement('div');
          var pill = document.createElement('span');
          pill.className = 'pill N';
          pill.textContent = policyArea;
          subj.appendChild(pill);
          row.appendChild(subj);
        }

        billsWrap.appendChild(row);
      });

      // Toggle (placed after list)
      var existingCtr = document.getElementById('sponsored-bills-ctr');
      if (existingCtr) existingCtr.remove();
      var listForToggle = activePolicy ? billsAll.filter(function(b){ return String(b && b.policy_area || '') === activePolicy; }) : billsAll;
      if (listForToggle.length > 3) {
        var ctr = document.createElement('div');
        ctr.id = 'sponsored-bills-ctr';
        ctr.style.paddingTop = '8px';
        var btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = expandedSB ? 'Show less' : 'Show more';
        btn.addEventListener('click', function(e){ e.preventDefault(); expandedSB = !expandedSB; renderSponsoredBills(); });
        ctr.appendChild(btn);
        if (billsWrap.parentNode) billsWrap.parentNode.insertBefore(ctr, billsWrap.nextSibling);
      }

      if (list.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = activePolicy ? ('No sponsored bills in “' + activePolicy + '”.') : 'No sponsored bills available.';
        billsWrap.appendChild(empty);
      }
      // Append data source footer to Signature Work card (once)
      try {
        var sigCard = billsWrap && billsWrap.closest ? billsWrap.closest('.card') : null;
        if (sigCard && !sigCard.querySelector('.data-note-sig')) {
          var f = document.createElement('div');
          f.className = 'muted data-note-sig';
          f.style.marginTop = '10px';
          f.style.textAlign = 'left';
          f.textContent = 'Data from Congress.gov • Updated Monthly';
          sigCard.appendChild(f);
        }
      } catch(e) { /* ignore */ }
    
    }

    // initial paint
    renderSponsoredBills();
  } catch(e){ /* non-fatal */ }
})();
/* KEY VOTES (existing) — left as-is */
      (function(){
        try {
          var cards = document.querySelectorAll('.card');
          var vr = null;
          for (var i=0;i<cards.length;i++){
            var h = cards[i].querySelector('.section-title');
            if (cards[i].closest && cards[i].closest('#advCards')) { continue; }
            if (h && (h.textContent||'').trim() === 'Voting Record'){ vr = cards[i]; break; }
          }
          if (!vr) return;
          var headers = vr.querySelectorAll('.section-title');
          var kvHeader = null;
          for (var j=0;j<headers.length;j++){ var t=(headers[j].textContent||'').trim(); if (t === 'Recent Major Votes'){ kvHeader = headers[j]; break; } }
          if (!kvHeader) return;
          // --- Inject tabs: Major / Maverick / Missed (native tabs, full-width, blue active) ---
          (function(){
            if (!kvHeader.querySelector('.mv-tabs-wrap')){
              var wrap = document.createElement('div'); wrap.className = 'mv-tabs-wrap';
              var tabs = document.createElement('div'); tabs.className = 'mv-tabs'; wrap.appendChild(tabs);
              function mk(label){ var b=document.createElement('button'); b.type='button'; b.className='btn tab'; b.textContent=label; return b; }
              var tMajor = mk('Major Votes');
              var tMav   = mk('Maverick Votes');
              var tMiss  = mk('Missed Votes');
              tMajor.className = 'btn tab active';
              tabs.appendChild(tMajor); tabs.appendChild(tMav); tabs.appendChild(tMiss);
              kvHeader.textContent=''; kvHeader.appendChild(wrap);

              // Scoped style: spacing, 3-col grid, and blue active
              if (!document.getElementById('mv-tabs-style')){
                var st=document.createElement('style'); st.id='mv-tabs-style';
                st.textContent=[
                  '.section-title .mv-tabs-wrap{ width:100%; margin:10px 0 12px 0; }',
                  '.section-title .mv-tabs{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; width:100%; }',
                  '.section-title .mv-tabs .btn.tab{ width:100%; }',
                  '.section-title .mv-tabs .btn.tab.active{ background:var(--primary, #0B5FFF); color:#fff; border-color:var(--primary, #0B5FFF); }'
                ].join('\n');
                document.head.appendChild(st);
              }

              function setActive(btn){ [tMajor,tMav,tMiss].forEach(function(b){ b.className='btn tab'; }); btn.className='btn tab active'; }

              function buildItems(list, root, type){
  // Build list rows to match Key/Major votes layout, with empty state.
  var frag = document.createDocumentFragment();
  var t = type || (kvHeader.__mvTabs && kvHeader.__mvTabs.current) || 'major';
  var label = (t==='maverick') ? 'maverick' : (t==='missed' ? 'missed' : 'major');
  if (!Array.isArray(list) || !list.length){
    var empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.padding = '8px 0';
    empty.textContent = 'No ' + label + ' votes available.';
    root.innerHTML = '';
    root.appendChild(empty);
    return frag;
  }
  var kv = list.slice();
  var expanded = !!root.__expanded;
  var src = expanded ? kv : kv.slice(0, Math.min(3, kv.length));
  root.innerHTML = '';
  src.forEach(function(v){
    var row = document.createElement('div'); row.className = 'stack';
    row.style.borderTop = '1px solid var(--border)'; row.style.paddingTop = '8px';
    var q = (v && (v.title || v.question || (v.bill && v.bill.title))) || '';
    var date = (v && (v.date || v.voted_at || v.roll_date)) || '';
    var head = document.createElement('div');
    var strong = document.createElement('strong'); strong.textContent = q; head.appendChild(strong);
    if (date){
      head.appendChild(document.createTextNode(' • '));
      var span = document.createElement('span'); span.className = 'muted';
      try { span.textContent = new Date(date).toLocaleDateString(); } catch(e) { span.textContent = String(date); }
      head.appendChild(span);
    }
    row.appendChild(head);
    var desc = (v && (v.vote_desc || v.dtl_desc || v.vote_question)) || '';
    if (desc){
      var dline = document.createElement('div'); dline.className = 'muted'; dline.textContent = String(desc);
      row.appendChild(dline);
    }
    var how = (v && (v.member_position || v.position || v.vote || v.member_vote || v.choice)) || '';
    var meta = document.createElement('div'); meta.className = 'muted'; meta.textContent = (how ? ('Position: ' + how) : '');
    row.appendChild(meta);
    root.appendChild(row);
  });
  if (list.length > 3){
    var ctr = document.createElement('div'); ctr.style.paddingTop = '8px';
    var btn = document.createElement('button'); btn.className = 'btn';
    btn.textContent = root.__expanded ? 'Show less' : 'Show more';
    btn.addEventListener('click', function(e){
      e.preventDefault();
      root.__expanded = !root.__expanded;
      var T = kvHeader.__mvTabs;
      if (T && typeof T.render === 'function'){ T.render(T.current, {keep:true}); }
    });
    ctr.appendChild(btn); root.appendChild(ctr);
  }
  return frag;
}

              
              var currentTab = 'major';
              kvHeader.__mvTabs = {setActive:setActive, tMajor:tMajor, tMav:tMav, tMiss:tMiss, buildItems:buildItems, get current(){return currentTab;}, set current(v){currentTab=v;}};
            }
          })();


          var root = kvHeader.nextElementSibling;
          var needNew = !(root && root.classList && root.classList.contains('stack') && root.id === 'recentMajorVotes');
          if (needNew){
            root = document.createElement('div');
            root.className = 'stack';
            root.id = 'recentMajorVotes';
            kvHeader.insertAdjacentElement('afterend', root);
          } else {
            root.innerHTML = '';
          }

          // Tab behaviors
          (function(){
            var T = kvHeader.__mvTabs; if (!T) return;
            var tabsNode = kvHeader.querySelector('.mv-tabs');
            if (tabsNode && !tabsNode.__wired){
              function getData(){
                var d=(typeof results!=='undefined' && results && results[0] && results[0].data) ? results[0].data : (window.__memberData||window.memberData)||{};
                return d;
              }
              function listFor(type){
                var d=getData();
                if(type==='maverick') return d.maverick_votes || d.maverickVotes || [];
                if(type==='missed')   return d.missed_votes || d.missedVotes || [];
                return d.key_votes || d.keyVotes || d.recent_major_votes || [];
              }
              function render(type, opts){
                var root = kvHeader.nextElementSibling;
                if (!root) return;
                if (type==='major'){
                  var listMajor = listFor('major');
                  T.setActive(T.tMajor); T.current='major';
                  if(!(opts && opts.keep)) root.__expanded=false;
                  if (!listMajor || !listMajor.length){
                    root.innerHTML=''; T.buildItems(listMajor || [], root, 'major'); return;
                  }
                  try { renderKeyVotes(); return; } catch(e){ /* fallthrough */ }
                }
                T.setActive(type==='maverick'?T.tMav:T.tMiss); T.current=type;
                if(!(opts && opts.keep)) root.__expanded=false;
                root.innerHTML = '';
                T.buildItems(listFor(type), root, type);
              }
              T.render = render;
              T.tMajor.addEventListener('click', function(){ render('major'); });
              T.tMav.addEventListener('click', function(){ render('maverick'); });
              T.tMiss.addEventListener('click', function(){ render('missed'); });
              tabsNode.__wired = true;
            }
          })();

          var data = (typeof results !== 'undefined' && results[0]) ? results[0] : (typeof window !== 'undefined' && window.__memberData) ? window.__memberData : {};
          var kv = data && (data.key_votes || data.keyVotes || data.votes_key || data.highlight_votes) || [];
          if (!Array.isArray(kv) || kv.length === 0){
            var nd=document.createElement('div'); nd.className='muted'; nd.textContent='No recent major votes available.'; root.appendChild(nd); return;
          }

          var expanded = false;
function renderKeyVotes(){
  root.innerHTML = '';
  var list = expanded ? kv : kv.slice(0, Math.min(3, kv.length));
  list.forEach(function(v){
var row = document.createElement('div');
            row.className = 'stack';
            row.style.borderTop = '1px solid var(--border)';
            row.style.paddingTop = '8px';

            var q = v && (v.question || v.title || v.bill || v.id) || 'Vote';
            var how = v && (v.vote || v.member_vote || v.member_position || v.position || v.choice) || '';
            var mv = (v && v.maverick_vote === true) ? ' (maverick)' : '';
            var date = v && (v.date || v.voted_at || v.roll_date) || '';

            var head = document.createElement('div');
            var strong = document.createElement('strong'); strong.textContent = String(q); head.appendChild(strong);
            if (date) {
              var sep = document.createTextNode(' • ');
              head.appendChild(sep);
              var span = document.createElement('span'); span.className = 'muted';
              try { span.textContent = new Date(date).toLocaleDateString(); } catch(e) { span.textContent = String(date); }
              head.appendChild(span);
            }
            row.appendChild(head);

            var desc = v && (v.vote_desc || v.dtl_desc) || '';
            if (desc) {
              var dline = document.createElement('div');
              dline.className = 'muted';
              dline.textContent = String(desc);
              row.appendChild(dline);
            }

            var meta = document.createElement('div');
            meta.className = 'muted';
            meta.textContent = (how ? ('Position: ' + how + mv) : '');
            row.appendChild(meta);
    root.appendChild(row);
  });
  if (kv.length > 3){
    var ctr = document.createElement('div');
    ctr.style.paddingTop = '8px';
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = expanded ? 'Show less' : 'Show more';
    btn.addEventListener('click', function(e){ e.preventDefault(); expanded = !expanded; renderKeyVotes(); });
    ctr.appendChild(btn);
    root.appendChild(ctr);
  }
}
renderKeyVotes();
  // Append data source footer to Voting Record card
  try {
    if (vr && !vr.querySelector('.data-note-votes')) {
      var foot = document.createElement('div');
      foot.className = 'muted data-note-votes';
      foot.style.marginTop = '10px';
      foot.style.textAlign = 'left';
      foot.textContent = 'Data from Voteview.com • Updated Weekly';
      vr.appendChild(foot);
    }
  } catch(e) { /* ignore */ }
} catch(e){ /* swallow errors */ }
      })();

    }).catch(function(e){ if(e) setErr('Runtime error: '+(e.message||e)); });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', main);} else {main();}
})();

;(() => {
  function getData(){
    var d = (typeof results!=='undefined' && results && results[0] && results[0].data)
      ? results[0].data : (window.__memberData || window.memberData) || {};
    return d || {};
  }
  function readPhone(d){
    if (d && d.contact && d.contact.phone) return String(d.contact.phone);
    if (d && d.identity && d.identity.contact && d.identity.contact.phone) return String(d.identity.contact.phone);
    return '';
  }
  function upsert(){
    var wrap = document.getElementById('district-contact-btns');
    if (!wrap) return false; // buttons not ready yet
    var phone = readPhone(getData());
    if (!phone) return false; // data not ready yet
    var el = document.getElementById('office-phone-line');
    if (!el){
      el = document.createElement('div');
      el.id = 'office-phone-line';
      el.style.marginTop = '8px';
      wrap.appendChild(el);
    }
    el.innerHTML = '';
    var b = document.createElement('strong'); b.textContent = 'DC Office Phone:';
    el.appendChild(b);
    el.appendChild(document.createTextNode(' ' + phone));
    el.style.display = '';
    return true;
  }
  function start(){
    if (upsert()) return;
    var tries = 0;
    (function tick(){
      if (upsert()) return;
      if (++tries > 120) return; // ~12s max
      setTimeout(tick, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

;(() => {
  function getData(){
    var d = (typeof results!=='undefined' && results && results[0] && results[0].data)
      ? results[0].data : (window.__memberData || window.memberData) || {};
    return d || {};
  }
  function readPhone(d){
    if (d && d.contact && d.contact.phone) return String(d.contact.phone);
    if (d && d.identity && d.identity.contact && d.identity.contact.phone) return String(d.identity.contact.phone);
    return '';
  }
  function place(){
    var wrap = document.getElementById('district-contact-btns');
    if (!wrap) return false; // buttons not ready yet
    var phone = readPhone(getData());
    if (!phone) return false; // data not ready yet

    var parent = wrap.parentNode;
    if (!parent) return false;

    var el = document.getElementById('office-phone-line');
    if (!el){
      el = document.createElement('div');
      el.id = 'office-phone-line';
      el.style.marginTop = '8px';     // small space below buttons
      el.style.display = 'block';     // ensure it's on its own line
    }

    // Ensure the phone line is the *immediate next sibling* after the buttons wrapper
    if (el.parentNode !== parent || el.previousElementSibling !== wrap){
      try { parent.insertBefore(el, wrap.nextSibling); } catch (e) { parent.appendChild(el); }
    }

    // Populate content
    el.innerHTML = '';
    var b = document.createElement('strong'); b.textContent = 'DC Office Phone:';
    el.appendChild(b);
    el.appendChild(document.createTextNode(' ' + phone));

    return true;
  }
  function start(){
    if (place()) return;
    var tries = 0;
    (function tick(){
      if (place()) return;
      if (++tries > 120) return; // ~12s max
      setTimeout(tick, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
