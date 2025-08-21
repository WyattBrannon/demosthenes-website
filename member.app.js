// member_adv.app.js — Advanced Mode (header-only; mirrors Basic header, no voting dials)
(function(){
  "use strict";

  // Ensure we run after DOM is parsed
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
    else fn();
  }

  function byId(id){ return document.getElementById(id); }
  function partyLetter(s){ var t=(s||'').toUpperCase(); if(t.indexOf('D')===0||t==='100')return'D'; if(t.indexOf('R')===0||t==='200')return'R'; return'I'; }
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
  function seatText(chamber,state,district){
    var c=(chamber||'').toLowerCase();
    if(c==='senate' || c==='sen') return '('+(state||'??')+')';
    var dd=(district===''||district==='0'||district==null)?'AL':String(district);
    if(/^\d+$/.test(dd)){ dd = dd.length<2?('0'+dd):dd; }
    if(dd==='AL'||dd==='00'){ return '('+(state||'??')+')'; }
    return '('+(state||'??')+'-'+dd+')';
  }

  // YAML helpers (same approach as Basic)
  function findBlockForBioguide(yamlText, bioguide){
    var lines = yamlText.split(/\r?\n/);
    var blocks = []; var current = null;
    for (var i=0;i<lines.length;i++){
      var ln = lines[i];
      if (/^\-\s/.test(ln)){ if (current) blocks.push(current); current = [ln]; }
      else if (current) current.push(ln);
    }
    if (current) blocks.push(current);
    var found = null;
    for (var b=0; b<blocks.length; b++){
      var blk = blocks[b]; var matched = false;
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
  function latestTermTypeFromBlock(blockLines){
    if (!blockLines || !blockLines.length) return '';
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
      if (indent <= baseIndent && !/^\s*-/.test(L)) break;
      var t = /-\s*type\s*:\s*(\w+)/.exec(L);
      if (t) last = String(t[1]||'').toLowerCase();
    }
    if (last === 'sen') return 'senate';
    if (last === 'rep') return 'house';
    return '';
  }
  function extractNameFromBlock(blockLines){
    if (!blockLines || !blockLines.length) return '';
    var inName = false, nameIndent = 0;
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
          var mf = ln.match(/first\s*:\s*(.*)$/);  if (mf && mf[1] != null) { first = mf[1].trim().replace(/^['\"]|['\"]$/g, ''); }
          var mm = ln.match(/middle\s*:\s*(.*)$/); if (mm && mm[1] != null) { middle = mm[1].trim().replace(/^['\"]|['\"]$/g, ''); }
          var ml = ln.match(/last\s*:\s*(.*)$/);   if (ml && ml[1] != null) { last = ml[1].trim().replace(/^['\"]|['\"]$/g, ''); }
        }
      }
    }
    return official || [first, middle, last].filter(Boolean).join(' ');
  }

  function renderHeaderOnly(){
    // Hide all cards except header
    var cards = document.querySelectorAll('section.card');
    for (var i=0;i<cards.length;i++){
      if (cards[i].id !== 'headerCard') { cards[i].style.display = 'none'; }
    }

    var DEFAULT_DATA_BASE='https://WyattBrannon.github.io/demosthenes-data';
    var DB=(localStorage.getItem('DEMOS_DATA_BASE')||DEFAULT_DATA_BASE).replace(/\/+$/,'');
    var params=new URL(location.href).searchParams;
    var bioguide=params.get('bioguide')||'';
    var memberURL=DB+'/members/'+bioguide+'.json';
    var yamlURL=DB+'/legislators-current.yaml';

    var header=byId('headerCard');
    if(!bioguide){ if(header) header.textContent='Missing ?bioguide=...'; return; }
    if(header) header.textContent='Fetching member JSON & YAML...';

    Promise.all([
      fetch(memberURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+memberURL); return r.json(); }),
      fetch(yamlURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+yamlURL); return r.text(); })
    ]).then(function(results){
      var data = results[0] || {}, yamlText = results[1] || '';
      var id = data.identity || {};
      var block = findBlockForBioguide(yamlText, bioguide);
      var displayName = extractNameFromBlock(block) || (id.name || '(Name unavailable)');
      var party = id.party || '';
      var pLetter = partyLetter(party);

      // Clear
      header.innerHTML='';

      // Name + party pill (exact classes)
      var nameLine=document.createElement('div'); nameLine.className='name-line';
      var nameEl=document.createElement('span'); nameEl.className='name'; nameEl.textContent=displayName; nameEl.title=displayName;
      var pill=document.createElement('span'); pill.className='pill '+pLetter; pill.textContent=pLetter;
      nameLine.appendChild(nameEl); nameLine.appendChild(pill);

      // Portrait
      var img=new Image(); img.className='portrait'; img.alt=(displayName||'')+' portrait';
      img.crossOrigin='anonymous';
      img.src=DB+'/images/'+bioguide+'.jpg';
      img.onerror=function(){
        var fb=document.createElement('div'); fb.className='muted'; fb.textContent='Portrait unavailable';
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      };

      // Chamber via YAML, then state/district text
      var chamber = latestTermTypeFromBlock(block) || (id.chamber || '');
      var state=id.state||''; var district=id.district||null;
      var seat=document.createElement('div'); seat.className='muted';
      seat.textContent=(chamber==='senate'?'Senator':'Representative')+' '+seatText(chamber,state,district);

      // Tenure
      var tenure=document.createElement('div'); tenure.className='muted';
      tenure.textContent='Tenure in Congress: '+(id.tenure_years==null?'?':id.tenure_years)+' years';

      // Committees (exclude subcommittees)
      var commWrap=document.createElement('div'); commWrap.className='stack';
      var commTitle=document.createElement('div'); commTitle.className='section-title'; commTitle.textContent='Committees';
      commTitle.style.fontSize='1.10rem';
      var commList=document.createElement('ul'); commList.className='list';
      var committees=Array.isArray(id.committees)?id.committees:[];
      committees=committees.filter(function(c){return !isSubcommittee(c);});
      if(committees.length){
        committees.forEach(function(c){
          var li=document.createElement('li');
          var nm=String(c.name||'').replace(/\s*\(.*?\)\s*$/,'').trim();
          var role=(c.title||c.position||'').trim();
          li.textContent = nm + (role?(' — '+role):'');
          commList.appendChild(li);
        });
      } else {
        var li=document.createElement('li'); li.textContent='N/A'; commList.appendChild(li);
      }
      commWrap.appendChild(commTitle); commWrap.appendChild(commList);

      // Layout row (exact classes)
      var row=document.createElement('div'); row.className='row';
      var right=document.createElement('div'); right.className='stack';
      right.appendChild(nameLine); right.appendChild(seat); right.appendChild(tenure); right.appendChild(commWrap);
      row.appendChild(img); row.appendChild(right); header.appendChild(row);
    }).catch(function(err){
      if (header) header.textContent = 'Error loading member data.';
      if (window && window.console) console.error(err);
    });
  }

  ready(renderHeaderOnly);
})();
