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
      try{ window.__memberData = data; _updateCurrentIdeologyLine(data);   updateVotingInsetWithNominate(data); }catch(e){ console && console.warn && console.warn('Nominate inset failed:', e); }
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
  label.textContent='Overall ideology: ';
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

// Current ideology line (smaller, not muted)
var currentLine = document.createElement('div');
currentLine.className = 'vr-ideology-current';
currentLine.style.fontSize = '0.9em';
  currentLine.classList.add('vr-historical-label');
  currentLine.style.fontSize = '';
  currentLine.style.marginTop = '4px';
currentLine.style.marginTop = '2px';
currentLine.textContent = 'Current ideology: (—, —)';
copy.appendChild(currentLine);


  var expl = document.createElement('div');

  var cbWrap = document.createElement('div');
  cbWrap.className = 'vr-ideology-toggle';
  var cbLabel = document.createElement('label');
  cbLabel.className = 'form-check';
  var cbInput = document.createElement('input');
  cbInput.type = 'checkbox';
  cbInput.id = 'show-historical-ideology';
  cbInput.name = 'show-historical-ideology';
  var cbText = document.createElement('span');
  cbText.textContent = 'Show historical ideology';
  cbLabel.appendChild(cbInput);
  cbLabel.appendChild(cbText);
  cbWrap.appendChild(cbLabel);
  
// Party median toggle (appears above historical checkbox)
var pmWrap = document.createElement('div');
pmWrap.className = 'vr-ideology-toggle';
var pmLabel = document.createElement('label');
pmLabel.className = 'form-check';
var pmInput = document.createElement('input');
pmInput.type = 'checkbox';
pmInput.id = 'show-party-median';
pmInput.name = 'show-party-median';
var pmText = document.createElement('span');
pmText.textContent = 'Show party median';
pmLabel.appendChild(pmInput);
pmLabel.appendChild(pmText);
pmWrap.appendChild(pmLabel);
copy.appendChild(pmWrap);

  copy.appendChild(cbWrap);

  expl.className = 'muted';
  expl.textContent = 'Ideology is determined by DW-NOMINATE scores. The first number represents the congressperson\'s economic vote score, which represents their voting record on economic votes, while the second number represents the congressperson\'s non-economic vote score. Both numbers range from -1 (most liberal) to +1 (most conservative).';
  copy.appendChild(expl);

  row.appendChild(inset);
  row.appendChild(copy);
  if (typeof _bindPartyMedianCheckbox === 'function') { _bindPartyMedianCheckbox(); }
  _bindHistoricalCheckbox();

// Wire checkbox toggle for historical ideology boxes
try{
  var cb = document.getElementById('show-historical-ideology');
  if(cb && !cb._histBound){
    cb._histBound = true;
    cb.addEventListener('change', function(){
  var inset = _getInset();
  var dot = _getDot();
  if(!inset) return;
  if(cb.checked){
    if(dot){ dot.style.display='none'; }
    var data = _getMemberData();
    if(data){ renderHistoricalNominate(inset, data); }
  }else{
    clearHistoricalNominate(inset);
    if(dot){ dot.style.display=''; }
  }
});
// Render immediately if it starts checked
(function(){
  if(cb.checked){
    var inset0 = _getInset(); var dot0 = _getDot();
    if(dot0){ dot0.style.display='none'; }
    var data0 = _getMemberData();
    if(inset0 && data0){ renderHistoricalNominate(inset0, data0); }
  } else {
    // just in case leftover nodes exist
    clearHistoricalNominate(_getInset());
  }
})();
}
}catch(e){}


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
    // Party median refresh + render-on-check
    try{
      _refreshPartyMedianCheckboxState();
      var cbPM = document.getElementById('show-party-median');
      if(cbPM && cbPM.checked){
        _renderPartyMedian(_getInset(), data);
      }else{
        _clearPartyMedian(_getInset());
      }
    }catch(e){}
    // R
    // Refresh party median checkbox state now that data is available
    try{ _refreshPartyMedianCheckboxState(); }catch(e){}
    // Respect party median toggle
    try{
      var cbPM = document.getElementById('show-party-median');
      var insetPM = _getInset();
      if(cbPM && insetPM){
        if(cbPM.checked){
          _renderPartyMedian(insetPM, data);
        }else{
          _clearPartyMedian(insetPM);
        }
      }
    }catch(e){}
    _updateCurrentIdeologyLine(data);

    // Respect checkbox state after dot move
    try{
      _bindHistoricalCheckbox();
      var cbNOW = document.getElementById('show-historical-ideology');
      var insetNOW = _getInset();
      var dotNOW = _getDot();
      if(cbNOW && insetNOW){
        if(cbNOW.checked){
          if(dotNOW){ dotNOW.style.display='none'; }
          _renderHistorical(insetNOW, data);
        }else{
          _clearHistorical(insetNOW);
          if(dotNOW){ dotNOW.style.display=''; }
        }
      }
    }catch(e){}

    try{
      var cbNOW = document.getElementById('show-historical-ideology');
      var dotNOW = _getDot();
      if(cbNOW){
        if(cbNOW.checked){
          if(dotNOW){ dotNOW.style.display='none'; }
          renderHistoricalNominate(inset, data);
        }else{
          if(dotNOW){ dotNOW.style.display=''; }
          clearHistoricalNominate(inset);
        }
      }
    }catch(e){}

