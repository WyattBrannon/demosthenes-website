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
      
    
    
    
    
    
    try{ ensureAdvancedVoteTabs(); }catch(e){}
  try{ ensurePartyUnityInset(); }catch(e){}
try{ ensureAdvancedVoteTabs(); }catch(e){}
try{ ensureAdvancedVoteTabs(); }catch(e){}
try{ ensureAdvancedVoteTabs(); }catch(e){}
try{ ensureAdvancedVoteTabs(); }catch(e){}
try{ ensureAdvancedVoteTabs(); }catch(e){}
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
;
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
      try{ window.__memberData = data; _updateCurrentIdeologyLine(data);   updateVotingInsetWithNominate(data); try{ ensurePartyUnityInset(); }catch(e){} try{ ensurePartyUnityInset(); }catch(e){}
      try{ _updateSimilarLine(data); }catch(e){}
      }catch(e){ console && console.warn && console.warn('Nominate inset failed:', e); }
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
      '.vr-copy{ flex:1; }',
      '.vr-inset-wrap{ position:relative; width:204px; height:200px; flex:0 0 204px; }',
      '.vr-axis-y{ position:absolute; left:-15px; top:90px; transform:translateY(-50%) rotate(-90deg); transform-origin:center; font-size:0.8em; color:rgba(0,0,0,0.55); }',
      '.vr-axis-x{ position:absolute; left:24px; top:184px; width:180px; text-align:center; font-size:0.8em; color:rgba(0,0,0,0.55); }'
      , '.vr-similar{ margin-top: 12px; }'
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

  
  // Build inset wrapper + axes
  var insetWrap = document.createElement('div');
  insetWrap.className = 'vr-inset-wrap';

  // Left (vertical) axis label: "- Other +"
  var axisY = document.createElement('div');
  axisY.className = 'vr-axis-y muted';
  axisY.textContent = '- Other +';
  insetWrap.appendChild(axisY);

  // Position inset within wrapper
  inset.style.position = 'absolute';
  inset.style.left = '24px';
  inset.style.top = '0';

  insetWrap.appendChild(inset);

  // Bottom (horizontal) axis label: "- Economic +"
  var axisX = document.createElement('div');
  axisX.className = 'vr-axis-x muted';
  axisX.textContent = '- Economic +';
  insetWrap.appendChild(axisX);

  // Append the wrapper to the row instead of the inset directly
  row.appendChild(insetWrap);

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
;
}
}catch(e){}


  // Insert after the section title
  var title = card.querySelector('.section-title');
  if(title){ title.after(row); } else { card.appendChild(row); }

  // Append 'Ideologically Similar' line under everything else in this card
  if(!card.querySelector('.vr-similar')){
    var similarLine = document.createElement('div');
    similarLine.className = 'vr-similar';
    var simLabel = document.createElement('span');
    simLabel.className = 'vr-similar-label';
    simLabel.style.fontWeight = '700';
    simLabel.textContent = 'Similar ideologies: ';
    var simNames = document.createElement('span');
    simNames.className = 'vr-similar-names';
    simNames.textContent = '—';
    similarLine.appendChild(simLabel); similarLine.appendChild(simNames);
    card.appendChild(similarLine);
  }

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
function _updateSimilarLine(member){
  try{
    var card = document.getElementById('adv-card-voting');
    if(!card) return;
    var line = card.querySelector('.vr-similar');
    if(!line){
      line = document.createElement('div');
      line.className = 'vr-similar';
      var label = document.createElement('span');
      label.className = 'vr-similar-label';
      label.style.fontWeight = '700';
      label.textContent = 'Ideologically Similar: ';
      var names = document.createElement('span');
      names.className = 'vr-similar-names';
      names.textContent = '—';
      line.appendChild(label); line.appendChild(names);
      card.appendChild(line);
    }
    var namesEl = line.querySelector('.vr-similar-names');
    var m = member || (window.__memberData || window.memberData) || {};
    var list = Array.isArray(m.ideologically_similar) ? m.ideologically_similar :
               (Array.isArray((m.alignment||{}).ideologically_similar) ? (m.alignment||{}).ideologically_similar : []);
    function fmt3(x){ var n = Number(x); return (isFinite(n) ? n.toFixed(3) : null); }
    var out = [];
    for(var i=0;i<list.length && out.length<3;i++){
      var it = list[i];
      if(!it) continue;
      if(typeof it === 'string'){
        out.push(it);
      } else {
        var nm = (typeof it.name === 'string') ? it.name : String(it.name||'');
        var d = fmt3(it.distance);
        out.push(d ? (nm + ' (' + d + ')') : nm);
      }
    }
    namesEl.textContent = out.length ? out.join(', ') : '—';
  }catch(e){}
}

  // --- Voting Record tabs styles (injected once) ---
  // --- Ensure Voting Record tabs exist below 'Ideologically Similar' line ---
