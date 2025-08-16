// member.app.js — v2025-08-16-24c — YAML-first names, robust parsing
(function(){"use strict";
  function byId(id){return document.getElementById(id);}
  function setDbg(html){var d=byId('dbg'); if(d) d.innerHTML=html;}
  function setErr(html){var d=byId('dbg'); if(d) d.innerHTML='<span class="err">'+html+'</span>'; var h=byId('headerCard'); if(h&&/Loading|Fetching/.test(h.textContent)) h.textContent='Error — see message above.';}
  function pad2(n){n=String(n);return n.length<2?('0'+n):n;}
  function partyLetter(s){var t=(s||'').toUpperCase(); if(t.indexOf('D')===0||t==='100')return'D'; if(t.indexOf('R')===0||t==='200')return'R'; return'I';}
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
      + '<div class="label">'+label+'</div>';
    container.appendChild(wrap);
  }

  function findBlockForBioguide(yamlText, bioguide){
    var lines = yamlText.split(/\r?\n/);
    var blocks = [];
    var current = null;
    for (var i=0;i<lines.length;i++){ 
      var ln = lines[i];
      if (/^\-\s/.test(ln)){ // new item
        if (current) blocks.push(current);
        current = [ln];
      } else if (current) { 
        current.push(ln);
      }
    }
    if (current) blocks.push(current);
    for (var b=0; b<blocks.length; b++){ 
      var blk = blocks[b];
      for (var j=0;j<blk.length;j++){ 
        var l = blk[j].trim();
        if (l === 'bioguide: '+bioguide || l === "bioguide: '"+bioguide+"'" || l === 'bioguide: "'+bioguide+'"' ) {
          return blk;
        }
      }
    }
    return null;
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

    var header=byId('headerCard'); if(!bioguide){ if(header) header.textContent='Missing ?bioguide=…'; return; }
    if(header) header.textContent='Fetching member JSON & YAML…';

    Promise.all([
      fetch(memberURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+memberURL); return r.json(); }),
      fetch(yamlURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+yamlURL); return r.text(); })
    ]).then(function(results){
      var data = results[0] || {}, yamlText = results[1] || '';
      var id = data.identity || {};

      var block = findBlockForBioguide(yamlText, bioguide);
      var displayName = extractNameFromBlock(block) || '(Name unavailable)';

      header.innerHTML='';
      var party=id.party||'';

      var nameLine=document.createElement('div'); nameLine.className='name-line';
      var nameEl=document.createElement('span'); nameEl.className='name'; nameEl.textContent=displayName; nameEl.title=displayName;
      var pill=document.createElement('span'); pill.className='pill '+partyLetter(party); pill.textContent=partyLetter(party);
      nameLine.appendChild(nameEl); nameLine.appendChild(pill);

      var img=new Image(); img.className='portrait'; img.alt=(displayName||'Portrait'); img.src=DB+'/images/'+bioguide+'.jpg'; img.onerror=function(){img.style.display='none';};

      var chamber=(id.chamber&&(''+id.chamber).toLowerCase());
      if(!chamber){
        var d=id.district;
        var committees = Array.isArray(id.committees)? id.committees : [];
        var hasH = committees.some(function(c){ var code=String((c&& (c.code||c.id||c.committee||''))); return /^H/.test(code); });
        var hasS = committees.some(function(c){ var code=String((c&& (c.code||c.id||c.committee||''))); return /^S/.test(code); });
        if (d==='AL' || typeof d==='number' || (typeof d==='string' && d.length)) chamber='house';
        else if (hasH) chamber='house';
        else if (hasS) chamber='senate';
        else chamber='house';
      }
      var state=id.state||''; var district=id.district||null;
      var seat=document.createElement('div'); seat.className='muted'; seat.textContent=(chamber==='senate'?'Senator':'Representative')+' '+seatText(chamber,state,district);

      var tenure=document.createElement('div'); tenure.className='muted'; tenure.textContent='Tenure in Congress: '+(id.tenure_years==null?'?':id.tenure_years)+' years';

      var commWrap=document.createElement('div'); commWrap.className='stack';
      var commTitle=document.createElement('div'); commTitle.className='section-title'; commTitle.textContent='Committees';
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
        var pct = (typeof al.dim1_percentile_chamber === 'number') ? Math.round(al.dim1_percentile_chamber) : null;
        if (pct != null) {
          var firstDial = dials.querySelector('.dial');
          if (firstDial) {
            var sub = document.createElement('div');
            sub.className = 'muted';
            sub.style.fontSize = '0.9rem';
            sub.style.textAlign = 'center';
            sub.textContent = (dim1 < 0) ? ('To the left of ' + pct + '% of Congress') : ('To the right of ' + pct + '% of Congress');
            firstDial.appendChild(sub);
          }
        }
      })();

      var pu=(typeof al.party_unity_pct==='number')?(al.party_unity_pct*100):NaN;
      var puDisplay=(isNaN(pu)?'—':String(Math.round(pu))+'%');
      renderDial(dials, pu, puDisplay, 'Party Unity', '100 − (% maverick votes)', '#2563eb');

      var total=Number(al.total_votes||0); var missed=Number(al.missed_votes||0); var denom=total+missed;
      var reliability=denom?(100-(missed/denom)*100):NaN;
      var relDisplay=(isNaN(reliability)?'—':String(Math.round(reliability))+'%');
      renderDial(dials, reliability, relDisplay, 'Vote Reliability', '100 − (missed / (total + missed))', '#2563eb');

    }).catch(function(e){ if(e) setErr('Runtime error: '+(e.message||e)); });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', main);} else {main();}
})();        current.push(ln);
      }
    }
    if (current) blocks.push(current);
    for (var b=0; b<blocks.length; b++){ 
      var blk = blocks[b];
      for (var j=0;j<blk.length;j++){ 
        var l = blk[j].trim();
        if (l === 'bioguide: '+bioguide || l === "bioguide: '"+bioguide+"'" || l === 'bioguide: "'+bioguide+'"' ) {
          return blk;
        }
      }
    }
    return null;
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

    var header=byId('headerCard'); if(!bioguide){ if(header) header.textContent='Missing ?bioguide=…'; return; }
    if(header) header.textContent='Fetching member JSON & YAML…';

    Promise.all([
      fetch(memberURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+memberURL); return r.json(); }),
      fetch(yamlURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+yamlURL); return r.text(); })
    ]).then(function(results){
      var data = results[0] || {}, yamlText = results[1] || '';
      var id = data.identity || {};

      var block = findBlockForBioguide(yamlText, bioguide);
      var displayName = extractNameFromBlock(block) || '(Name unavailable)';

      header.innerHTML='';
      var party=id.party||'';

      var nameLine=document.createElement('div'); nameLine.className='name-line';
      var nameEl=document.createElement('span'); nameEl.className='name'; nameEl.textContent=displayName; nameEl.title=displayName;
      var pill=document.createElement('span'); pill.className='pill '+partyLetter(party); pill.textContent=partyLetter(party);
      nameLine.appendChild(nameEl); nameLine.appendChild(pill);

      var img=new Image(); img.className='portrait'; img.alt=(displayName||'Portrait'); img.src=DB+'/images/'+bioguide+'.jpg'; img.onerror=function(){img.style.display='none';};

      var chamber=(id.chamber&&(''+id.chamber).toLowerCase());
      if(!chamber){
        var d=id.district;
        var committees = Array.isArray(id.committees)? id.committees : [];
        var hasH = committees.some(function(c){ var code=String((c&& (c.code||c.id||c.committee||''))); return /^H/.test(code); });
        var hasS = committees.some(function(c){ var code=String((c&& (c.code||c.id||c.committee||''))); return /^S/.test(code); });
        if (d==='AL' || typeof d==='number' || (typeof d==='string' && d.length)) chamber='house';
        else if (hasH) chamber='house';
        else if (hasS) chamber='senate';
        else chamber='house';
      }
      var state=id.state||''; var district=id.district||null;
      var seat=document.createElement('div'); seat.className='muted'; seat.textContent=(chamber==='senate'?'Senator':'Representative')+' '+seatText(chamber,state,district);

      var tenure=document.createElement('div'); tenure.className='muted'; tenure.textContent='Tenure in Congress: '+(id.tenure_years==null?'?':id.tenure_years)+' years';

      var commWrap=document.createElement('div'); commWrap.className='stack';
      var commTitle=document.createElement('div'); commTitle.className='section-title'; commTitle.textContent='Committees';
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
        var pct = (typeof al.dim1_percentile_chamber === 'number') ? Math.round(al.dim1_percentile_chamber) : null;
        if (pct != null) {
          var firstDial = dials.querySelector('.dial');
          if (firstDial) {
            var sub = document.createElement('div');
            sub.className = 'muted';
            sub.style.fontSize = '0.9rem';
            sub.style.textAlign = 'center';
            sub.textContent = (dim1 < 0) ? ('To the left of ' + pct + '% of Congress') : ('To the right of ' + pct + '% of Congress');
            firstDial.appendChild(sub);
          }
        }
      })();

      var pu=(typeof al.party_unity_pct==='number')?(al.party_unity_pct*100):NaN;
      var puDisplay=(isNaN(pu)?'—':String(Math.round(pu))+'%');
      renderDial(dials, pu, puDisplay, 'Party Unity', '100 − (% maverick votes)', '#2563eb');

      var total=Number(al.total_votes||0); var missed=Number(al.missed_votes||0); var denom=total+missed;
      var reliability=denom?(100-(missed/denom)*100):NaN;
      var relDisplay=(isNaN(reliability)?'—':String(Math.round(reliability))+'%');
      renderDial(dials, reliability, relDisplay, 'Vote Reliability', '100 − (missed / (total + missed))', '#2563eb');

    }).catch(function(e){ if(e) setErr('Runtime error: '+(e.message||e)); });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', main);} else {main();}
})();      var mi=(snippet.match(/middle:\s*['"]?([^"\n]+)['"]?/)||[])[1];
      var l=(snippet.match(/last:\s*['"]?([^"\n]+)['"]?/)||[])[1];
      var parts=[]; if(f)parts.push(f.trim()); if(mi)parts.push(mi.trim()); if(l)parts.push(l.trim());
      return parts.length?parts.join(' '):null;
    }).catch(function(){return null;});
  }

  function isSubcommittee(c){ 
    if(!c) return false;
    var code=String((c.code||c.id||c.committee||''));
    var name=String(c.name||'');
    if(c.subcommittee===true || c.is_subcommittee===true || c.parent) return true;
    if(/subcommittee/i.test(name)) return true;
    if(/[A-Za-z\-]*\d+$/.test(code)) return true; // ID ends with digits (e.g., HSAG03, HSAG-03, S123)
    if(/\d+\s*$/.test(name)) return true;         // name ends with digits
    return false;
  }

  function main(){
    var DEFAULT_DATA_BASE='https://WyattBrannon.github.io/demosthenes-data';
    var DB=(localStorage.getItem('DEMOS_DATA_BASE')||DEFAULT_DATA_BASE).replace(/\/+$/,'');
    var params=new URL(location.href).searchParams;
    var bioguide=params.get('bioguide')||'';
    var memberURL=DB+'/members/'+bioguide+'.json';
    setDbg('<code>DATA_BASE</code> = '+DB+' · <code>bioguide</code> = '+(bioguide||'(missing)')+' · <code>URL</code> = '+(bioguide?memberURL:'(n/a)'));
    var header=byId('headerCard'); if(!bioguide){ if(header) header.textContent='Missing ?bioguide=…'; return; }
    if(header) header.textContent='Fetching member JSON…';

    fetch(memberURL,{cache:'no-store'}).then(function(r){ if(!r.ok){ if(header) header.textContent='Failed to load member JSON.'; setErr('HTTP '+r.status+' for <code>'+memberURL+'</code>'); return Promise.reject(); } return r.json(); }).then(function(data){
      if(!data || !data.identity || !data.alignment){ if(header) header.textContent='Invalid member JSON.'; setErr('JSON missing identity/alignment'); return; }

      var id=data.identity||{};
      var displayName=(data.name&&data.name.official_full)?data.name.official_full:(id.official_full||id.display_name||((id.first&&id.last)?(id.first+' '+id.last):null)||'');
      header.innerHTML='';
      var party=id.party||'';

      var nameRow=document.createElement('div'); nameRow.className='row'; nameRow.style.alignItems='center';
      var nameEl=document.createElement('div'); nameEl.className='name'; nameEl.textContent=displayName||'(Name unavailable)';
      var pill=document.createElement('span'); pill.className='pill '+partyLetter(party); pill.textContent=partyLetter(party);
      nameRow.appendChild(nameEl); nameRow.appendChild(pill);

      var img=new Image(); img.className='portrait'; img.alt=(displayName||'Portrait'); img.src=DB+'/images/'+data.bioguide+'.jpg'; img.onerror=function(){img.style.display='none';};

      var chamber=(id.chamber&&(''+id.chamber).toLowerCase()); if(!chamber){var d=id.district; if(typeof d==='string'&&d.length) chamber='house'; else if(typeof d==='number') chamber='house'; else if(d==='AL') chamber='house'; else chamber='senate';}
      var state=id.state||''; var district=id.district||null;
      var seat=document.createElement('div'); seat.className='muted'; seat.textContent=(chamber==='senate'?'Senator':'Representative')+' '+seatText(chamber,state,district);

      var tenure=document.createElement('div'); tenure.className='muted'; tenure.textContent='Tenure in Congress: '+(id.tenure_years==null?'?':id.tenure_years)+' years';

      var commWrap=document.createElement('div'); commWrap.className='stack';
      var commTitle=document.createElement('div'); commTitle.className='section-title'; commTitle.textContent='Committees';
      var commList=document.createElement('ul'); commList.className='list';
      var committees=Array.isArray(id.committees)?id.committees:[];
      committees=committees.filter(function(c){return !isSubcommittee(c);});
      if(committees.length){ committees.forEach(function(c){ var li=document.createElement('li'); var role=(c.role&&c.role!=='Member')?(' — '+c.role):''; li.textContent=(c.name||'Unknown')+role; commList.appendChild(li); }); } else { var li=document.createElement('li'); li.textContent='N/A'; commList.appendChild(li); }
      commWrap.appendChild(commTitle); commWrap.appendChild(commList);

      var row=document.createElement('div'); row.className='row';
      var right=document.createElement('div'); right.className='stack'; right.appendChild(nameRow); right.appendChild(seat); right.appendChild(tenure); right.appendChild(commWrap);
      row.appendChild(img); row.appendChild(right); header.appendChild(row);

      // Dials
      var dials=byId('dials'); var al=data.alignment||{};

      // Ideology: fill = |dim1| (0..1), RED if right of center (>0), BLUE if left (<0); center shows %
      var dim1=(typeof al.dw_nominate_dim1==='number')?al.dw_nominate_dim1:NaN;
      var mag=isNaN(dim1)?NaN:Math.max(0,Math.min(1,Math.abs(dim1)));
      var colorIdeo=isNaN(dim1)?'#2563eb':(dim1>0?'#dc2626':'#2563eb'); // red for >0, blue for <0
      var magDisplay=(isNaN(mag)?'N/A':String(Math.round(mag*100))+'%');
      renderDial(dials, isNaN(mag)?NaN:(mag*100), magDisplay, 'Ideology', 'Left (−) to Right (+)', colorIdeo);

      // Party Unity: 0–100; center shows number with %
      var pu=(typeof al.party_unity_pct==='number')?(al.party_unity_pct*100):NaN;
      var puDisplay=(isNaN(pu)?'—':String(Math.round(pu))+'%');
      renderDial(dials, pu, puDisplay, 'Party Unity', '100 − (% maverick votes)', '#2563eb');

      // Vote Reliability: 0–100; center shows number with %
      var total=Number(al.total_votes||0); var missed=Number(al.missed_votes||0); var denom=total+missed;
      var reliability=denom?(100-(missed/denom)*100):NaN;
      var relDisplay=(isNaN(reliability)?'—':String(Math.round(reliability))+'%');
      renderDial(dials, reliability, relDisplay, 'Vote Reliability', '100 − (missed / (total + missed))', '#2563eb');

      if(!displayName){ fetchNameFromYAML(DB, data.bioguide).then(function(nm){ if(nm) nameEl.textContent=nm; }); }
    }).catch(function(e){ if(e) setErr('Runtime error: '+(e.message||e)); });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', main);} else {main();}
})();