// Respect historical toggle
try{
  var cb = document.getElementById('show-historical-ideology');
  if(cb){
    if(cb.checked){
      if(dot){ dot.style.display='none'; }
      renderHistoricalNominate(inset, data);
    }else{
      if(dot){ dot.style.display=''; }
      clearHistoricalNominate(inset);
    }
  }
}catch(e){}

    // Also render or clear historical dots based on checkbox state
    try{
      var cb = document.getElementById('show-historical-ideology');
      if(cb){
        if(cb.checked){ renderHistoricalNominate(inset, data); }
        else{ clearHistoricalNominate(inset); }
      }
    }catch(e){}
  }

  

// --- Historical ideology rendering ---
function _getInsetSize(inset){
  var w = 0;
  try{
    w = parseFloat(inset.style.width||'0');
    if(!(w>0)){
      w = parseFloat(getComputedStyle(inset).width||'0');
    }
  }catch(e){}
  if(!(w>0)) w = 180;
  return w;
}

function _mapDimsToXY(dim1, dim2, size, half){
  var x = ((dim1 + 1) / 2) * size;      // -1 => left, +1 => right
  var y = ((1 - dim2) / 2) * size;      // +1 => top, -1 => bottom
  x = Math.max(half, Math.min(size - half, x));
  y = Math.max(half, Math.min(size - half, y));
  return {x:x, y:y};
}

function clearHistoricalNominate(inset){
  try{
    var nodes = Array.prototype.slice.call(inset.querySelectorAll('.vr-hdot'));
    for(var i=0;i<nodes.length;i++){ nodes[i].remove(); }
  }catch(e){}
}

function renderHistoricalNominate(inset, member){
    try{ if(inset && (!inset.style.position || inset.style.position==='')) inset.style.position='relative'; }catch(e){}
  if(!inset || !member || !Array.isArray(member.dw_nominate) || member.dw_nominate.length===0) return;
  var size = _getInsetSize(inset);
  var dotSize = 10, half = dotSize/2;

  // Sort by congress ascending (oldest first)
  var arr = member.dw_nominate.slice().sort(function(a,b){ return (a.congress||0) - (b.congress||0); });
  var minC = arr[0].congress || 0;
  var maxC = arr[arr.length-1].congress || minC;
  var denom = (maxC - minC) || 1;

  // Remove any existing historical dots
  clearHistoricalNominate(inset);

  for(var i=0;i<arr.length;i++){
    var it = arr[i] || {};
    var d1 = typeof it.dim1==='number'? it.dim1 : parseFloat(it.dim1);
    var d2 = typeof it.dim2==='number'? it.dim2 : parseFloat(it.dim2);
    if(!isFinite(d1) || !isFinite(d2)) continue;
    // Clamp to [-1,1]
    if(d1 < -1) d1 = -1; if(d1>1) d1=1;
    if(d2 < -1) d2 = -1; if(d2>1) d2=1;

    var pos = _mapDimsToXY(d1, d2, size, half);

    // grayscale from near-white (oldest) to black (newest)
    var t = ( (it.congress||minC) - minC ) / denom;  // 0 -> oldest, 1 -> newest
    if(t<0) t=0; if(t>1) t=1;
    var g = Math.round(255 * (1 - t));  // 255 -> 0
    // keep slightly visible edge
    var bg = 'rgb(' + g + ',' + g + ',' + g + ')';

    var box = document.createElement('div');
    box.className = 'vr-hdot';
    box.style.position='absolute';
    box.style.width = box.style.height = dotSize + 'px';
      box.style.borderRadius = borderRadius;
    box.style.left = (pos.x - half) + 'px';
    box.style.top  = (pos.y - half) + 'px';
    box.style.background = bg;
    box.style.border = '1px solid rgba(255,255,255,0.8)';
    box.style.borderRadius = '2px';
    // Older boxes appended first; newer later so newer are on top naturally
    box.style.zIndex = String(1 + i);
    box.style.pointerEvents = 'none';
    inset.appendChild(box);
  }
}


