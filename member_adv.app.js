// member_adv.app.js — Advanced Mode: header + four new analysis cards
(function(){
  "use strict";

  // --- small utilities ---
  function ready(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn, {once:true}); } else { fn(); } }
  function byId(id){ return document.getElementById(id); }
  function partyLetter(s){ var t=(s||'').toUpperCase(); if(t.indexOf('D')===0||t==='100')return 'D'; if(t.indexOf('R')===0||t==='200')return 'R'; return 'I'; }
  function isSubcommittee(c){
    if(!c) return false;
    var code=String((c.code||c.id||c.committee||''));
    var name=String(c.name||'');
    if(c.subcommittee===true||c.is_subcommittee===true||c.parent) return true;
    if(/subcommittee/i.test(name)) return true;
    if(/[A-Za-z\-]*\d+$/.test(code)) return true;
    if(/\d+\s*$/.test(name)) return true;
    return false;
  }
  function latestTermTypeFromBlock(block){
    if(!block||!block.length) return '';
    var start=-1, base=0;
    for(var i=0;i<block.length;i++){
      var m=/^(\s*)terms\s*:\s*$/.exec(block[i]);
      if(m){ start=i+1; base=m[1].length; break; }
    }
    if(start===-1) return '';
    var last='';
    for(var j=start;j<block.length;j++){
      var L=block[j]||'';
      var indent=(L.match(/^\s*/)||[''])[0].length;
      if(indent<=base && !/^\s*-/.test(L)) break;
      var t=/-\s*type\s*:\s*(\w+)/.exec(L);
      if(t) last=String(t[1]||'').toLowerCase();
    }
    if(last==='sen') return 'senate';
    if(last==='rep') return 'house';
    return '';
  }
  function findBlockForBioguide(yamlText, bioguide){
    var lines=yamlText.split(/\r?\n/);
    var blocks=[], current=null;
    for(var i=0;i<lines.length;i++){
      var ln=lines[i];
      if(/^\-\s/.test(ln)){ if(current) blocks.push(current); current=[ln]; }
      else if(current) current.push(ln);
    }
    if(current) blocks.push(current);
    var found=null;
    for(var b=0;b<blocks.length;b++){
      var blk=blocks[b], matched=false;
      for(var j=0;j<blk.length;j++){
        var l=(blk[j]||'').trim();
        if(l==='bioguide: '+bioguide || l==="bioguide: '"+bioguide+"'" || l==='bioguide: "'+bioguide+'"'){ matched=true; break; }
      }
      if(matched){ found=blk; break; }
    }
    return found;
  }
  function extractNameFromBlock(block){
    if(!block||!block.length) return '';
    var inName=false, nameIndent=0;
    var first=null, middle=null, last=null, official=null;
    for(var i=0;i<block.length;i++){
      var ln=block[i];
      var mName=ln.match(/^(\s*)name\s*:\s*$/);
      if(mName){ inName=true; nameIndent=mName[1].length; continue; }
      if(inName){
        var mIndent=ln.match(/^(\s*)/); var indent=mIndent?mIndent[1].length:0;
        if(indent<=nameIndent){ inName=false; }
        else {
          var mOff=ln.match(/official_full\s*:\s*(.*)$/); if(mOff&&mOff[1]!=null){ official=mOff[1].trim().replace(/^['"]|['"]$/g,''); }
          var mf=ln.match(/first\s*:\s*(.*)$/); if(mf&&mf[1]!=null){ first=mf[1].trim().replace(/^['"]|['"]$/g,''); }
          var mm=ln.match(/middle\s*:\s*(.*)$/); if(mm&&mm[1]!=null){ middle=mm[1].trim().replace(/^['"]|['"]$/g,''); }
          var ml=ln.match(/last\s*:\s*(.*)$/); if(ml&&ml[1]!=null){ last=ml[1].trim().replace(/^['"]|['"]$/g,''); }
        }
      }
    }
    return official || [first,middle,last].filter(Boolean).join(' ');
  }
  function seatText(chamber,state,district){
    var c=(chamber||'').toLowerCase();
    if(c==='senate'||c==='sen') return '('+(state||'??')+')';
    var dd=(district===''||district==='0'||district==null)?'AL':String(district);
    if(/^\d+$/.test(dd)){ dd = dd.length<2?('0'+dd):dd; }
    if(dd==='AL'||dd==='00'){ return '('+(state||'??')+')'; }
    return '('+(state||'??')+'-'+dd+')';
  }

  function ensureAdvancedCards(){
    var container = document.querySelector('.container.stack') || document.querySelector('.container');
    if(!container) return;
    var header = byId('headerCard');
    if(!header) return;
    var adv = byId('advCards');
    if(!adv){
      adv = document.createElement('section');
      adv.id = 'advCards';
      adv.className = 'stack';
      adv.style.display = 'none';
      adv.innerHTML = ''
        + '<section id="adv-card-voting" class="card">'
        + '  <div class="section-title">Voting Record</div>'
        + '  <div class="muted">Advanced voting analysis will appear here.</div>'
        + '</section>'
        + '<section id="adv-card-sigwork" class="card">'
        + '  <div class="section-title">Signature Work</div>'
        + '  <div class="muted">Advanced signature work analysis will appear here.</div>'
        + '</section>'
        + '<section id="adv-card-finance" class="card">'
        + '  <div class="section-title">Campaign Finance Overview</div>'
        + '  <div class="muted">Advanced campaign finance analysis will appear here.</div>'
        + '</section>'
        + '<section id="adv-card-district" class="card">'
        + '  <div class="section-title">District and Office Information</div>'
        + '  <div class="muted">Advanced district & office information will appear here.</div>'
        + '</section>';
      // Insert right after the header card
      header.insertAdjacentElement('afterend', adv);
    }
  }

  function showAdvancedAndHideBasic(){
    var adv = byId('advCards');
    if(adv) adv.style.display = '';
    // Hide only Basic cards (everything not header or inside advCards)
    var cards = document.querySelectorAll('.container > section.card, .container.stack > section.card');
    for (var i=0;i<cards.length;i++){
      var sec = cards[i];
      if (sec.id === 'headerCard') continue;
      if (sec.closest('#advCards')) { sec.style.display = ''; }
      else { sec.style.display = 'none'; }
    }
  }

  function renderHeaderOnly(){
    // Base URLs & params
    var DEFAULT_DATA_BASE = 'https://wyattbrannon.github.io/demosthenes-data';
    var DB = (localStorage.getItem('DEMOS_DATA_BASE') || DEFAULT_DATA_BASE).replace(/\/+$/,'');
    var params = new URL(location.href).searchParams;
    var bioguide = params.get('bioguide') || '';
    var memberURL = DB + '/members/' + bioguide + '.json';
    var yamlURL = DB + '/legislators-current.yaml';
    var header = byId('headerCard');
    if(!bioguide){ if(header) header.textContent='Missing ?bioguide=...'; return; }
    if(header) header.textContent='Fetching member JSON & YAML...';

    Promise.all([
      fetch(memberURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+memberURL); return r.json(); }),
      fetch(yamlURL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' for '+yamlURL); return r.text(); })
    ]).then(function(results){
      ensureAdvancedCards(); ensureVotingRecordInset();
      var data = results[0] || {}, yamlText = results[1] || '';
      var id = data.identity || {};
      var block = findBlockForBioguide(yamlText, bioguide);
      var displayName = extractNameFromBlock(block) || (id.name || '(Name unavailable)');
      var party = id.party || '';
      var pLetter = partyLetter(party);

      header.innerHTML='';

      var nameLine=document.createElement('div'); nameLine.className='name-line';
      var nameEl=document.createElement('span'); nameEl.className='name'; nameEl.textContent=displayName; nameEl.title=displayName;
      var pill=document.createElement('span'); pill.className='pill '+pLetter; pill.textContent=pLetter;
      nameLine.appendChild(nameEl); nameLine.appendChild(pill);

      var img=new Image(); img.className='portrait'; img.alt=(displayName||'')+' portrait';
      img.crossOrigin='anonymous';
      img.src=(DB+'/images/'+bioguide+'.jpg');
      img.onerror=function(){ var fb=document.createElement('div'); fb.className='muted'; fb.textContent='Portrait unavailable.'; if(img.parentNode) img.parentNode.replaceChild(fb, img); };

      var chamber = (function(){ var t=latestTermTypeFromBlock(block) || (id.chamber || ''); if(t==='sen') return 'senate'; if(t==='rep') return 'house'; return t; })();
      var state=id.state||''; var district=id.district||null;
      var seat=document.createElement('div'); seat.className='muted';
      seat.textContent=(chamber==='senate'?'Senator':'Representative')+' '+seatText(chamber,state,district);

      var tenure=document.createElement('div'); tenure.className='muted';
      tenure.textContent='Tenure in Congress: '+(id.tenure_years==null?'?':id.tenure_years)+' years';

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

      var row=document.createElement('div'); row.className='row';
      var right=document.createElement('div'); right.className='stack';
      right.appendChild(nameLine); right.appendChild(seat); right.appendChild(tenure); right.appendChild(commWrap);
      row.appendChild(img); row.appendChild(right);
      header.appendChild(row);
      try{ updateVotingInsetWithNominate(data); }catch(e){ console && console.warn && console.warn('Nominate inset failed:', e); }
    }).catch(function(err){
      var header=byId('headerCard');
      if(header) header.textContent='Error loading member data.';
      if(window && window.console) console.error(err);
    });
  }

  
function ensureVotingRecordInset(){
  var card = document.getElementById('adv-card-voting');
  if(!card) return;

  // CSS (desktop + mobile) — inject once
  if(!document.getElementById('adv-vr-style')){
    var st = document.createElement('style');
    st.id = 'adv-vr-style';
    st.textContent = [
      '.vr-row{ display:flex; align-items:flex-start; gap:16px; margin-top:8px; }',
      '.vr-inset{ width:180px; height:180px; border-radius:12px; flex:0 0 180px; border:1px solid rgba(0,0,0,0.08);',
      '  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.08); }',
      '.vr-copy{ flex:1; }'
    ].join('\n');
    document.head.appendChild(st);
  }
  if(!document.getElementById('adv-vr-style-mobile')){
    var mq = document.createElement('style');
    mq.id = 'adv-vr-style-mobile';
    mq.textContent = [
      '@media (max-width: 700px){',
      '  .vr-row{ flex-direction: column; align-items: center !important; }',
      '  .vr-inset{ margin-left:auto; margin-right:auto; }',
      '  .vr-copy{ width:100%; }',
      '}'
    ].join('\n');
    document.head.appendChild(mq);
  }

  // Only add once
  if(card.querySelector('.vr-row')) return;

  var row = document.createElement('div');
  row.className = 'vr-row';

  var inset = document.createElement('div');
  inset.className = 'vr-inset';
  inset.setAttribute('aria-hidden','true');
  // Inline styles ensure it shows even if CSS fails
  inset.style.width='180px';
  inset.style.height='180px';
  inset.style.borderRadius='12px';
  inset.style.flex='0 0 180px';
  inset.style.border='1px solid rgba(0,0,0,0.08)';
  inset.style.boxShadow='inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.08)';
  inset.style.position = 'relative';
  inset.style.background = 'radial-gradient(120% 120% at 0% 0%, rgba(255,0,0,0.95), rgba(255,0,0,0) 60%), ' +
                           'radial-gradient(120% 120% at 100% 0%, rgba(0,102,255,0.95), rgba(0,102,255,0) 60%), ' +
                           'radial-gradient(120% 120% at 0% 100%, rgba(0,160,80,0.95), rgba(0,160,80,0) 60%), ' +
                           'radial-gradient(120% 120% at 100% 100%, rgba(255,214,0,0.95), rgba(255,214,0,0) 60%)';

  var copy = document.createElement('div');
  copy.className = 'vr-copy';

  var line = document.createElement('div');
  line.className = 'vr-ideology';

  var label = document.createElement('span');
  label.className='vr-ideology-label';
  label.textContent='Ideology: ';
  label.style.fontWeight='700';

  var values = document.createElement('span');
  values.className='vr-ideology-values';
  values.textContent='(—, —)';

  line.appendChild(label);
  line.appendChild(values);

  // Match the section title font size
  try{
    var titleEl = card.querySelector('.section-title');
    if(titleEl){
      var fs = window.getComputedStyle(titleEl).fontSize;
      if(fs){ line.style.fontSize = fs; }
    }
  }catch(e){}

  copy.appendChild(line);

  var expl = document.createElement('div');
  expl.className = 'muted';
  expl.textContent = 'Ideology is determined by DW-NOMINATE scores. The first number represents the congressperson\'s economic vote score, which represents their voting record on economic votes, while the second number represents the congressperson\'s non-economic vote score. Both numbers range from -1 (most liberal) to +1 (most conservative).';
  copy.appendChild(expl);

  row.appendChild(inset);
  row.appendChild(copy);

  // Insert after the section title
  var title = card.querySelector('.section-title');
  if(title){ title.after(row); } else { card.appendChild(row); }

}



  
  function _readNum(n){ var x = (typeof n==='string')? parseFloat(n): (typeof n==='number'? n: NaN); return isFinite(x)? x: NaN; }

  function getNominateDims(data){
    if(!data) return null;
    function _n(x){ var v=(typeof x==='string')?parseFloat(x):((typeof x==='number')?x:NaN); return isFinite(v)?v:NaN; }

    // Preferred: alignment.dw_nominate_dim1/2
    var a = (data.alignment||{});
    var d1 = _n(a.dw_nominate_dim1), d2 = _n(a.dw_nominate_dim2);

    // Fallbacks
    if(!(isFinite(d1)&&isFinite(d2))){
      var vv = (data.voteview||{});
      if(!isFinite(d1)) d1 = _n(vv.dw_nominate_dim1);
      if(!isFinite(d2)) d2 = _n(vv.dw_nominate_dim2);
      if(!(isFinite(d1)&&isFinite(d2))){
        if(!isFinite(d1)) d1 = _n(vv.dim1);
        if(!isFinite(d2)) d2 = _n(vv.dim2);
      }
    }
    if(!(isFinite(d1)&&isFinite(d2))){
      var ivv = ((data.identity||{}).voteview||{});
      if(!isFinite(d1)) d1 = _n(ivv.dim1);
      if(!isFinite(d2)) d2 = _n(ivv.dim2);
    }
    if(!(isFinite(d1)&&isFinite(d2))){
      var md = ((data.metrics||{}).dw_nominate||{});
      if(!isFinite(d1)) d1 = _n(md.dim1);
      if(!isFinite(d2)) d2 = _n(md.dim2);
    }

    if(!(isFinite(d1)&&isFinite(d2))) return null;
    d1 = Math.max(-1, Math.min(1, d1));
    d2 = Math.max(-1, Math.min(1, d2));
    return {dim1:d1, dim2:d2};
  }

  function updateVotingInsetWithNominate(data){
    var card = document.getElementById('adv-card-voting');
    if(!card) return;
    // Remove any existing basic placeholder text in this card
    try{
      var _kids = Array.prototype.slice.call(card.children);
      for(var i=0;i<_kids.length;i++){
        var el=_kids[i];
        if(el && el.classList && el.classList.contains('muted')){ el.remove(); }
      }
    }catch(e){}

    var inset = card.querySelector('.vr-inset');
    if(!inset){ return; }
    inset.style.position = inset.style.position || 'relative';

    var dims = getNominateDims(data);
    if(!dims){ try{ if(console && console.warn){ console.warn('DW-NOMINATE dims not found for member JSON'); } }catch(e){} return; }

    var size = parseFloat(inset.style.width||'180');
    if (!(size>0)) size = 180;
    var dotSize = 12, half = dotSize/2;

    var x = ((dims.dim1 + 1) / 2) * size;  // -1 => left, +1 => right
    var y = ((1 - dims.dim2) / 2) * size;  // +1 => top, -1 => bottom  // +1 => bottom

    x = Math.max(half, Math.min(size - half, x));
    y = Math.max(half, Math.min(size - half, y));

    var valEl = card.querySelector('.vr-ideology-values');
    if(valEl){ try{ valEl.textContent = '(' + dims.dim1.toFixed(3) + ', ' + dims.dim2.toFixed(3) + ')'; }catch(e){} }

    var dot = inset.querySelector('.vr-dot');
    if(!dot){
      dot = document.createElement('div');
      dot.className = 'vr-dot';
      dot.style.position='absolute';
      dot.style.width = dot.style.height = dotSize + 'px';
      dot.style.background = '#000';
      dot.style.borderRadius = '2px';
      dot.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.8)';
      dot.style.border = '1px solid #000';
      dot.style.zIndex = '2';
      dot.style.pointerEvents = 'none';
      inset.appendChild(dot);
    }
    dot.style.left = (x - half) + 'px';
    dot.style.top  = (y - half) + 'px';
  }

  function init(){
    ensureAdvancedCards();
    showAdvancedAndHideBasic();
    renderHeaderOnly();
    ensureVotingRecordInset();
  }

  ready(init);
})();