// --- Voting Record tabs styles (full-width, blue active) ---
(function injectVRTabStylesFix(){
  if(document.getElementById('adv-vr-tabs-style-3')) return;
  var st = document.createElement('style');
  st.id = 'adv-vr-tabs-style-3';
  st.textContent = '#adv-card-voting .mv-tabs-wrap{ width:100%; max-width:100%; display:block; margin:12px 0; }' + '\n'.repeat(1) + '#adv-card-voting .mv-tabs{ display:grid; width:100%; gap:8px; }' + '\n'.repeat(1) + '#adv-card-voting #vr-time-tabs.mv-tabs{ grid-template-columns: repeat(2, minmax(0,1fr)); }' + '\n'.repeat(1) + '#adv-card-voting #vr-type-tabs.mv-tabs{ grid-template-columns: repeat(3, minmax(0,1fr)); }' + '\n'.repeat(1) + '#adv-card-voting .mv-tabs .btn.tab{ width:100%; box-sizing:border-box; display:block; }' + '\n'.repeat(1) + '#adv-card-voting .mv-tabs .btn.tab.active{ background:var(--primary, #0B5FFF); color:#fff; border-color:var(--primary, #0B5FFF); }' + '\n'.repeat(1) + '#adv-card-voting .mv-tabs-wrap, #adv-card-voting #vr-tab-content{ overflow-anchor: none; }';
  document.head.appendChild(st);
})();
;
function ensurePartyUnityInset(){
  try{
    var card = document.getElementById('adv-card-voting');
    if(!card) return;
    // We want this between the time tabs and the type tabs
    var timeWrap = document.getElementById('vr-time-tabs-wrap');
    var typeWrap = document.getElementById('vr-type-tabs-wrap');
    try{
      var tt = document.getElementById('vr-time-tabs');
      if(tt && !tt.__unityHooked){
        tt.addEventListener('click', function(ev){
          var t = ev.target;
          if(t && t.classList && t.classList.contains('tab')){
            setTimeout(function(){ try{ ensurePartyUnityInset(); }catch(e){} }, 0);
          }
        }, true);
        tt.__unityHooked = true;
      }
    }catch(_e){}

    if(!timeWrap) return; // Needs time tabs rendered

    // Reuse CSS from ideology inset (adv-vr-style) injected by ensureVotingRecordInset()
    // Build/update the inset wrapper
    var unity = document.getElementById('vr-unity-inset-wrap');
    if(!unity){
      unity = document.createElement('div');
      unity.id = 'vr-unity-inset-wrap';
      unity.className = 'vr-inset-wrap';
      // Insert right after timeWrap, before typeWrap
      if(timeWrap.parentNode){
        if(typeWrap && typeWrap.parentNode === timeWrap.parentNode){
          timeWrap.parentNode.insertBefore(unity, typeWrap);
        }else{
          timeWrap.parentNode.insertBefore(unity, timeWrap.nextSibling);
        }
      }else{
        card.appendChild(unity);
      }
    }else{
      // Ensure it's in the right spot (between time and type)
      if(typeWrap && unity.nextSibling !== typeWrap){
        try{ unity.parentNode.insertBefore(unity, typeWrap); }catch(_e){}
      }
    }

    // Clear contents for idempotent render
    unity.innerHTML = '';

    // Axis labels depend on member's party
    function getData(){ return (window.__memberData || window.memberData) || {}; }
    var d = getData();
    var partyRaw = (((d.identity||{}).party) || d.party || d.Party || '').toString().trim().toUpperCase();
// Consider both string and numeric codes (200 = Republican, 100 = Democratic). Independents align with D for label flipping.
var isR = (partyRaw.startsWith('R') || partyRaw === '200');
var myPartyLabel = isR ? 'Republican' : 'Democratic';
var oppPartyLabel = isR ? 'Democratic' : 'Republican';

    // Create inset square
    var inset = document.createElement('div');
    inset.className = 'vr-inset';
    // --- Party Unity marker (black square) ---
    // Read values in [0,1] from member JSON
    (function(){
      var data = (window.__memberData || window.memberData) || {};
      var ux = Number((data && data.alignment.party_unity_pct) != null ? data.alignment.party_unity_pct : 0);
      var uy = Number((data && data.alignment.party_unity_bp_pct) != null ? data.alignment.party_unity_bp_pct : 0);
      if(!(ux>=0 && ux<=1)) ux = Math.max(0, Math.min(1, ux || 0));
      if(!(uy>=0 && uy<=1)) uy = Math.max(0, Math.min(1, uy || 0));
      var size = 180;
      var dotSize = 12, half = dotSize/2;

      var px = ux * size;
      var py = (1 - uy) * size; // y increases upward in data

      px = Math.max(half, Math.min(size - half, px));
      py = Math.max(half, Math.min(size - half, py));

      var uDot = inset.querySelector('.vr-unity-dot');
      if(!uDot){
        uDot = document.createElement('div');
        uDot.className = 'vr-unity-dot';
        uDot.style.position = 'absolute';
        uDot.style.width = uDot.style.height = dotSize + 'px';
        // same style as ideology black dot: black square with slight rounding
        uDot.style.background = '#000';
        uDot.style.borderRadius = '2px';
        uDot.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.8)';
        uDot.style.border = '1px solid #000';
        uDot.style.zIndex = '2';
        uDot.style.pointerEvents = 'none';
        inset.appendChild(uDot);
      }
      uDot.style.left = (px - half) + 'px';
      uDot.style.top  = (py - half) + 'px';
    })();
    // --- end Party Unity marker ---

    inset.setAttribute('aria-hidden','true');
    inset.style.width='180px';
    inset.style.height='180px';
    inset.style.borderRadius='12px';
    inset.style.flex='0 0 180px';
    inset.style.border='1px solid rgba(0,0,0,0.08)';
    inset.style.boxShadow='inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.08)';
    inset.style.position = 'absolute';
    inset.style.left = '24px';
    inset.style.top = '0';
    inset.style.backgroundColor = '#fff';
        var gradH, gradV;
        if(isR){
          // GOP (flipped): blue (right->left), red (top->bottom)
          gradH = 'linear-gradient(to left, rgba(220,53,69,0.50), rgba(255,255,255,0) 70%)';
          gradV = 'linear-gradient(to bottom, rgba(13,110,253,0.50), rgba(255,255,255,0) 70%)';
        } else {
          // DEM/IND (flipped): red (right->left), blue (top->bottom)
          gradH = 'linear-gradient(to left, rgba(13,110,253,0.50), rgba(255,255,255,0) 70%)';
          gradV = 'linear-gradient(to bottom, rgba(220,53,69,0.50), rgba(255,255,255,0) 70%)';
        }
        inset.style.backgroundImage = gradH + ',' + gradV;
        inset.style.backgroundBlendMode = 'normal';
        inset.style.backgroundSize = '100% 100%';

    // Axes (copy style from ideology inset)
    var axisY = document.createElement('div');
    axisY.className = 'vr-axis-y muted';
    axisY.textContent = '- ' + oppPartyLabel + ' +';

    var axisX = document.createElement('div');
    axisX.className = 'vr-axis-x muted';
    axisX.textContent = '- ' + myPartyLabel + ' +';

    // Append
    unity.appendChild(axisY);
        // shift vertical label 8px further left from its computed position
        try{
          var cs = window.getComputedStyle(axisY);
          var curr = parseFloat(cs.left) || 0;
          axisY.style.left = (curr - 18) + 'px';
        }catch(_e){}
        /* SHIFT_AXISY_LEFT_8PX */
    unity.appendChild(inset);
    unity.appendChild(axisX);
    
    
    
    // ---- Right-side "Votes with {party}: X% of the time" line ----
    (function(){
      try{
        var data = (window.__memberData || window.memberData) || {};
        var partyRaw = ((((data.identity||{}).party) || data.party || data.Party) || '').toString().trim().toUpperCase();
        var isR = (partyRaw.startsWith('R') || partyRaw === '200');
        var myParty = (isR ? 'Republicans' : 'Democrats');
        var oppParty = (isR ? 'Democrats' : 'Republicans');

        // primary party_unity_pct
        var raw1 = (data.alignment && data.alignment.party_unity_pct);
        var val1 = Number(raw1);
        if(val1 <= 1 && val1 >= 0) val1 *= 100;
        var valStr1 = (isFinite(val1) ? (Math.round(val1 * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%' : '—');

        // secondary bp_pct (opposite party)
        var raw2 = (data.alignment && data.alignment.party_unity_bp_pct);
        var val2 = Number(raw2);
        if(val2 <= 1 && val2 >= 0) val2 *= 100;
        var valStr2 = (isFinite(val2) ? (Math.round(val2 * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%' : '—');
        // --- Override values when "All Time" tab is active ---
        (function(){
          try{
            var scopeBtn = document.querySelector('#vr-time-tabs .tab.active');
            var scope = scopeBtn && ((scopeBtn.getAttribute('data-scope')) || (scopeBtn.dataset && scopeBtn.dataset.scope)) || 'current';
            if(scope === 'all'){
              var aAll = (data && data.alignment) || {};
              function pctFmt(v){
                return (v == null) ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%';
              }
              function safePct(num, den){
                var n = Number(num), d = Number(den);
                if(!(isFinite(n) && isFinite(d) && d > 0)) return null;
                return (n / d) * 100;
              }
              // Line 1: X = 1 - (maverick_votes_all / total_votes_all)
              (function(){
                var n = Number(aAll.maverick_votes_all), d = Number(aAll.total_votes_all);
                var v = (isFinite(n) && isFinite(d) && d > 0) ? (1 - (n/d)) * 100 : null;
                valStr1 = pctFmt(v);
              })();
              // Line 2: X = (bipartisan_votes_all / total_votes_all)
              (function(){
                var v = safePct(aAll.bipartisan_votes_all, aAll.total_votes_all);
                valStr2 = pctFmt(v);
              })();
              // For lines 3-5 we override their value strings after they are computed
              window.__vrUnityAllScope = true;
            }else{
              window.__vrUnityAllScope = false;
            }
          }catch(_e){ window.__vrUnityAllScope = false; }
        })();


        // Ensure row and copy containers
        var row = document.getElementById('vr-unity-row');
        if(!row){
          row = document.createElement('div');
          row.id = 'vr-unity-row';
          row.className = 'vr-row';
          if(timeWrap && timeWrap.parentNode){
            if(typeWrap && typeWrap.parentNode === timeWrap.parentNode){
              timeWrap.parentNode.insertBefore(row, typeWrap);
            }else{
              timeWrap.parentNode.insertBefore(row, timeWrap.nextSibling);
            }
          }else if(unity && unity.parentNode){
            unity.parentNode.insertBefore(row, unity);
          }
        }
        if(unity && unity.parentNode !== row){
          try{ row.appendChild(unity); }catch(_e){}
        }
        var copy = document.getElementById('vr-unity-copy');
        if(!copy){
          copy = document.createElement('div');
          copy.id = 'vr-unity-copy';
          copy.className = 'vr-copy';
          row.appendChild(copy);
        }else if(copy.parentNode !== row){
          try{ row.appendChild(copy); }catch(_e){}
        }

        // Clear old
        copy.innerHTML = '';

        // First line (main, bold label) - like Overall ideology line
        var line1 = document.createElement('div');
        line1.className = 'vr-ideology';
        try{
          var ref = document.querySelector('#adv-card-voting .vr-ideology');
          if(ref){
            var fs = window.getComputedStyle(ref).fontSize;
            if(fs) line1.style.fontSize = fs;
          }
        }catch(_e){}
        var label1 = document.createElement('span');
        label1.className = 'vr-ideology-label';
        label1.style.fontWeight='700';
        label1.textContent = 'Votes with ' + myParty + ': ';
        var value1 = document.createElement('span');
        value1.className = 'vr-ideology-values'; value1.id='unity-val-1';
        value1.textContent = valStr1 + ' of the time';
        line1.appendChild(label1);
        line1.appendChild(value1);
        copy.appendChild(line1);

        // Second line (current-style, muted smaller) - opposite party bp_pct
        var line2 = document.createElement('div');
        line2.className = 'vr-ideology-current vr-historical-label';
        line2.style.fontSize = '0.9em';
        line2.style.marginTop = '4px';
        var label2 = document.createElement('span');
        label2.textContent = 'Votes with ' + oppParty + ': ';
        var value2 = document.createElement('span'); value2.id='unity-val-2'; value2.textContent = valStr2 + ' of the time';
        line2.appendChild(label2);
        line2.appendChild(value2);
        copy.appendChild(line2);
        // ---- Third line: Votes with OTHER_PARTY against THEIR_PARTY (maverick bipartisan / total) ----
        (function(){
          var otherPartyWord = (isR ? 'Democrats' : 'Republicans');
          var theirPartyWord = (isR ? 'Republicans' : 'Democrats');
          var a = (data && data.alignment) || {};
          var n3 = Number(a.maverick_bipartisan), d3 = Number(a.total_votes);
          var v3 = (isFinite(n3) && isFinite(d3) && d3 > 0) ? (n3 / d3) * 100 : null;
          var val3Str = (v3 == null) ? '—' : (Math.round(v3 * 10) / 10).toFixed(1).replace(/\.0$/, '');

          var line3 = document.createElement('div');
          line3.className = 'vr-ideology-current vr-historical-label';
          line3.style.fontSize = '0.9em';
          line3.style.marginTop = '4px';
          var label3 = document.createElement('span');
          label3.textContent = 'Votes with ' + otherPartyWord + ' against ' + theirPartyWord + ': ';
          var value3 = document.createElement('span'); value3.id='unity-val-3'; value3.textContent = (val3Str + '%') + ' of the time';
          line3.appendChild(label3);
          line3.appendChild(value3);
          copy.appendChild(line3);
        })();

        // ---- Fourth line: Votes against both parties ((maverick_votes - maverick_bipartisan) / total) ----
        (function(){
          var a = (data && data.alignment) || {};
          var mv = Number(a.maverick_votes);
          var mb = Number(a.maverick_bipartisan);
          var tv = Number(a.total_votes);
          var v4 = (isFinite(mv) && isFinite(mb) && isFinite(tv) && tv > 0) ? ((mv - mb) / tv) * 100 : null;
          var val4Str = (v4 == null) ? '—' : (Math.round(v4 * 10) / 10).toFixed(1).replace(/\.0$/, '');

          var line4 = document.createElement('div');
          line4.className = 'vr-ideology-current vr-historical-label';
          line4.style.fontSize = '0.9em';
          line4.style.marginTop = '4px';
          var label4 = document.createElement('span');
          label4.textContent = 'Votes against both parties: ';
          var value4 = document.createElement('span'); value4.id='unity-val-4'; value4.textContent = (val4Str + '%') + ' of the time';
          line4.appendChild(label4);
          line4.appendChild(value4);
          copy.appendChild(line4);
        })();

        // ---- Fifth line: Fails to vote (missed / (total + missed)) ----
        (function(){
          var a = (data && data.alignment) || {};
          var miss = Number(a.missed_votes);
          var tot  = Number(a.total_votes);
          var denom = (isFinite(miss)?miss:0) + (isFinite(tot)?tot:0);
          var v5 = (denom > 0 && isFinite(miss)) ? (miss / denom) * 100 : null;
          var val5Str = (v5 == null) ? '—' : (Math.round(v5 * 10) / 10).toFixed(1).replace(/\.0$/, '');

          var line5 = document.createElement('div');
          line5.className = 'vr-ideology-current vr-historical-label';
          line5.style.fontSize = '0.9em';
          line5.style.marginTop = '4px';
          var label5 = document.createElement('span');
          label5.textContent = 'Fails to vote: ';
          var value5 = document.createElement('span'); value5.id='unity-val-5'; value5.textContent = (val5Str + '%') + ' of the time';
          line5.appendChild(label5);
          line5.appendChild(value5);
          copy.appendChild(line5);
        })();

        // Add a third line for "Votes with OTHER_PARTY against THEIR_PARTY"
        var otherPartyWord = (isR ? 'Democrats' : 'Republicans');
        var theirPartyWord = (isR ? 'Republicans' : 'Democrats');
        var rawMav = (data && data.alignment && data.alignment.maverick_bipartisan);
        var rawTotal = (data && data.alignment && data.alignment.total_votes);
        var val3 = null;
        if(rawMav != null && rawTotal != null){
          var num = Number(rawMav);
          var den = Number(rawTotal);
          if(isFinite(num) && isFinite(den) && den > 0){
            val3 = (num / den) * 100;
          }
        }

        var line3 = document.createElement('div');
        line3.className = 'vr-ideology-current';
        line3.classList.add('vr-historical-label');
        line3.style.fontSize = '0.9em';
        line3.style.marginTop = '4px';

        var label3 = document.createElement('span');
        label3.className = 'vr-ideology-label';
        label3.textContent = 'Votes with ' + otherPartyWord + ' against ' + theirPartyWord + ': ';

        var value3 = document.createElement('span');
        value3.className = 'vr-ideology-values';
        value3.textContent = (val3 == null ? '—' : (

        val3Str + '%')) + ' of the time';

        line3.appendChild(label3);
        line3.appendChild(value3);
        copy.appendChild(line3);
        // ---- 4th line: Votes against both parties ----
        (function(){
          var a = (data && data.alignment) || {};
          var mv = Number(a.maverick_votes);
          var mb = Number(a.maverick_bipartisan);
          var tv = Number(a.total_votes);
          var val4 = null;
          if(isFinite(mv) && isFinite(mb) && isFinite(tv) && tv > 0){
            val4 = ((mv - mb) / tv) * 100;
          }

        var line4 = document.createElement('div');
          line4.className = 'vr-ideology-current';
          line4.classList.add('vr-historical-label');
          line4.style.marginTop = '4px';
          line4.style.fontSize = '0.9em';

          var label4 = document.createElement('span');
          label4.className = 'vr-ideology-label';
          // no bold
          // label4.style.fontWeight = '700';
          label4.textContent = 'Votes against both parties: ';

          var value4 = document.createElement('span');
          value4.className = 'vr-ideology-values'; value4.id='unity-val-4';
          value4.textContent = (val4 == null ? '—' : (

        val4Str + '%')) + ' of the time';

          line4.appendChild(label4);
          line4.appendChild(value4);
          copy.appendChild(line4);
        })();

        // ---- 5th line: Fails to vote ----
        (function(){
          var a = (data && data.alignment) || {};
          var mv = Number(a.missed_votes);
          var tv = Number(a.total_votes);
          var val5 = null;
          if(isFinite(mv) && isFinite(tv) && (tv + mv) > 0){
            val5 = (mv / (tv + mv)) * 100;
          }

        var line5 = document.createElement('div');
          line5.className = 'vr-ideology-current';
          line5.classList.add('vr-historical-label');
          line5.style.marginTop = '4px';
          line5.style.fontSize = '0.9em';

          var label5 = document.createElement('span');
          label5.className = 'vr-ideology-label';
          // no bold
          // label5.style.fontWeight = '700';
          label5.textContent = 'Fails to vote: ';

          var value5 = document.createElement('span');
          value5.className = 'vr-ideology-values'; value5.id='unity-val-5';
          value5.textContent = (val5 == null ? '—' : (

        val5Str + '%')) + ' of the time';

          line5.appendChild(label5);
          line5.appendChild(value5);
          copy.appendChild(line5);
        // === All-Time overrides for party-unity lines (update spans by id) ===
        (function(){
          try{
            var scopeBtn = document.querySelector('#vr-time-tabs .tab.active');
            var scope = scopeBtn && ((scopeBtn.getAttribute('data-scope')) || (scopeBtn.dataset && scopeBtn.dataset.scope)) || 'current';
            var A = ((window.__memberData || window.memberData) || {}).alignment || {};
            function pct(v){ return (v==null)?'—':(Math.round(v*10)/10).toFixed(1).replace(/\.0$/,'') + '%'; }
            function safe(num,den){ var n=Number(num), d=Number(den); return (isFinite(n)&&isFinite(d)&&d>0)?(n/d)*100:null; }
            if(scope === 'all'){
              // 1) Votes with own party: 1 - (maverick_votes_all / total_votes_all)
              (function(){
                var v1 = (isFinite(Number(A.maverick_votes_all)) && isFinite(Number(A.total_votes_all)) && Number(A.total_votes_all)>0)
                          ? (1 - (Number(A.maverick_votes_all)/Number(A.total_votes_all)))*100 : null;
                var el = document.getElementById('unity-val-1'); if(el) el.textContent = pct(v1) + ' of the time';
              })();
              // 2) Votes with opposite party: (bipartisan_votes_all / total_votes_all)
              (function(){
                var v2 = safe(A.bipartisan_votes_all, A.total_votes_all);
                var el = document.getElementById('unity-val-2'); if(el) el.textContent = pct(v2) + ' of the time';
              })();
              // 3) Votes with OTHER against THEIR: (maverick_bipartisan_all / total_votes_all)
              (function(){
                var v3 = safe(A.maverick_bipartisan_all, A.total_votes_all);
                var el = document.getElementById('unity-val-3'); if(el) el.textContent = pct(v3) + ' of the time';
              })();
              // 4) Votes against both parties: ((maverick_votes_all - maverick_bipartisan_all) / total_all)
              (function(){
                var mAll = Number(A.maverick_votes_all), mbAll = Number(A.maverick_bipartisan_all), tAll = Number(A.total_votes_all);
                var v4 = (isFinite(mAll)&&isFinite(mbAll)&&isFinite(tAll)&&tAll>0)?((mAll-mbAll)/tAll)*100:null;
                var el = document.getElementById('unity-val-4'); if(el) el.textContent = pct(v4) + ' of the time';
              })();
              // 5) Fails to vote: (missed_votes_all / (total_votes_all + missed_votes_all))
              (function(){
                var miss = Number(A.missed_votes_all), tot = Number(A.total_votes_all);
                var denom = (isFinite(miss)?miss:0) + (isFinite(tot)?tot:0);
                var v5 = (denom>0 && isFinite(miss)) ? (miss/denom)*100 : null;
                var el = document.getElementById('unity-val-5'); if(el) el.textContent = pct(v5) + ' of the time';
              })();
            }
          }catch(_e){}
        })();

        // === All-Time overrides for party-unity lines (applied after elements are created) ===
        (function(){
          try{
            var scopeBtn = document.querySelector('#vr-time-tabs .tab.active');
            var scope = scopeBtn && ((scopeBtn.getAttribute('data-scope')) || (scopeBtn.dataset && scopeBtn.dataset.scope)) || 'current';
            if(scope !== 'all') return;
            var A = (data && data.alignment) || {};
            function pct(v){ return (v==null)?'—':(Math.round(v*10)/10).toFixed(1).replace(/\.0$/,'') + '%'; }
            function safe(num,den){ var n=Number(num), d=Number(den); return (isFinite(n)&&isFinite(d)&&d>0)?(n/d)*100:null; }
            // 1) Votes with own party: 1 - (maverick_votes_all / total_votes_all)
            var v1 = (isFinite(Number(A.maverick_votes_all)) && isFinite(Number(A.total_votes_all)) && Number(A.total_votes_all)>0)
                      ? (1 - (Number(A.maverick_votes_all)/Number(A.total_votes_all)))*100 : null;
            if (typeof value1 !== 'undefined') value1.textContent = pct(v1) + ' of the time';

            // 2) Votes with opposite party (bp): (bipartisan_votes_all / total_votes_all)
            var v2 = safe(A.bipartisan_votes_all, A.total_votes_all);
            if (typeof value2 !== 'undefined') value2.textContent = pct(v2) + ' of the time';

            // 3) Votes with OTHER against THEIR: (maverick_bipartisan_all / total_votes_all)
            var v3 = safe(A.maverick_bipartisan_all, A.total_votes_all);
            if (typeof value3 !== 'undefined') value3.textContent = pct(v3) + ' of the time';

            // 4) Votes against both parties: ((maverick_votes_all - maverick_bipartisan_all) / total_votes_all)
            var mAll = Number(A.maverick_votes_all), mbAll = Number(A.maverick_bipartisan_all), tAll = Number(A.total_votes_all);
            var v4 = (isFinite(mAll)&&isFinite(mbAll)&&isFinite(tAll)&&tAll>0)?((mAll-mbAll)/tAll)*100:null;
            if (typeof value4 !== 'undefined') value4.textContent = pct(v4) + ' of the time';

            // 5) Fails to vote: (missed_votes_all / (total_votes_all + missed_votes_all))
            var miss = Number(A.missed_votes_all), tot = Number(A.total_votes_all);
            var denom = (isFinite(miss)?miss:0) + (isFinite(tot)?tot:0);
            var v5 = (denom>0 && isFinite(miss)) ? (miss/denom)*100 : null;
            if (typeof value5 !== 'undefined') value5.textContent = pct(v5) + ' of the time';
          }catch(_e){}
        })();

        })();





      }catch(_e){}
    })();
    // ---- end right-side line ----





    // Optional: title above the square for clarity (comment out if not desired)
    
  } catch(e) { try{ console.error(e); }catch(_e){} }

    // ---- Similar voting records line (inserted directly under #vr-unity-row) ----
    (function(){
      try{
        var data = (window.__memberData || window.memberData) || {};
        var sims = (data && data.vote_record_similar) || [];
        // If not an array or empty, remove any existing line and bail
        if(!Array.isArray(sims) || sims.length === 0){
          var old = document.getElementById('vr-vote-similar');
          if(old && old.parentNode) old.parentNode.removeChild(old);
          return;
        }

        var top = sims.slice(0, 3).filter(function(x){ return x && (x.name || x.member_name || x.full_name); });
        if(top.length === 0){
          var old2 = document.getElementById('vr-vote-similar');
          if(old2 && old2.parentNode) old2.parentNode.removeChild(old2);
          return;
        }

        // Format: Name (Distance)
        var parts = top.map(function(x){
          var nm = x.name || x.member_name || x.full_name || x.Member || 'Unknown';
          var d  = (x.distance != null ? x.distance : (x.dist != null ? x.dist : x.score));
          if(typeof d === 'number' && isFinite(d)){
            d = (Math.round(d * 1000) / 1000).toString();
          }
          return nm + ' (' + (d != null ? d : '—') + ')';
        });

        var line = document.getElementById('vr-vote-similar');
        if(line && line.parentNode){
          // detach so we can re-insert at the correct spot
          line.parentNode.removeChild(line);
        }
        if(!line){
          line = document.createElement('div');
          line.id = 'vr-vote-similar';
          line.className = 'vr-ideology'; // same style as "Similar ideologies:"
        }

        // Build content
        line.innerHTML = '';
        var label = document.createElement('span');
        label.className = 'vr-ideology-label';
        label.style.fontWeight = '700';
        label.textContent = 'Similar voting records: ';
        var value = document.createElement('span');
        value.className = 'vr-ideology-values';
        value.textContent = parts.join(', ');
        line.appendChild(label);
        line.appendChild(value);

        // Insert **under** the party unity inset row
        var row = document.getElementById('vr-unity-row');
        if(row && row.parentNode){
          if(row.nextSibling){
            row.parentNode.insertBefore(line, row.nextSibling);
          }else{
            row.parentNode.appendChild(line);
          }
        }else{
          // Fallback: before the time tabs
          var timeWrap = document.getElementById('vr-time-tabs-wrap');
          if(timeWrap && timeWrap.parentNode){
            timeWrap.parentNode.insertBefore(line, timeWrap);
          }
        }
      }catch(_e){}
    })();
    // ---- end Similar voting records line ----

}


function ensureAdvancedVoteTabs(){
  try{
    var card = document.getElementById('adv-card-voting');
    if(!card) return;

    var similar = card.querySelector('.vr-similar');
    var anchor = similar || card.querySelector('.section-title') || card;

    // Time tabs
    var timeWrap = document.getElementById('vr-time-tabs-wrap');
    var timeTabs = document.getElementById('vr-time-tabs');
    if(!timeWrap){
      timeWrap = document.createElement('div'); timeWrap.className='mv-tabs-wrap'; timeWrap.id='vr-time-tabs-wrap';
      timeTabs = document.createElement('div'); timeTabs.className='mv-tabs'; timeTabs.id='vr-time-tabs';
      timeWrap.appendChild(timeTabs);
      if(anchor && anchor.parentNode){ anchor.parentNode.insertBefore(timeWrap, anchor.nextSibling); } else { card.appendChild(timeWrap); }
    }
    if(!timeTabs){ timeTabs = document.createElement('div'); timeTabs.className='mv-tabs'; timeTabs.id='vr-time-tabs'; timeWrap.appendChild(timeTabs); }
    timeTabs.innerHTML = ''
      + '<button type="button" class="btn tab active" data-scope="current">This Congress</button>'
      + '<button type="button" class="btn tab" data-scope="all">All Time</button>';

    // Type tabs
    var typeWrap = document.getElementById('vr-type-tabs-wrap');
    try{
      var tt = document.getElementById('vr-time-tabs');
      if(tt && !tt.__unityHooked){
        tt.addEventListener('click', function(ev){
          var t = ev.target;
          if(t && t.classList && t.classList.contains('tab')){
            setTimeout(function(){ try{ ensurePartyUnityInset(); }catch(e){} }, 0);
          }
        }, true);
        tt.__unityHooked = true;
      }
    }catch(_e){}

    var typeTabs = document.getElementById('vr-type-tabs');
    if(!typeWrap){
      typeWrap = document.createElement('div'); typeWrap.className='mv-tabs-wrap'; typeWrap.id='vr-type-tabs-wrap';
      typeTabs = document.createElement('div'); typeTabs.className='mv-tabs'; typeTabs.id='vr-type-tabs';
      typeWrap.appendChild(typeTabs);
      var after = timeWrap || anchor;
      if(after && after.parentNode){ after.parentNode.insertBefore(typeWrap, after.nextSibling); } else { card.appendChild(typeWrap); }
    }
    if(!typeTabs){ typeTabs = document.createElement('div'); typeTabs.className='mv-tabs'; typeTabs.id='vr-type-tabs'; typeWrap.appendChild(typeTabs); }
    typeTabs.innerHTML = ''
      + '<button type="button" class="btn tab active" data-type="major">Major Votes</button>'
      + '<button type="button" class="btn tab" data-type="maverick">Maverick Votes</button>'
      + '<button type="button" class="btn tab" data-type="missed">Missed Votes</button>';

    // Content area
    var content = document.getElementById('vr-tab-content');
    if(!content){
      content = document.createElement('div');
      content.id = 'vr-tab-content';
      content.className = 'vr-tab-content';
      var after2 = typeWrap || timeWrap || anchor;
      if(after2 && after2.parentNode){ after2.parentNode.insertBefore(content, after2.nextSibling); } else { card.appendChild(content); }
    }

    // Data mapping (lists are independent of time tabs; always use current-congress arrays)
    function getData(){ return (window.__memberData || window.memberData) || {}; }
    function listFor(type){
      var d = getData();
      if(type==='maverick') return d.maverick_votes || d.maverickVotes || [];
      if(type==='missed')   return d.missed_votes || d.missedVotes || [];
      return d.key_votes || d.keyVotes || d.recent_major_votes || [];
    }

    // Render list
    function renderVoteList(root, items, type){
      root.innerHTML = '';
      if(!items || !items.length){
        var empty = document.createElement('div');
        empty.className = 'muted';
        var label = (type==='major'?'major': (type==='maverick'?'maverick':'missed'));
        empty.textContent = 'No ' + label + ' votes available.';
        root.appendChild(empty);
        return;
      }
      var expanded = !!root.__expanded;
      var slice = expanded ? items.slice() : items.slice(0, Math.min(3, items.length));
      slice.forEach(function(v){
        var row = document.createElement('div');
        row.className = 'stack';
        row.style.borderTop = '1px solid var(--border)';
        row.style.paddingTop = '8px';

        var q = (v && (v.question || v.title || v.bill || v.id)) || 'Vote';
        var how = (v && (v.vote || v.member_vote || v.member_position || v.position || v.choice)) || '';
        var mv  = (v && v.maverick_vote === true) ? ' (maverick)' : '';
        var date= (v && (v.date || v.voted_at || v.roll_date)) || '';

        var head = document.createElement('div');
        var strong = document.createElement('strong'); strong.textContent = String(q); head.appendChild(strong);
        if(date){
          var sep = document.createTextNode(' • '); head.appendChild(sep);
          var span = document.createElement('span'); span.className='muted';
          try{ span.textContent = new Date(date).toLocaleDateString(); }catch(e){ span.textContent = String(date); }
          head.appendChild(span);
        }
        row.appendChild(head);

        var descText = (v && (v.vote_desc || v.dtl_desc || v.description || v.summary)) || '';
        if(descText){
          var desc = document.createElement('div');
          desc.className = 'muted';
          desc.textContent = String(descText);
          row.appendChild(desc);
        }

        var meta = document.createElement('div');
        meta.className = 'muted';
        meta.textContent = (how ? ('Position: ' + how + mv) : '');
        meta.style.marginBottom = '8px';
        row.appendChild(meta);

        root.appendChild(row);
      });

      if(items.length > 3){
        var ctr = document.createElement('div');
        ctr.style.paddingTop = '8px';
        var btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = expanded ? 'Show less' : 'Show more';
        btn.addEventListener('click', function(e){
          e.preventDefault(); e.stopPropagation();
          var x=window.scrollX||0, y=window.scrollY||0;
          try{ root.__expanded = !expanded; renderCurrent(); } finally { try{ window.scrollTo(x,y); }catch(_e){} }
        });
        ctr.appendChild(btn);
        root.appendChild(ctr);
      }
    }

    function currentSelection(){
      var tActive = typeTabs.querySelector('.btn.tab.active');
      var type = (tActive && tActive.dataset && tActive.dataset.type) || 'major';
      return {type:type};
    }

    function renderCurrent(){
      var sel = currentSelection();
      var items = listFor(sel.type);
      renderVoteList(content, items, sel.type);
      return (items && items.length) ? true : false;
    }

    function setActive(btn){
      var parent = btn && btn.parentElement; if(!parent) return;
      var peers = parent.querySelectorAll('.btn.tab');
      for(var i=0;i<peers.length;i++){ peers[i].classList.toggle('active', peers[i]===btn); }
    }

    // Time tabs: only toggle active; do not drive list rendering
    if(!timeTabs._wired){
      timeTabs._wired = true;
      timeTabs.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        var btn = e.target.closest('.btn.tab'); if(!btn) return;
        var x=window.scrollX||0, y=window.scrollY||0;
        try{ setActive(btn); } finally { try{ window.scrollTo(x,y); }catch(_e){} }
      });
    }
    if(!typeTabs._wired){
      typeTabs._wired = true;
      typeTabs.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        var btn = e.target.closest('.btn.tab'); if(!btn) return;
        var x=window.scrollX||0, y=window.scrollY||0;
        try{ setActive(btn); renderCurrent(); } finally { try{ window.scrollTo(x,y); }catch(_e){} }
      });
    }

    // Initial paint + polling
    if(!renderCurrent()){
      if(!content._initialPoll){
        var tries = 0;
        content._initialPoll = setInterval(function(){
          tries++;
          var ok = renderCurrent();
          if(ok || tries>50){
  try { clearInterval(content._initialPoll); } catch(_e) {}
  content._initialPoll = null;
}
        }, 200);
      }
    }
  } catch (e) {
  try { console.error(e); } catch (_e) {}
}
}

// --- Voting Record tabs styles (full-width, blue active) ---
function init(){
  try{ ensureAdvancedCards(); }catch(e){}
  try{ showAdvancedAndHideBasic(); }catch(e){}
  try{ renderHeaderOnly(); }catch(e){}
  try{ ensureVotingRecordInset(); }catch(e){}
  try{ ensureAdvancedVoteTabs(); }catch(e){}
}

  ready(init);
})();
;

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
;
}catch(e){}

;try{ if (typeof ready==='function') { ready(function(){ try{ ensureAdvancedVoteTabs(); }catch(e){} }); } }catch(_e){}