// === Historical ideology robust helpers ===
function _getCard(){ return document.getElementById('adv-card-voting'); }
function _getInset(){ var c=document.getElementById('adv-card-voting'); return c? c.querySelector('.vr-inset') : document.querySelector('.vr-inset'); }
function _getDot(){ var i=_getInset(); return i? i.querySelector('.vr-dot') : null; }
  function _getMemberData(){ return (window && (window.__memberData||window.memberData)) || null; }

function _parseNum(v){
  var n = (typeof v==='number')? v : parseFloat(v);
  return (isFinite(n)? n : NaN);
}

function _insetSizePx(inset){
  var w = 0;
  if(!inset) return 0;
  try{
    w = parseFloat(getComputedStyle(inset).width);
  }catch(e){}
  if(!(w>0)){
    try{ w = parseFloat(inset.style.width||'0'); }catch(e){}
  }
  if(!(w>0)) w = 180;
  return w;
}

function clearHistoricalNominate(inset){
  inset = inset || _getInset();
  if(!inset) return;
  try{
    var nodes = Array.prototype.slice.call(inset.querySelectorAll('.historical-box,.vr-hdot'));
    for(var i=0;i<nodes.length;i++){ nodes[i].remove(); }
  }catch(e){}
}

function renderHistoricalNominate(inset, member){
  inset = inset || _getInset();
  if(!inset || !member || !Array.isArray(member.dw_nominate) || member.dw_nominate.length===0) return;
  var series = member.dw_nominate.slice().filter(Boolean);
  if(series.length===0) return;

  // sort by congress ascending (oldest first)
  series.sort(function(a,b){ return (_parseNum(a.congress)||0) - (_parseNum(b.congress)||0); });

  var minC = _parseNum(series[0].congress)||0;
  var maxC = _parseNum(series[series.length-1].congress)||minC;
  var denom = (maxC - minC) || 1;

  var size = _insetSizePx(inset);
  var dotSize = _getMainDotSize(), half = dotSize/2; var borderRadius = (dotSize/6)+'px';

  clearHistoricalNominate(inset);

  for(var i=0;i<series.length;i++){
    var it = series[i];
    var d1 = _parseNum(it.dim1);
    var d2 = _parseNum(it.dim2);
    if(!isFinite(d1) || !isFinite(d2)) continue;
    if(d1<-1) d1=-1; if(d1>1) d1=1;
    if(d2<-1) d2=-1; if(d2>1) d2=1;

    var x = ((d1 + 1) / 2) * size;
    var y = ((1 - d2) / 2) * size;
    x = Math.max(half, Math.min(size - half, x));
    y = Math.max(half, Math.min(size - half, y));

    var t = ((_parseNum(it.congress)||minC) - minC) / denom; if(t<0) t=0; if(t>1) t=1;
    var shade = Math.round(255 * (1 - t)); // oldest -> white, newest -> black

    var box = document.createElement('div');
    box.className = 'historical-box vr-hdot';
    box.style.position='absolute';
    box.style.width = box.style.height = dotSize + 'px';
    box.style.left = (x - half) + 'px';
    box.style.top  = (y - half) + 'px';
    box.style.background = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
    box.style.border = '1px solid rgba(255,255,255,0.8)';
    box.style.borderRadius = '2px';
    box.style.zIndex = String(1 + i);   // older first, newer last (on top)
    box.style.pointerEvents = 'none';
    inset.appendChild(box);
  }
}

  function _countHistoricalBoxes(){ var i=_getInset(); return i? i.querySelectorAll('.historical-box').length : 0; }


