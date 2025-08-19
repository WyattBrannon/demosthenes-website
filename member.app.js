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
              if (noteEl) noteEl.textContent = state + '-' + (district==='00'?'AL':district) + ' (118th CD)';
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
              { label: 'Small-dollar individual donations', value: num(totalsObj['individual_itemized_contributions']) },
              { label: 'Large-dollar individual donations', value: num(totalsObj['individual_unitemized_contributions']) },
              { label: 'Committee donations', value: num(totalsObj['other_political_committee_contributions']) + num(totalsObj['political_party_committee_contributions']) },
              { label: 'Self-funded donations', value: num(totalsObj['candidate_contribution']) }
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
              var C = 2*Math.PI*R, COLORS=['#0ea5e9','#f97316','#22c55e','#a855f7'], STROKE=22;

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

          // ----- Major Employer Donations (with toggle styled like Key Votes) -----
          var nextTitle2 = document.createElement('div'); nextTitle2.className = 'section-title'; nextTitle2.style.marginTop='12px'; nextTitle2.textContent='Major Employer Donations';
          financeContent.appendChild(nextTitle2);

          var orgs = (((fec||{}).top_contributors||{}).top_contributors||{}).orgs || [];
          if (Array.isArray(orgs) && orgs.length){
            orgs.sort(function(a,b){ return num((b&&b.total)) - num((a&&a.total)); });

            var listWrap2 = document.createElement('div');
            listWrap2.id = 'employer-list-wrap';

            var expanded2 = false;
            function renderOrgs(){
              listWrap2.innerHTML = '';
              var limit = expanded2 ? Math.min(10, orgs.length) : Math.min(3, orgs.length);
              var slice = orgs.slice(0, limit);
              slice.forEach(function(o){
                var name = (o && (o.employer || o.name)) || 'Unknown employer';
                var dollars = fmtMoney(num(o && o.total));
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
                listWrap2.appendChild(row);
              });

              ctr2.innerHTML = '';
              if (orgs.length > 3){
                var btn2 = document.createElement('button');
                btn2.className = 'btn';
                btn2.textContent = expanded2 ? 'Show less' : 'Show more';
                btn2.addEventListener('click', function(e){ e.preventDefault(); expanded2 = !expanded2; renderOrgs(); });
                ctr2.appendChild(btn2);
              }
            }

            var ctr2 = document.createElement('div');
            ctr2.style.paddingTop = '8px';

            renderOrgs();
            financeContent.appendChild(listWrap2);
            financeContent.appendChild(ctr2);
          } else {
            var none2 = document.createElement('div'); none2.className='muted'; none2.style.textAlign='left'; none2.textContent='No employer donations available.';
            financeContent.appendChild(none2);
          }

        } catch (e) {
          if (window && window.console) console.warn('Finance render error:', e);
        }
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

      /* KEY VOTES (existing) — left as-is */
      (function(){
        try {
          var cards = document.querySelectorAll('.card');
          var vr = null;
          for (var i=0;i<cards.length;i++){
            var h = cards[i].querySelector('.section-title');
            if (h && (h.textContent||'').trim() === 'Voting Record'){ vr = cards[i]; break; }
          }
          if (!vr) return;
          var headers = vr.querySelectorAll('.section-title');
          var kvHeader = null;
          for (var j=0;j<headers.length;j++){ if ((headers[j].textContent||'').trim() === 'Recent Major Votes'){ kvHeader = headers[j]; break; } }
          if (!kvHeader) return;

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
} catch(e){ /* swallow errors */ }
      })();

    }).catch(function(e){ if(e) setErr('Runtime error: '+(e.message||e)); });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', main);} else {main();}
})();