// ===== Historical ideology robust wiring =====
function _getCard(){ return document.getElementById('adv-card-voting'); }
function _getInset(){ var c=_getCard(); return c? c.querySelector('.vr-inset') : document.querySelector('.vr-inset'); }
function _getDot(){ var i=_getInset(); return i? i.querySelector('.vr-dot') : null; }
function _getMemberData(){ return (window && (window.__memberData||window.memberData)) || null; }

function _ensureInsetReady(cb){
  // Wait for inset to exist and have layout width
  var tries = 0;
  function tick(){
    var inset = _getInset();
    var w = inset ? (parseFloat(getComputedStyle(inset).width)||inset.offsetWidth||0) : 0;
    if(inset && w>0){
      try{ if(!inset.style.position) inset.style.position='relative'; }catch(e){}
      cb(inset);
    }else if(tries++ < 20){
      // try across a few animation frames
      requestAnimationFrame(tick);
    }else{
      // final attempt after small timeout
      setTimeout(function(){ var i=_getInset(); if(i){ try{ if(!i.style.position) i.style.position='relative'; }catch(e){} cb(i); } }, 50);
    }
  }
  tick();
}

function _clearHistorical(inset){
  inset = inset || _getInset();
  if(!inset) return;
  try{
    var nodes = Array.prototype.slice.call(inset.querySelectorAll('.historical-box,.vr-hdot'));
    for(var i=0;i<nodes.length;i++){ nodes[i].remove(); }
  }catch(e){}
}

function _renderHistorical(inset, member){
  inset = inset || _getInset();
  var data = member || _getMemberData();
  if(!inset || !data || !Array.isArray(data.dw_nominate) || !data.dw_nominate.length) return;

  var series = data.dw_nominate.slice().filter(Boolean).sort(function(a,b){
    var ac = (typeof a.congress==='number')?a.congress:parseFloat(a.congress)||0;
    var bc = (typeof b.congress==='number')?b.congress:parseFloat(b.congress)||0;
    return ac-bc;
  });
  var minC = (typeof series[0].congress==='number')?series[0].congress:parseFloat(series[0].congress)||0;
  var maxC = (typeof series[series.length-1].congress==='number')?series[series.length-1].congress:parseFloat(series[series.length-1].congress)||minC;
  var denom = (maxC-minC)||1;

  // size
  var size = parseFloat(getComputedStyle(inset).width)||inset.offsetWidth||180;
  var dotSize = _getMainDotSize(), half = dotSize/2;

  _clearHistorical(inset);

  for(var i=0;i<series.length;i++){
    var it = series[i]||{};
    var d1 = (typeof it.dim1==='number')?it.dim1:parseFloat(it.dim1);
    var d2 = (typeof it.dim2==='number')?it.dim2:parseFloat(it.dim2);
    if(!isFinite(d1)||!isFinite(d2)) continue;
    if(d1<-1) d1=-1; if(d1>1) d1=1;
    if(d2<-1) d2=-1; if(d2>1) d2=1;

    var x = ((d1 + 1) / 2) * size;
    var y = ((1 - d2) / 2) * size;
    x = Math.max(half, Math.min(size - half, x));
    y = Math.max(half, Math.min(size - half, y));

    var t = (((typeof it.congress==='number')?it.congress:parseFloat(it.congress)||minC) - minC)/denom;
    if(t<0) t=0; if(t>1) t=1;
    var shade = Math.round(255*(1-t));

    var box = document.createElement('div');
    box.className = 'historical-box vr-hdot';
    box.style.position='absolute';
    box.style.width = box.style.height = dotSize + 'px';
    box.style.left = (x - half) + 'px';
    box.style.top  = (y - half) + 'px';
    box.style.background = 'rgb('+shade+','+shade+','+shade+')';
    box.style.border = '1px solid rgba(255,255,255,0.8)';
    box.style.borderRadius = '2px';
    box.style.zIndex = String(1+i);
    box.style.pointerEvents = 'none';
    inset.appendChild(box);
  }

  // Retry once next frame if nothing appended (e.g., size reported as 0 first frame)
  try{
    if(!inset.querySelector('.historical-box') && typeof requestAnimationFrame==='function'){
      requestAnimationFrame(function(){ _renderHistorical(inset, member); });
    }
  }catch(e){}
}


  function _getMainDotSize(){
  var dot = _getDot();
  if(dot){
    try{
      var cs = getComputedStyle(dot);
      var w = parseFloat(cs.width);
      var h = parseFloat(cs.height);
      if(isFinite(w) && w>0 && isFinite(h) && h>0){
        return Math.max(w,h);
      }
    }catch(e){}
    if(dot.style && dot.style.width){
      var w2 = parseFloat(dot.style.width);
      if(isFinite(w2) && w2>0) return w2;
    }
  }
  return 12;
}
function _bindHistoricalCheckbox(){
  var cb = document.getElementById('show-historical-ideology');
  if(!cb || cb._histBound) return;
  cb._histBound = true;

  cb.addEventListener('change', function(){
    _ensureInsetReady(function(inset){
      var dot = _getDot();
      if(cb.checked){
        if(dot){ dot.style.display='none'; }
        _renderHistorical(inset, _getMemberData());
      }else{
        _clearHistorical(inset);
        if(dot){ dot.style.display=''; }
      }
    });
  });

  // If already checked on load, render now
  if(cb.checked){
    _ensureInsetReady(function(inset){
      var dot = _getDot();
      if(dot){ dot.style.display='none'; }
      _renderHistorical(inset, _getMemberData());
    });
  }
}


function _getLatestNominateDims(member){
  try{
    var arr = (member && Array.isArray(member.dw_nominate)) ? member.dw_nominate.slice().filter(Boolean) : [];
    if(!arr.length) return null;
    arr.sort(function(a,b){
      var ac = (typeof a.congress==='number')?a.congress:parseFloat(a.congress)||0;
      var bc = (typeof b.congress==='number')?b.congress:parseFloat(b.congress)||0;
      return bc - ac; // newest first
    });
    var it = arr[0] || {};
    var d1 = (typeof it.dim1==='number')?it.dim1:parseFloat(it.dim1);
    var d2 = (typeof it.dim2==='number')?it.dim2:parseFloat(it.dim2);
    if(!isFinite(d1) || !isFinite(d2)) return null;
    // Clamp to [-1,1]
    if(d1 < -1) d1 = -1; if(d1>1) d1=1;
    if(d2 < -1) d2 = -1; if(d2>1) d2=1;
    return {dim1:d1, dim2:d2};
  }catch(e){ return null; }
}

function _updateCurrentIdeologyLine(member){
  try{
    var card = document.getElementById('adv-card-voting');
    if(!card) return;
    var el = card.querySelector('.vr-ideology-current');
    if(!el) return;
    var dims = _getLatestNominateDims(member);
    if(!dims){ el.textContent = 'Current ideology: (—, —)'; return; }
    el.textContent = 'Current ideology: (' + dims.dim1.toFixed(3) + ', ' + dims.dim2.toFixed(3) + ')';
  }catch(e){}
}


// === Party median rendering ===
function _parseNum(v){
  var n = (typeof v==='number')? v : parseFloat(v);
  return (isFinite(n)? n : NaN);
}

function _getCard(){ return document.getElementById('adv-card-voting'); }
function _getInset(){ var c=_getCard(); return c? c.querySelector('.vr-inset') : document.querySelector('.vr-inset'); }
function _getDot(){ var i=_getInset(); return i? i.querySelector('.vr-dot') : null; }
function _getMemberData(){ return (window && (window.__memberData||window.memberData)) || null; }
function _getMainDotSize(){
  var dot = _getDot();
  if(dot){
    try{
      var cs = getComputedStyle(dot);
      var w = parseFloat(cs.width);
      var h = parseFloat(cs.height);
      if(isFinite(w) && w>0 && isFinite(h) && h>0) return Math.max(w,h);
    }catch(e){}
    if(dot.style && dot.style.width){
      var w2 = parseFloat(dot.style.width);
      if(isFinite(w2) && w2>0) return w2;
    }
  }
  return 12;
}

function _clearPartyMedian(inset){
  inset = inset || _getInset();
  if(!inset) return;
  var el = inset.querySelector('.vr-party-median');
  if(el) el.remove();
}

function _renderPartyMedian(inset, member){
  _ensureInsetReady(function(insetReady){
    inset = insetReady || inset || _getInset();
    member = member || (window.__memberData || window.memberData);
    if(!inset || !member){ console.warn('[party-median] missing inset/member'); return; }
    var aln = member.alignment || {};
    var d1 = parseFloat(aln.dim1_median_party);
    var d2 = parseFloat(aln.dim2_median_party);
    if(!isFinite(d1) || !isFinite(d2)){
      console.warn('[party-median] invalid medians', d1, d2);
      _clearPartyMedian(inset);
      return;
    }
    if(d1 < -1) d1 = -1; if(d1 > 1) d1 = 1;
    if(d2 < -1) d2 = -1; if(d2 > 1) d2 = 1;
    var size = parseFloat((getComputedStyle(inset)||{}).width) || inset.offsetWidth || 180;
    var dotSize = _getMainDotSize(), half = dotSize/2;
    var x = ((d1 + 1) / 2) * size;
    var y = ((1 - d2) / 2) * size;
    x = Math.max(half, Math.min(size - half, x));
    y = Math.max(half, Math.min(size - half, y));
    var ep = _effectiveParty(member.identity||{});
    var color = (ep==='R') ? 'rgb(200,0,0)' : 'rgb(0,90,220)';
    var box = inset.querySelector('.vr-party-median');
    if(!box){
      box = document.createElement('div');
      box.className = 'vr-party-median';
      box.style.position='absolute';
      box.style.pointerEvents='none';
      box.style.borderRadius = '2px';
      box.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.9)';
      box.style.border = '1px solid rgba(0,0,0,0.6)';
      try{ inset.insertBefore(box, inset.firstChild||null); }catch(e){ inset.appendChild(box); }
    }
    box.style.width = box.style.height = dotSize + 'px';
    box.style.left = (x - half) + 'px';
    box.style.top  = (y - half) + 'px';
    box.style.background = color;
    box.style.zIndex = '0';
    box.style.display = '';
    box.style.opacity = '1';
    console.log('[party-median] rendered at', {d1:d1, d2:d2, x:x, y:y, color:color, size:size, dotSize:dotSize});
  });
}
function _effectiveParty(identity){
    var party = ((identity && identity.party) || '').trim().toUpperCase();
    if(party.startsWith('R') || party==='200') return 'R';
    if(party.startsWith('D') || party==='100') return 'D';
    // treat others/Independents as D for color rule
    return 'D';
  }

function _bindPartyMedianCheckbox(){
  var cb = document.getElementById('show-party-median');
  if(!cb || cb._pmBound) return;
  cb._pmBound = true;
  cb.addEventListener('change', function(){
    _ensureInsetReady(function(inset){
      if(!inset) return;
      if(cb.checked){
        console.log('[party-median] checkbox: checked -> render');
        _renderPartyMedian(inset, (window.__memberData || window.memberData));
      }else{
        console.log('[party-median] checkbox: unchecked -> clear');
        _clearPartyMedian(inset);
      }
    });
  });
  try{ _refreshPartyMedianCheckboxState(); }catch(e){}
  if(cb.checked){
    _ensureInsetReady(function(inset){
      if(inset){ console.log('[party-median] init render'); _renderPartyMedian(inset, (window.__memberData || window.memberData)); }
    });
  }
}

function _hasPartyMedian(member){
  member = member || _getMemberData();
  var aln = (member && member.alignment) || {};
  var d1 = parseFloat(aln.dim1_median_party);
  var d2 = parseFloat(aln.dim2_median_party);
  return isFinite(d1) && isFinite(d2);
}

function _refreshPartyMedianCheckboxState(){
  var cb = document.getElementById('show-party-median');
  if(!cb) return;
  try{
    var ok = _hasPartyMedian();
    cb.disabled = !ok;
    cb.title = ok ? '' : 'No party median data available for this member.';
  }catch(e){}
}
function init(){
    ensureAdvancedCards();
    showAdvancedAndHideBasic();
    renderHeaderOnly();
    ensureVotingRecordInset();
  }

  ready(init);
})();

try{
  window._forcePartyMedianRender = function(){
    console.log('[party-median] manual force render');
    _renderPartyMedian(_getInset(), (window.__memberData || window.memberData));
  };
}catch(e){}
try{ window._renderPartyMedian = _renderPartyMedian; }catch(e){}
try{ window._bindPartyMedianCheckbox = _bindPartyMedianCheckbox; }catch(e){}
try{
  setTimeout(function(){
    if (typeof window._bindPartyMedianCheckbox === 'function'){
      window._bindPartyMedianCheckbox();
    }
  }, 0);
}catch(e){}

/* ===== Minimal global renderers (no internal deps) ===== */
try{
  window._clearPartyMedianMinimal = function(){
    var inset = document.querySelector('#adv-card-voting .vr-inset');
    if(!inset) return;
    var el = inset.querySelector('.vr-party-median');
    if(el) el.remove();
  };

  window._renderPartyMedianMinimal = function(){
    var card = document.getElementById('adv-card-voting');
    var inset = card ? card.querySelector('.vr-inset') : document.querySelector('.vr-inset');
    var data = (window.__memberData || window.memberData);
    if(!inset || !data || !data.alignment){ console.warn('[party-median:min] missing inset or data'); return; }
    var d1 = parseFloat(data.alignment.dim1_median_party);
    var d2 = parseFloat(data.alignment.dim2_median_party);
    if(!isFinite(d1) || !isFinite(d2)){ console.warn('[party-median:min] invalid medians', d1, d2); return; }

    // clamp
    if(d1 < -1) d1 = -1; if(d1 > 1) d1 = 1;
    if(d2 < -1) d2 = -1; if(d2 > 1) d2 = 1;

    // inset size
    var cs = getComputedStyle(inset) || {};
    var size = parseFloat(cs.width) || inset.offsetWidth || 180;

    // main dot size
    var mainDot = inset.querySelector('.vr-dot');
    var dotSize = 12;
    if(mainDot){
      var mcs = getComputedStyle(mainDot);
      var mw = parseFloat(mcs.width), mh = parseFloat(mcs.height);
      if(isFinite(mw) && mw>0 && isFinite(mh) && mh>0) dotSize = Math.max(mw, mh);
    }
    var half = dotSize/2;

    // map dims -> px
    var x = ((d1 + 1) / 2) * size;
    var y = ((1 - d2) / 2) * size;
    x = Math.max(half, Math.min(size - half, x));
    y = Math.max(half, Math.min(size - half, y));

    // color by party
    var party = (((data.identity||{}).party)||'').toUpperCase();
    var isR = party.startsWith('R') || party === '200';
    var color = isR ? 'rgb(200,0,0)' : 'rgb(0,90,220)';

    // create/update element, insert as firstChild (behind others)
    var box = inset.querySelector('.vr-party-median');
    if(!box){
      box = document.createElement('div');
      box.className = 'vr-party-median';
      box.style.position = 'absolute';
      box.style.pointerEvents = 'none';
      box.style.borderRadius = '2px';
      box.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.9)';
      box.style.border = '1px solid rgba(0,0,0,0.6)';
      try{ inset.insertBefore(box, inset.firstChild||null); }catch(e){ inset.appendChild(box); }
    }
    box.style.width = box.style.height = dotSize + 'px';
    box.style.left = (x - half) + 'px';
    box.style.top  = (y - half) + 'px';
    box.style.background = color;
    box.style.zIndex = '0';
    box.style.display = '';
    box.style.opacity = '1';
    // Done
    return box;
  };

  // A single public hook for you to call
  window._forcePartyMedianRender = function(){
    return window._renderPartyMedianMinimal();
  };

  // Also rewire checkbox (if present) to use the minimal renderer to avoid internal deps
  (function(){
    var cb = document.getElementById('show-party-median');
    if(!cb || cb._pmMinBound) return;
    cb._pmMinBound = true;
    cb.addEventListener('change', function(){
      if(cb.checked){
        window._renderPartyMedianMinimal();
      }else{
        window._clearPartyMedianMinimal();
      }
    });
    // if already checked, render immediately
    if(cb.checked){ window._renderPartyMedianMinimal(); }
  })();
}catch(e){}
