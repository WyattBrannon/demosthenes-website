// member_adv.app.js — Advanced Mode: header + four new analysis cards
(function(){
  "use strict";
var __ADV_STATE_NAME_TO_INFO = {"ALABAMA": {"usps": "AL", "fips": "01"}, "ALASKA": {"usps": "AK", "fips": "02"}, "ARIZONA": {"usps": "AZ", "fips": "04"}, "ARKANSAS": {"usps": "AR", "fips": "05"}, "CALIFORNIA": {"usps": "CA", "fips": "06"}, "COLORADO": {"usps": "CO", "fips": "08"}, "CONNECTICUT": {"usps": "CT", "fips": "09"}, "DELAWARE": {"usps": "DE", "fips": "10"}, "DISTRICT OF COLUMBIA": {"usps": "DC", "fips": "11"}, "FLORIDA": {"usps": "FL", "fips": "12"}, "GEORGIA": {"usps": "GA", "fips": "13"}, "HAWAII": {"usps": "HI", "fips": "15"}, "IDAHO": {"usps": "ID", "fips": "16"}, "ILLINOIS": {"usps": "IL", "fips": "17"}, "INDIANA": {"usps": "IN", "fips": "18"}, "IOWA": {"usps": "IA", "fips": "19"}, "KANSAS": {"usps": "KS", "fips": "20"}, "KENTUCKY": {"usps": "KY", "fips": "21"}, "LOUISIANA": {"usps": "LA", "fips": "22"}, "MAINE": {"usps": "ME", "fips": "23"}, "MARYLAND": {"usps": "MD", "fips": "24"}, "MASSACHUSETTS": {"usps": "MA", "fips": "25"}, "MICHIGAN": {"usps": "MI", "fips": "26"}, "MINNESOTA": {"usps": "MN", "fips": "27"}, "MISSISSIPPI": {"usps": "MS", "fips": "28"}, "MISSOURI": {"usps": "MO", "fips": "29"}, "MONTANA": {"usps": "MT", "fips": "30"}, "NEBRASKA": {"usps": "NE", "fips": "31"}, "NEVADA": {"usps": "NV", "fips": "32"}, "NEW HAMPSHIRE": {"usps": "NH", "fips": "33"}, "NEW JERSEY": {"usps": "NJ", "fips": "34"}, "NEW MEXICO": {"usps": "NM", "fips": "35"}, "NEW YORK": {"usps": "NY", "fips": "36"}, "NORTH CAROLINA": {"usps": "NC", "fips": "37"}, "NORTH DAKOTA": {"usps": "ND", "fips": "38"}, "OHIO": {"usps": "OH", "fips": "39"}, "OKLAHOMA": {"usps": "OK", "fips": "40"}, "OREGON": {"usps": "OR", "fips": "41"}, "PENNSYLVANIA": {"usps": "PA", "fips": "42"}, "RHODE ISLAND": {"usps": "RI", "fips": "44"}, "SOUTH CAROLINA": {"usps": "SC", "fips": "45"}, "SOUTH DAKOTA": {"usps": "SD", "fips": "46"}, "TENNESSEE": {"usps": "TN", "fips": "47"}, "TEXAS": {"usps": "TX", "fips": "48"}, "UTAH": {"usps": "UT", "fips": "49"}, "VERMONT": {"usps": "VT", "fips": "50"}, "VIRGINIA": {"usps": "VA", "fips": "51"}, "WASHINGTON": {"usps": "WA", "fips": "53"}, "WEST VIRGINIA": {"usps": "WV", "fips": "54"}, "WISCONSIN": {"usps": "WI", "fips": "55"}, "WYOMING": {"usps": "WY", "fips": "56"}, "PUERTO RICO": {"usps": "PR", "fips": "72"}};



// Helper: load Turf.js (for robust polygon clipping) if not already loaded
function __advEnsureTurf(){
  return new Promise(function(resolve, reject){
    if (window.turf) return resolve(window.turf);
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
    s.async = true;
    s.onload = function(){ resolve(window.turf); };
    s.onerror = function(){ reject(new Error('Failed to load turf')); };
    document.head.appendChild(s);
  });
}



// Helper: replace the Leaflet map element with a fresh clone so we can re-initialize safely
function __advFreshMapEl(){
  var el = document.getElementById('adv-district-map');
  if(!el) return null;
  var fresh = el.cloneNode(false);
  if(el.parentNode){ el.parentNode.replaceChild(fresh, el); }
  return fresh;
}


(function injectAdvDistrictTabStyles(){
  if(document.getElementById('adv-district-tabs-style')) return;
  var st = document.createElement('style');
  st.id = 'adv-district-tabs-style';
  st.textContent = [
    '#adv-card-district .mv-tabs-wrap{ width:100%; max-width:100%; display:block; margin:12px 0 4px 0; }',
    '#adv-card-district .mv-tabs{ display:grid; width:100%; gap:8px; }',
    '#adv-card-district #adv-district-tabs.mv-tabs{ grid-template-columns: repeat(3, minmax(0,1fr)); }',
    '#adv-card-district .mv-tabs .btn.tab{ width:100%; box-sizing:border-box; display:block; }',
    '#adv-card-district .mv-tabs .btn.tab.active{ background:var(--primary, #0B5FFF); color:#fff; border-color:var(--primary, #0B5FFF); }'
  ].join('\n');
  document.head.appendChild(st);
})();


// --- Advanced: explicit map section + renderer ---
function renderAdvDistrictMapInset(){
  try {
var noteEl = document.getElementById('district-map-note-adv');
          var mapEl  = document.getElementById('adv-district-map');
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

          // Initialize map (refresh container to avoid double-init)
          mapEl = __advFreshMapEl() || mapEl;
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
} catch (e) { /* do nothing; map is optional */ }
}




function renderAdvCountyPres2020(){
  try{
    var noteEl = document.getElementById('district-map-note-adv');
    var mapEl  = document.getElementById('adv-district-map');
    if (!mapEl || typeof L === 'undefined') return;

    function pad2(n){ n=String(n||''); return n.length<2?('0'+n):n; }
    var STATE_FIPS = {"AL":"01","AK":"02","AZ":"04","AR":"05","CA":"06","CO":"08","CT":"09","DE":"10","FL":"12","GA":"13","HI":"15","ID":"16","IL":"17","IN":"18","IA":"19","KS":"20","KY":"21","LA":"22","ME":"23","MD":"24","MA":"25","MI":"26","MN":"27","MS":"28","MO":"29","MT":"30","NE":"31","NV":"32","NH":"33","NJ":"34","NM":"35","NY":"36","NC":"37","ND":"38","OH":"39","OK":"40","OR":"41","PA":"42","RI":"44","SC":"45","SD":"46","TN":"47","TX":"48","UT":"49","VT":"50","VA":"51","WA":"53","WV":"54","WI":"55","WY":"56","DC":"11","PR":"72"};

    var id = (typeof data!=='undefined' && data && data.identity) ? data.identity : {};
    var state = (id.state || '').toUpperCase();
    var district = (id.district || '').toString().toUpperCase();
    if (!state){ if(noteEl) noteEl.textContent = 'Map unavailable (missing state)'; return; }
    if (district === 'AL' || district === 'AT-LARGE' || district === '0' || district === '00') district = '00';
    if (/^\d+$/.test(district)) district = pad2(district);

    var stfp = STATE_FIPS[state];
    if (!stfp){ if(noteEl) noteEl.textContent = 'Map unavailable (unknown state)'; return; }

    // Fresh container
    mapEl = __advFreshMapEl() || mapEl;
    var map = L.map(mapEl, { scrollWheelZoom:false, dragging:true, touchZoom:true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var useStateOverlay = (!district || district === '00');
    var layerURL, where;
    if (useStateOverlay) {
      layerURL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/76"; // States
      where = "STATE='" + stfp + "'";
    } else {
      layerURL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/50"; // CD118
      where = "STATE='" + stfp + "' AND CD118='" + district + "'";
    }
    var baseUrl = layerURL + "/query?where=" + encodeURIComponent(where) + "&outFields=*&returnGeometry=true&f=geojson";

    __advEnsureTurf()
      .then(function(){
        return fetch(baseUrl, { cache:'force-cache' }).then(function(r){ return r.json(); });
      })
      .then(function(baseGeo){
        try{
          var baseLayer=null, baseBounds=null, clipGeom=null;
          if (baseGeo && baseGeo.features && baseGeo.features.length){
            baseLayer = L.geoJSON(baseGeo, { style:{ color:'#2563eb', weight:2, fillOpacity:0.10 } }).addTo(map);
            baseBounds = baseLayer.getBounds();
            if(baseBounds) map.fitBounds(baseBounds, { padding:[12,12] });

            // union base features to a single clip geom
            var feats = baseGeo.features.map(function(f){ return window.turf.cleanCoords(f); });
            clipGeom = feats[0];
            for(var i=1;i<feats.length;i++){
              try{ clipGeom = window.turf.union(clipGeom, feats[i]); }catch(e){ /* keep prior clipGeom on union failure */ }
            }
          }
          if(!clipGeom){ if(noteEl) noteEl.textContent = 'District outline unavailable.'; return; }

          var overlayURL = "https://wyattbrannon.github.io/demosthenes-data/county-results/county_district_2020.geojson";
          return fetch(overlayURL, { cache:'force-cache' }).then(function(r){ return r.json(); }).then(function(overlayGeo){
            try{
              if(!overlayGeo || !overlayGeo.features){ if(noteEl) noteEl.textContent = 'County overlay unavailable.'; return; }

              // prefilter by bounds (quick reject)
              var candidates = overlayGeo.features;
              var prefiltered = [];
              if(baseBounds){
                var minLon = baseBounds.getWest(), minLat = baseBounds.getSouth(), maxLon = baseBounds.getEast(), maxLat = baseBounds.getNorth();
                for(var i=0;i<candidates.length;i++){
                  try{
                    var lyr = L.geoJSON(candidates[i]);
                    var b = lyr.getBounds();
                    if(!b) continue;
                    if(b.getEast() < minLon || b.getWest() > maxLon || b.getNorth() < minLat || b.getSouth() > maxLat) continue;
                    prefiltered.push(candidates[i]);
                  }catch(e){}
                }
              }else{
                prefiltered = candidates.slice(0);
              }

              var clipped = [];
              for(var j=0;j<prefiltered.length;j++){
                var cf = prefiltered[j];
                try{
                  if(window.turf.booleanIntersects(cf, clipGeom)){
                    var piece = window.turf.intersect(window.turf.cleanCoords(cf), clipGeom);
                    if(piece){
                      piece.properties = Object.assign({}, cf.properties || {});
                      clipped.push(piece);
                    }
                  }
                }catch(e){}
              }

              if(!clipped.length){
                if(noteEl) noteEl.textContent = 'No county results for ' + state + (district && district!=='00' ? ('-'+district) : '') + '.';
                return;
              }

              var layer = L.geoJSON({ type:'FeatureCollection', features:clipped }, {
                style: function(feature){
                  var p = feature && feature.properties || {};
                  var fill = p.color_2020_pres || p.color || '#999';
                  return { color: '#111', weight: 0.5, fillOpacity: 0.65, fillColor: String(fill) };
                },
                

onEachFeature: function(feature, lyr){
  var p = feature && feature.properties || {};
  var label = (p.county || p.NAME || p.name || 'County');

  // Read margin_pct_2020_pres and normalize to absolute percentage
  var raw = (p.margin_pct_2020_pres != null) ? p.margin_pct_2020_pres : null;
  var marginText = '';
  if (raw != null) {
    var num = parseFloat(raw);
    if (isFinite(num)) {
      if (Math.abs(num) <= 1) num = num * 100;
      num = Math.abs(num);
      var pct = Math.round(num * 10) / 10;
      marginText = ' — Two-party margin: ' + pct.toFixed(1) + '%';
    }
  }
  lyr.bindTooltip(label + marginText, { sticky:true });
}


              }).addTo(map);

              if(baseBounds){
                map.fitBounds(baseBounds, { padding:[12,12] });
              }else{
                try{ map.fitBounds(layer.getBounds(), { padding:[12,12] }); }catch(e){}
              }

              if(noteEl){
                var title = state + (district==='00'?' (2020 Pres by County)':'-'+district+' (2020 Pres by County)');
                noteEl.textContent = title;
              }
            }catch(e){ if(noteEl) noteEl.textContent = 'Overlay error'; }
          });
        }catch(e){ if(noteEl) noteEl.textContent = 'Map error'; }
      })
      .catch(function(){ if(noteEl) noteEl.textContent = 'Map unavailable (network/geotools)'; });
  }catch(e){ /* optional */ }
}

function renderAdvCountyHouse2022(){
  try{
    var noteEl = document.getElementById('district-map-note-adv');
    var mapEl  = document.getElementById('adv-district-map');
    if (!mapEl || typeof L === 'undefined') return;

    function pad2(n){ n=String(n||''); return n.length<2?('0'+n):n; }
    var STATE_FIPS = {"AL":"01","AK":"02","AZ":"04","AR":"05","CA":"06","CO":"08","CT":"09","DE":"10","FL":"12","GA":"13","HI":"15","ID":"16","IL":"17","IN":"18","IA":"19","KS":"20","KY":"21","LA":"22","ME":"23","MD":"24","MA":"25","MI":"26","MN":"27","MS":"28","MO":"29","MT":"30","NE":"31","NV":"32","NH":"33","NJ":"34","NM":"35","NY":"36","NC":"37","ND":"38","OH":"39","OK":"40","OR":"41","PA":"42","RI":"44","SC":"45","SD":"46","TN":"47","TX":"48","UT":"49","VT":"50","VA":"51","WA":"53","WV":"54","WI":"55","WY":"56","DC":"11","PR":"72"};

    var id = (typeof data!=='undefined' && data && data.identity) ? data.identity : {};
    var state = (id.state || '').toUpperCase();
    var district = (id.district || '').toString().toUpperCase();
    if (!state){ if(noteEl) noteEl.textContent = 'Map unavailable (missing state)'; return; }
    if (district === 'AL' || district === 'AT-LARGE' || district === '0' || district === '00') district = '00';
    if (/^\d+$/.test(district)) district = pad2(district);

    var stfp = STATE_FIPS[state];
    if (!stfp){ if(noteEl) noteEl.textContent = 'Map unavailable (unknown state)'; return; }

    // Fresh container
    mapEl = __advFreshMapEl() || mapEl;
    var map = L.map(mapEl, { scrollWheelZoom:false, dragging:true, touchZoom:true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var useStateOverlay = (!district || district === '00');
    var layerURL, where;
    if (useStateOverlay) {
      layerURL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/76"; // States
      where = "STATE='" + stfp + "'";
    } else {
      layerURL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/50"; // CD118
      where = "STATE='" + stfp + "' AND CD118='" + district + "'";
    }
    var baseUrl = layerURL + "/query?where=" + encodeURIComponent(where) + "&outFields=*&returnGeometry=true&f=geojson";

    __advEnsureTurf()
      .then(function(){
        return fetch(baseUrl, { cache:'force-cache' }).then(function(r){ return r.json(); });
      })
      .then(function(baseGeo){
        try{
          var baseLayer=null, baseBounds=null, clipGeom=null;
          if (baseGeo && baseGeo.features && baseGeo.features.length){
            baseLayer = L.geoJSON(baseGeo, { style:{ color:'#2563eb', weight:2, fillOpacity:0.10 } }).addTo(map);
            baseBounds = baseLayer.getBounds();
            if(baseBounds) map.fitBounds(baseBounds, { padding:[12,12] });

            // union base features to a single clip geom
            var feats = baseGeo.features.map(function(f){ return window.turf.cleanCoords(f); });
            clipGeom = feats[0];
            for(var i=1;i<feats.length;i++){
              try{ clipGeom = window.turf.union(clipGeom, feats[i]); }catch(e){ /* keep prior clipGeom on union failure */ }
            }
          }
          if(!clipGeom){ if(noteEl) noteEl.textContent = 'District outline unavailable.'; return; }

          var overlayURL = "https://wyattbrannon.github.io/demosthenes-data/county-results/county_district_2020.geojson";
          return fetch(overlayURL, { cache:'force-cache' }).then(function(r){ return r.json(); }).then(function(overlayGeo){
            try{
              if(!overlayGeo || !overlayGeo.features){ if(noteEl) noteEl.textContent = 'County overlay unavailable.'; return; }

              // prefilter by bounds (quick reject)
              var candidates = overlayGeo.features;
              var prefiltered = [];
              if(baseBounds){
                var minLon = baseBounds.getWest(), minLat = baseBounds.getSouth(), maxLon = baseBounds.getEast(), maxLat = baseBounds.getNorth();
                for(var i=0;i<candidates.length;i++){
                  try{
                    var lyr = L.geoJSON(candidates[i]);
                    var b = lyr.getBounds();
                    if(!b) continue;
                    if(b.getEast() < minLon || b.getWest() > maxLon || b.getNorth() < minLat || b.getSouth() > maxLat) continue;
                    prefiltered.push(candidates[i]);
                  }catch(e){}
                }
              }else{
                prefiltered = candidates.slice(0);
              }

              
              // If overlay already contains county-by-district geometries (it does),
              // prefer attribute filtering over geometric clipping to preserve properties exactly.
              var clipped = [];
              var propFiltered = [];
              try{
                var wantDistrict = (district || '00');
                if (/^\d+$/.test(wantDistrict)) wantDistrict = (wantDistrict.length<2?('0'+wantDistrict):wantDistrict);
                var inState = function(fips){ return typeof fips==='string' && fips.slice(0,2) === stfp; };
                for(var k=0;k<prefiltered.length;k++){
                  var pf = prefiltered[k];
                  var pp = pf && pf.properties || {};
                  if(pp && pp.district && pp.county_fips){
                    if(pp.district === wantDistrict && inState(String(pp.county_fips))){
                      propFiltered.push(pf);
                    }
                  }
                }
              }catch(e){ /* ignore */ }

              if(propFiltered.length){
                clipped = propFiltered;
              } else {
                // Fallback: do geometric clipping
                for(var j=0;j<prefiltered.length;j++){
                  var cf = prefiltered[j];
                  try{
                    if(window.turf.booleanIntersects(cf, clipGeom)){
                      var piece = window.turf.intersect(window.turf.cleanCoords(cf), clipGeom);
                      if(piece){
                        piece.properties = Object.assign({}, cf.properties || {});
                        clipped.push(piece);
                      }
                    }
                  }catch(e){}
                }
              }
if(!clipped.length){
                if(noteEl) noteEl.textContent = 'No county results for ' + state + (district && district!=='00' ? ('-'+district) : '') + '.';
                return;
              }

              var layer = L.geoJSON({ type:'FeatureCollection', features:clipped }, {
                style: function(feature){
                  var p = feature && feature.properties || {};
                  // Prefer explicit House color fields; fall back to deriving from House margin; then any generic color
                  var fill = p.color_2022_house || p.color_house_2022 || p.color_house || p.house_color || p.houseColour || p.house_color_hex || null;
                  if(!fill){
                    var rawm = (p.margin_pct_2022_house != null) ? p.margin_pct_2022_house
                              : (p.house_margin_pct != null) ? p.house_margin_pct
                              : (p.margin_pct_house_2022 != null) ? p.margin_pct_house_2022
                              : (p.margin_house != null) ? p.margin_house
                              : null;
                    var m = parseFloat(rawm);
                    if (isFinite(m)){
                      if (Math.abs(m) <= 1) m = m * 100;
                      fill = (m >= 0 ? '#2563eb' : '#dc2626'); // blue if D+, red if R+
                    }
                  }
                  fill = fill || p.color || '#999';
                  return { color: '#111', weight: 0.5, fillOpacity: 0.65, fillColor: String(fill) };
                },
                onEachFeature: function(feature, lyr){
                  var p = feature && feature.properties || {};
                  var label = (p.county || p.NAME || p.name || p.county_name_x || p.county_name_y || 'County');

                  // Optional one-time debug: list available keys to console to verify field names
                  if (!window.__ADV_LOGGED_HOUSE_KEYS__) {
                    try { console.debug('[adv] House feature keys:', Object.keys(p)); } catch(e){}
                    window.__ADV_LOGGED_HOUSE_KEYS__ = true;
                  }

                  // House margin (absolute percent) with robust fallbacks
                  var raw = (p.margin_pct_2022_house != null) ? p.margin_pct_2022_house
                           : (p.house_margin_pct != null) ? p.house_margin_pct
                           : (p.margin_pct_house_2022 != null) ? p.margin_pct_house_2022
                           : (p.margin_house != null) ? p.margin_house
                           : null;
                  var marginText = '';
                  if (raw != null) {
                    var num = parseFloat(raw);
                    if (isFinite(num)) {
                      if (Math.abs(num) <= 1) num = num * 100;
                      num = Math.abs(num);
                      var pct = Math.round(num * 10) / 10;
                      marginText = ' — Two-party margin: ' + pct.toFixed(1) + '%';
                    }
                  }
                  lyr.bindTooltip(label + marginText, { sticky:true });
                }

              }).addTo(map);

              if(baseBounds){
                map.fitBounds(baseBounds, { padding:[12,12] });
              }else{
                try{ map.fitBounds(layer.getBounds(), { padding:[12,12] }); }catch(e){}
              }

              if(noteEl){
                var title = state + (district==='00'?' (2022 House by County)':'-'+district+' (2022 House by County)');
                noteEl.textContent = title;
              }
            }catch(e){ if(noteEl) noteEl.textContent = 'Overlay error'; }
          });
        }catch(e){ if(noteEl) noteEl.textContent = 'Map error'; }
      })
      .catch(function(){ if(noteEl) noteEl.textContent = 'Map unavailable (network/geotools)'; });
  }catch(e){ /* optional */ }
}



function ensureAdvDistrictTabs(){
  try{
    var card = document.getElementById('adv-card-district');
    if(!card) return;
    var tabs = card.querySelector('#adv-district-tabs');
    if(!tabs || tabs.__bound) return;
    tabs.__bound = true;
    tabs.addEventListener('click', function(ev){
      var btn = ev.target;
      if(!btn || !btn.classList || !btn.classList.contains('tab')) return;
      var view = btn.getAttribute('data-view');
      // toggle active classes
      var all = tabs.querySelectorAll('.tab');
      for(var i=0;i<all.length;i++){
        var t = all[i];
        var isActive = (t === btn);
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
      // simple hook: for now, just re-render the district map when switching back to 'district'
      try{
        if(view === 'district'){ renderAdvDistrictMapInset(); }
        else if(view === 'countyHouse2022'){ renderAdvCountyHouse2022(); }
        else if(view === 'county2024'){ renderAdvCountyPres2020(); }
      }catch(e){}
    }, true);
  }catch(e){}
}

function ensureAdvDistrictSection(){
  try{
    var advCard = document.getElementById('adv-card-district');
    if(!advCard) return;
    if(advCard.__advDistrictBuilt) return;

    var titleEl = advCard.querySelector('.section-title');
    if(titleEl){
            var tabsHTML = ''
        + '<div class="mv-tabs-wrap">'
        + '  <div id="adv-district-tabs" class="mv-tabs" role="tablist" aria-label="District map view tabs">'
        + '    <button class="btn tab active" data-view="district" type="button" role="tab" aria-selected="true">District View</button>'
        + '    <button class="btn tab" data-view="countyHouse2022" type="button" role="tab" aria-selected="false">2022 House by County</button>'
        + '    <button class="btn tab" data-view="county2024" type="button" role="tab" aria-selected="false">2020 Presidential by County</button>'
        + '  </div>'
        + '</div>';
    var mapHTML = ''
        + '<div id="adv-district-map-inset" style="margin-top:8px">'
        + '  <div id="adv-district-map" style="height:180px; border-radius:12px; overflow:hidden; margin-top:6px;"></div>'
        + '  <div id="district-map-note-adv" class="muted">Loading district map...</div>'
        + '</div>';
      titleEl.insertAdjacentHTML('afterend', tabsHTML + mapHTML);
    }

    function moveIfExists(id){
      var el = document.getElementById(id);
      if(el && el !== advCard){
        advCard.appendChild(el);
      }
    }
    moveIfExists('district-contact-btns');
    moveIfExists('office-info-title');
    moveIfExists('office-list');
    moveIfExists('office-list-none');

    advCard.__advDistrictBuilt = true; try{ ensureAdvDistrictTabs(); }catch(e){}
    try{ renderAdvDistrictMapInset(); }catch(e){}
  }catch(e){}
}

var data;


// --- tiny helper for "Show more / Show less" on a comma-separated line ---
function _wireShowToggle(opts){
  var root = opts.root, namesEl = opts.namesEl;
  var items = (opts.items||[]).slice();
  var closed = (opts.limitClosed || 3);
  var open   = (opts.limitOpen   || 10);
  var expanded = false;
  if(!root || !namesEl) return;

  var toggle = root.querySelector('.show-toggle');
  if(!toggle){
    toggle = document.createElement('span');
    toggle.className = (opts.mutedClass ? (opts.mutedClass + ' ') : '') + 'show-toggle';
    toggle.style.cursor = 'pointer';
    toggle.style.marginLeft = '0.5ch';
    root.appendChild(document.createTextNode(' '));
    root.appendChild(toggle);
  }

  // Accessibility + stacking so taps land
  toggle.setAttribute('role','button');
  toggle.setAttribute('tabindex','0');
  toggle.style.position = 'relative';
  toggle.style.zIndex = '3';
  toggle.style.pointerEvents = 'auto';

  function render(){
    var slice = expanded ? items.slice(0, open) : items.slice(0, closed);
    namesEl.textContent = (slice.length ? slice.join(', ') : '—');
    toggle.textContent = expanded ? 'Show less' : 'Show more';
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.style.display = (items.length > closed) ? '' : 'none';
  }
  render();

  if (!toggle.__boundToggle){
    toggle.__boundToggle = true;
    function onToggle(e){ if(e){ try{ e.preventDefault(); }catch(_){}} expanded = !expanded; render(); }

    if (window.PointerEvent){
      toggle.addEventListener('pointerup', onToggle, {passive:false});
      // do not add click in this branch to avoid double-trigger on iOS
    } else {
      toggle.addEventListener('touchend', onToggle, {passive:false});
      toggle.addEventListener('click', onToggle, {passive:false});
    }
    toggle.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onToggle(e); }
    });
  }
}

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
        + '  <div class="section-title">District and Contact Information</div>'
        + '  <div class="muted">Advanced district & contact information will appear here.</div>'
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
      if (sec.closest('#advCards')) { sec.style.display = '';   try{ ensureAdvDistrictSection(); renderAdvDistrictMapInset(); }catch(e){}
}
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
    if(!bioguide){ if(header) header.textContent='Missing ?bioguide='; return; }
    if(header) header.textContent='Fetching member JSON & YAML';

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
data = results[0] || {}; var yamlText = results[1] || ''; try{ window.__ADV_YAML_TEXT = yamlText; }catch(_){}
      try{ ensureAdvDistrictSection(); }catch(e){}
try{ renderAdvDistrictMapInset(); }catch(e){}
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
      , '.vr-similar{ margin-top: 12px; }', '.vr-inset, .vr-inset-wrap{ pointer-events: none; }', '.vr-similar{ position:relative; z-index:3; }', '.show-toggle{ pointer-events: auto; }'].join('');
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
    simLabel.textContent = 'Similar ideologically: ';
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
  var card = document.getElementById('adv-card-voting');
  if(!card) return;
  var line = card.querySelector('.vr-similar');
  if(!line){
    line = document.createElement('div');
    line.className = 'vr-similar';
    var label = document.createElement('span');
    label.className = 'vr-similar-label';
    label.style.fontWeight = '700';
    label.textContent = 'Similar ideologies: ';
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
  var full = [];
  for(var i=0;i<list.length;i++){
    var it = list[i];
    if(!it) continue;
    if(typeof it === 'string'){
      full.push(it);
    } else {
      var nm = (typeof it.name === 'string') ? it.name : String(it.name||'');
      var d = fmt3(it.distance);
      full.push(d ? (nm + ' (' + d + ')') : nm);
    }
  }
  if (typeof _wireShowToggle === 'function'){
    _wireShowToggle({
      root: line,
      namesEl: namesEl,
      items: full,
      limitClosed: 3,
      limitOpen: 10,
      mutedClass: 'muted'
    });
  } else {
    namesEl.textContent = full.slice(0,3).join(', ');
  }
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
      // Ensure absolute children (inset, axes) are positioned relative to the wrap
      unity.style.position = 'relative';

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
      (function(){
        var data = (window.__memberData || window.memberData) || {};
        var A = (data && data.alignment) || {};
        // Determine active scope
        var tabs = document.getElementById('vr-time-tabs');
        var active = tabs && tabs.querySelector('.tab.active');
        var scope = (active && (active.getAttribute('data-scope') || (active.dataset && active.dataset.scope))) || 'current';

        // Compute ux, uy in [0,1]
        var ux = 0, uy = 0;
        if(scope === 'all'){
          var totalAll = Number(A.total_votes_all);
          var mAll = Number(A.maverick_votes_all);
          var bpAll = Number(A.bipartisan_votes_all);
          var xAll = (isFinite(totalAll) && totalAll > 0 && isFinite(mAll)) ? (1 - (mAll/totalAll)) : null;
          var yAll = (isFinite(totalAll) && totalAll > 0 && isFinite(bpAll)) ? (bpAll/totalAll) : null;
          if(xAll != null && yAll != null){
            ux = xAll;
            uy = yAll;
          }else{
            // fall back to current if all-time data missing
            var uxRawF = (data.party_unity_pct != null) ? data.party_unity_pct : A.party_unity_pct;
            var uyRawF = (data.party_unity_bp_pct != null) ? data.party_unity_bp_pct : A.party_unity_bp_pct;
            ux = Number(uxRawF); uy = Number(uyRawF);
          }
        } else {
          var uxRaw = (data.party_unity_pct != null) ? data.party_unity_pct : A.party_unity_pct;
          var uyRaw = (data.party_unity_bp_pct != null) ? data.party_unity_bp_pct : A.party_unity_bp_pct;
          ux = Number(uxRaw); uy = Number(uyRaw);
        }

        // Clamp
        ux = (isFinite(ux) ? Math.max(0, Math.min(1, ux)) : 0);
        uy = (isFinite(uy) ? Math.max(0, Math.min(1, uy)) : 0);

        // Position within 180x180 inset, invert y for CSS top
        var size = 180, dotSize = 12, half = dotSize/2;
        var px = Math.max(half, Math.min(size - half, ux * size));
        var py = Math.max(half, Math.min(size - half, (1 - uy) * size));

        var uDot = inset.querySelector('.vr-unity-dot');
        if(!uDot){
          uDot = document.createElement('div');
          uDot.className = 'vr-unity-dot';
          uDot.style.position = 'absolute';
          uDot.style.width = uDot.style.height = dotSize + 'px';
          uDot.style.background = '#000';
          uDot.style.borderRadius = '2px';
          uDot.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.85)';
          uDot.style.border = '1px solid #000';
          uDot.style.zIndex = '2';
          uDot.style.pointerEvents = 'none';
          inset.appendChild(uDot);
        }
        uDot.style.left = (px - half) + 'px';
        uDot.style.top  = (py - half) + 'px';
      })();
      // --- end Party Unity marker ---
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

    // ---- Similar voting records line (placed under party unity inset) ----
    (function(){
      try{
        var data = (window.__memberData || window.memberData) || {}
        var sims = (data && (data.vote_record_similar || ((data.alignment||{}).vote_record_similar))) || [];
        if(!Array.isArray(sims)) sims = [];

        // Build FULL formatted list
        var partsAll = sims
          .filter(function(x){ return x && (x.name || x.member_name || x.full_name); })
          .map(function(x){
            var nm = x.name || x.member_name || x.full_name || x.Member || 'Unknown';
            var d = (x.distance != null ? x.distance : (x.dist != null ? x.dist : x.score));
            if(typeof d === 'number' && isFinite(d)){ d = (Math.round(d * 1000) / 1000).toString(); }
            return nm + ' (' + (d != null ? d : '—') + ')';
          });

        // Create/update line element
        var lineId = 'vr-vote-similar';
        var lineEl = document.getElementById(lineId);
        if(!partsAll.length){
          if(lineEl && lineEl.parentNode){ lineEl.parentNode.removeChild(lineEl); }
          return;
        }
        if(!lineEl){
          lineEl = document.createElement('div');
          lineEl.id = lineId;
          lineEl.className = 'vr-similar'; // same style as "Similar ideologies:"
        }
        // Compose bold label and values
        lineEl.innerHTML = '';
        var label = document.createElement('span');
        label.className = 'vr-similar-label';
        label.style.fontWeight = '700';
        label.textContent = 'Similar voting records: ';
        var value = document.createElement('span');
        value.className = 'vr-similar-names';
        lineEl.appendChild(label);
        lineEl.appendChild(value);

        var row = document.getElementById('vr-unity-row');
        if(row && row.parentNode){
          if(row.nextSibling){
            row.parentNode.insertBefore(lineEl, row.nextSibling);
          }else{
            row.parentNode.appendChild(lineEl);
          }
        }

        _wireShowToggle({
          root: lineEl,
          namesEl: value,
          items: partsAll,
          limitClosed: 3,
          limitOpen: 10,
          mutedClass: 'muted'
        });
      }catch(_e){}
    })();
    // ---- end Similar voting records line ----

    
    
    
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

    // === All-Time overrides (query right pane && update all five lines) ===
    (function(){
      try{
        var scopeBtn = document.querySelector('#vr-time-tabs .tab.active');
        var scope = (scopeBtn && (scopeBtn.getAttribute('data-scope') || (scopeBtn.dataset && scopeBtn.dataset.scope))) || 'current';
        if(scope !== 'all') return;

        // Find the right-side copy container
        var copy = document.getElementById('vr-unity-copy');
        if(!copy){
          var row = document.getElementById('vr-unity-row');
          if(row) copy = row.querySelector('.vr-copy');
        }
        if(!copy) return;

        // Each line is a div; the value span is the last span in that div
        var lines = copy.querySelectorAll('div');
        if(!lines || lines.length < 2) return; // need at least the first two lines present

        // Data
        var A = ((((window.__memberData || window.memberData) || {}).alignment) || {});
        function fmt(v){ return (v==null) ? '—' : (Math.round(v*10)/10).toFixed(1).replace(/\.0$/, '') + '%'; }
        function safeDiv(n,d){ n=Number(n); d=Number(d); return (isFinite(n) && isFinite(d) && d>0) && ((n/d)*100) || null }

        var totalAll = Number(A.total_votes_all);

        // 1) Votes with own party: 1 - (maverick_votes_all / total_votes_all)
        try{
          var span1 = lines[0] && lines[0].querySelectorAll('span');
          if(span1 && span1.length){ 
            var m = Number(A.maverick_votes_all);
            var v1 = (isFinite(totalAll) && totalAll>0 && isFinite(m)) && ((1 - (m/totalAll))*100) || null;
            span1[span1.length-1].textContent = fmt(v1) + ' of the time';
          }
        }catch(_e){}

        // 2) Votes with opposite party
        try{
          var span2 = lines[1] && lines[1].querySelectorAll('span');
          if(span2 && span2.length){
            var b = Number(A.bipartisan_votes_all);
            var v2 = (isFinite(totalAll) && totalAll>0 && isFinite(b)) && ((b/totalAll)*100) || null;
            span2[span2.length-1].textContent = fmt(v2) + ' of the time';
          }
        }catch(_e){}

        // 3) Votes with OTHER against THEIR
        try{
          var span3 = lines[2] && lines[2].querySelectorAll('span');
          if(span3 && span3.length){
            var mbp = Number(A.maverick_bipartisan_all);
            var v3 = (isFinite(totalAll) && totalAll>0 && isFinite(mbp)) && ((mbp/totalAll)*100) || null;
            span3[span3.length-1].textContent = fmt(v3) + ' of the time';
          }
        }catch(_e){}

        // 4) Votes against both parties
        try{
          var span4 = lines[3] && lines[3].querySelectorAll('span');
          if(span4 && span4.length){
            var mv = Number(A.maverick_votes_all), mbp = Number(A.maverick_bipartisan_all);
            var v4 = (isFinite(totalAll) && totalAll>0 && isFinite(mv) && isFinite(mbp)) && (((mv-mbp)/totalAll)*100) || null;
            span4[span4.length-1].textContent = fmt(v4) + ' of the time';
          }
        }catch(_e){}

        // 5) Fails to vote
        try{
          var span5 = lines[4] && lines[4].querySelectorAll('span');
          if(span5 && span5.length){
            var miss = Number(A.missed_votes_all);
            var denom = (isFinite(totalAll)?totalAll:0) + (isFinite(miss)?miss:0);
            var v5 = (denom>0 && isFinite(miss)) && ((miss/denom)*100) || null;
            span5[span5.length-1].textContent = fmt(v5) + ' of the time';
          }
        }catch(_e){}

      }catch(_e){}
    })();

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

        var descText = (v && (v.vote_desc || v.dtl_desc || v.description || v.summary || v.question)) || '';
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
        btn.className = 'btn finance-toggle-pacs'; ctr.appendChild(btn);
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

;(()=>{
  // === County Overlay Manager (build once, swap styles, Canvas renderer) ===
  if (typeof window === 'undefined' || !window.L) return;
  const Lref = window.L;

  // Avoid double-install
  if (window.__CountyOverlayManagerInstalled__) return;
  window.__CountyOverlayManagerInstalled__ = true;

  // Utility: loose detection of county overlay GeoJSON
  function looksLikeCountyGeoJSON(geojson){
    try{
      const f = geojson && (geojson.features && geojson.features[0]);
      const p = f && f.properties || null;
      if(!p) return false;
      const keys = Object.keys(p);
      const wanted = [
        'county_fips','county','NAME','name','county_name_x','county_name_y','district',
        'two_party_2020_pres','margin_pct_2020_pres','color_2020_pres',
        'two_party_2022_house','margin_pct_2022_house','color_2022_house'
      ];
      return wanted.some(k => keys.indexOf(k) !== -1);
    }catch(e){ return false; }
  }

  // Normalize margin text to a percentage number
  function normToPercent(raw){
    if(raw == null) return NaN;
    let s = String(raw).trim();
    s = s.replace(/\u2212/g, '-')   // Unicode minus
         .replace(/,/g, '')
         .replace(/%/g, '')
         .replace(/^(EVEN|TIED)$/i, '0')
         .replace(/^[DRI]\s*\+?/i, '');
    let n = parseFloat(s);
    if(!Number.isFinite(n)) return NaN;
    // If data is in proportion (0.8) instead of percent (80), scale up
    if (Math.abs(n) <= 1) n = n * 100;
    return n;
  }

  // Label helper
  function countyLabel(p){
    return p.county || p.NAME || p.name || p.county_name_x || p.county_name_y || 'County';
  }

  const Manager = {
    map: null,
    canvas: null,
    geojsonData: null,
    layer: null,
    mode: 'president', // 'president' | 'house' | 'none'
    _ready: false,

    ensureMap(){
      if (this.map && this.canvas) return true;
      // Try common globals
      const cand = (window.map || window._map || window.MAP || null);
      if (cand && typeof cand.addLayer === 'function') {
        this.map = cand;
        this.canvas = Lref.canvas({ padding: 0.5 });
        return true;
      }
      // Attempt to detect via existing Leaflet maps
      if (Lref && Lref.map && Lref._leaflet_id) {
        // no-op; not reliable
      }
      return false;
    },

    setMode(newMode){
      if (!newMode) return;
      if (newMode !== 'president' && newMode !== 'house' && newMode !== 'none') return;
      this.mode = newMode;
      if (!this.layer) return;
      if (newMode === 'none') {
        // District View: remove counties
        try { this.map && this.map.removeLayer(this.layer); } catch(e){}
        return;
      }
      // Ensure layer is on the map
      if (this.map && !this.map.hasLayer(this.layer)) {
        try { this.layer.addTo(this.map); } catch(e){}
      }
      this.refresh();
    },

    styleFor(feature){
      const p = feature && feature.properties || {};
      let fill;
      if (this.mode === 'president') {
        fill = p.color_2020_pres || p.color || '#999';
      } else { // 'house'
        fill = p.color_2022_house || p.color || '#999';
      }
      return { color: '#111', weight: 0.5, fillOpacity: 0.65, fillColor: String(fill) };
    },

    tooltipFor(feature){
      const p = feature && feature.properties || {};
      const label = countyLabel(p);
      let raw;
      if (this.mode === 'president') raw = p.margin_pct_2020_pres;
      else if (this.mode === 'house') raw = p.margin_pct_2022_house;
      let txt = label;
      const n = normToPercent(raw);
      if (Number.isFinite(n)) {
        const pct = Math.round(Math.abs(n) * 10) / 10;
        txt += ' — Two-party margin: ' + pct.toFixed(1) + '%';
      }
      return txt;
    },

    buildLayer(){
      if (!this.geojsonData || !this.ensureMap()) return;
      if (this.layer) return this.layer;
      this.layer = Lref.geoJSON(this.geojsonData, {
        renderer: this.canvas,
        style: (f)=>this.styleFor(f),
        onEachFeature: (f,l)=>{
          l.bindTooltip(this.tooltipFor(f), { sticky: true });
        }
      });
      if (this.mode !== 'none') {
        try { this.layer.addTo(this.map); } catch(e){}
      }
      this._ready = true;
      return this.layer;
    },

    refresh(){
      if (!this.layer) return;
      try {
        this.layer.setStyle((f)=>this.styleFor(f));
        // Rebind tooltips to reflect mode-specific text
        this.layer.eachLayer(l => {
          if (!l || !l.feature) return;
          l.bindTooltip(this.tooltipFor(l.feature), { sticky: true });
        });
        if (this.layer.redraw) this.layer.redraw();
      } catch(e){ /* ignore */ }
    }
  };

  // Expose for debugging
  window.__CountyOverlayManager = Manager;

  // Intercept L.geoJSON to capture county dataset and return the managed layer to prevent duplicates
  const origGeoJSON = Lref.geoJSON;
  Lref.geoJSON = function(geojson, opts){
    try{
      if (geojson && looksLikeCountyGeoJSON(geojson)) {
        // First time we see it, store raw GeoJSON
        if (!Manager.geojsonData) {
          Manager.geojsonData = geojson;
          // Try to detect the map if not set yet
          Manager.ensureMap();
          Manager.buildLayer();
        }
        // If we're asked to create the county layer again, return the one true layer.
        // Also, apply visibility: if current UI is district view, the layer may be hidden.
        return Manager.layer || origGeoJSON.call(this, geojson, opts);
      }
    }catch(e){
      // fallthrough to original
    }
    return origGeoJSON.call(this, geojson, opts);
  };

  // Tab switching: listen for clicks on elements whose text matches our views.
  function onClick(e){
    try{
      const el = e.target && e.target.closest && e.target.closest('a,button,[role=tab],[data-tab],.tab');
      if (!el) return;
      const t = (el.textContent || '').trim().toLowerCase();
      if (t.includes('president')) {
        Manager.setMode('president');
      } else if (t.includes('house')) {
        Manager.setMode('house');
      } else if (t.includes('district view')) {
        Manager.setMode('none');
      }
    }catch(_){}
  }
  document.addEventListener('click', onClick, true);

  // Also watch for aria-selected tab changes (e.g., frameworks updating without a click on the label)
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      if (m.type === 'attributes' && m.target && m.target.getAttribute){
        const sel = m.target.getAttribute('aria-selected');
        if (sel === 'true'){
          const t = (m.target.textContent || '').trim().toLowerCase();
          if (t.includes('president')) Manager.setMode('president');
          else if (t.includes('house')) Manager.setMode('house');
          else if (t.includes('district view')) Manager.setMode('none');
        }
      }
    }
  });
  mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });

  // Lazy init if map appears later
  let tries = 0;
  (function waitMap(){
    tries++;
    if (Manager.ensureMap() && Manager.geojsonData && !Manager._ready) {
      Manager.buildLayer();
    }
    if (tries < 400) requestAnimationFrame(waitMap);
  })();

})();


;(()=>{
  // Advanced Voting Record footer — exact markup, appended at the very end of the card.
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvVoteviewFooterInstalled__) return;
  window.__AdvVoteviewFooterInstalled__ = true;

  const TEXT = 'Data from Voteview.com \u2022 Updated Weekly';

  function findAdvVotingCard(){
    const adv = document.getElementById('advCards');
    if (!adv) return null;
    const card = adv.querySelector('#adv-card-voting.card, #adv-card-voting');
    return card || null;
  }

  function ensureFooterAtEnd(card){
    if (!card) return;
    // Remove any non-advanced duplicates
    document.querySelectorAll('.data-note-votes').forEach(el => {
      if (!el.closest('#advCards')) el.remove();
    });
    // Create or reuse the exact footer element
    let foot = card.querySelector(':scope > .data-note-votes');
    if (!foot){
      foot = document.createElement('div');
      foot.className = 'muted data-note-votes';
      foot.style.marginTop = '10px';
      foot.style.textAlign = 'left';
      foot.textContent = TEXT;
    } else {
      // Ensure exact class/text/style
      foot.className = 'muted data-note-votes';
      foot.style.marginTop = '10px';
      foot.style.textAlign = 'left';
      if (foot.textContent !== TEXT) foot.textContent = TEXT;
    }
    // Keep it as the final child of the card
    if (foot.parentElement !== card || foot !== card.lastElementChild){
      card.appendChild(foot);
    }
  }

  function run(){
    const card = findAdvVotingCard();
    if (card){
      ensureFooterAtEnd(card);
      // Watch that single card for children being added; keep footer last
      if (!card.__advFooterObserver){
        const mo = new MutationObserver(() => ensureFooterAtEnd(card));
        mo.observe(card, { childList: true });
        card.__advFooterObserver = mo;
      }
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else {
    run();
  }

  // In case #advCards is created after load, watch for it
  const moDoc = new MutationObserver(() => {
    const adv = document.getElementById('advCards');
    if (adv){
      run();
      // Observe #advCards for card mutations too
      const mo = new MutationObserver(run);
      mo.observe(adv, { childList: true, subtree: true });
      moDoc.disconnect();
    }
  });
  moDoc.observe(document.documentElement, { childList: true, subtree: true });
})();


;(()=>{
  // Increase all Leaflet map heights by 50% (idempotent, all tabs).
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvMapHeight15__) return;
  window.__AdvMapHeight15__ = true;

  function targetHeightPx(el){
    // Base height measured once per element
    const ds = el.dataset;
    if (!ds.advBaseHeightPx){
      let base = 0;
      const cs = getComputedStyle(el);
      const csH = parseFloat(cs.height) || 0;
      const rectH = el.getBoundingClientRect().height || 0;
      base = Math.max(csH, rectH);
      // Reasonable fallback if collapsed or zero
      if (!base || base < 80) base = 300;
      ds.advBaseHeightPx = String(Math.round(base));
    }
    const basePx = parseFloat(ds.advBaseHeightPx) || 300;
    return Math.round(basePx * 1.5);
  }

  function bumpAll(){
    const maps = document.querySelectorAll('.leaflet-container');
    let changed = 0;
    maps.forEach(el => {
      try{
        const tgt = targetHeightPx(el);
        const cur = parseFloat((getComputedStyle(el).height || '0').replace('px','')) || 0;
        if (Math.abs(cur - tgt) > 1){
          el.style.height = tgt + 'px';
          el.style.minHeight = tgt + 'px';
          changed++;
        }
      }catch(_){}
    });
    if (changed){
      // Nudge Leaflet to recalc sizes
      requestAnimationFrame(()=>{
        try{
          if (window.map && typeof window.map.invalidateSize === 'function'){
            window.map.invalidateSize(true);
          }
        }catch(_){}
        try{ window.dispatchEvent(new Event('resize')); }catch(_){}
      });
    }
  }

  function run(){
    bumpAll();
    // run again shortly in case layout sizes settle
    setTimeout(bumpAll, 80);
    setTimeout(bumpAll, 160);
    requestAnimationFrame(bumpAll);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else {
    run();
  }

  // Observe DOM for tab/view changes
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      if (m.type === 'childList' && m.addedNodes && m.addedNodes.length){
        run();
        break;
      }
      if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')){
        run(); break;
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
})();


;(()=>{
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvDistrictInfoInsert__) return;
  window.__AdvDistrictInfoInsert__ = true;

  const NOTE_TEXT = 'Election map is experimental; there may be errors.';

  function findAdvContainer(){
    return document.getElementById('advCards') || null;
  }

  function findDistrictOfficesTitle(root){
    if (!root) return null;
    const heads = root.querySelectorAll('.section-title, h1, h2, h3, [role="heading"]');
    for (const h of heads){
      const t = (h.textContent || '').replace(/\s+/g,' ').trim();
      if (t === 'District Offices') return h;
    }
    // fallback: contains
    for (const h of heads){
      const t = (h.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
      if (t.includes('district offices')) return h;
    }
    return null;
  }

  function ensureDistrictInfoAbove(officesTitle){
    if (!officesTitle) return;
    const parent = officesTitle.parentElement || officesTitle.closest('.card, section, article, div') || officesTitle.parentNode;
    if (!parent || !parent.insertBefore) return;

    // Check if we've already inserted
    const existingInfo = parent.querySelector(':scope > .section-title[data-adv-dinfo="1"]');
    const existingNote = parent.querySelector(':scope > .muted.data-note-votes[data-adv-dinfo="1"]');
    if (existingInfo && existingNote){
      // Make sure they are directly above officesTitle (in right order)
      if (existingInfo.nextElementSibling !== officesTitle){
        parent.insertBefore(existingInfo, officesTitle);
      }
      if (existingNote.nextElementSibling !== existingInfo){
        parent.insertBefore(existingNote, existingInfo);
      }
      return;
    }

    // Create the muted note (same style as Voteview footer)
    const note = existingNote || (()=>{
      const d = document.createElement('div');
      d.className = 'muted data-note-votes';
      d.setAttribute('data-adv-dinfo','1');
      d.style.marginTop = '10px';
      d.style.textAlign = 'left';
      d.textContent = NOTE_TEXT;
      return d;
    })();

    // Create the new section title
    const infoTitle = existingInfo || (()=>{
      const d = document.createElement('div');
      d.className = 'section-title';
      d.setAttribute('data-adv-dinfo','1');
      d.textContent = 'District Information';
      return d;
    })();

    // Insert in correct order: note above, then info title, then existing offices title
    parent.insertBefore(note, officesTitle);
    parent.insertBefore(infoTitle, officesTitle);
  }

  function run(){
    const adv = findAdvContainer();
    if (!adv) return;
    const offices = findDistrictOfficesTitle(adv);
    if (offices) ensureDistrictInfoAbove(offices);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else {
    run();
  }

  // Observe #advCards for dynamic updates and keep elements in place
  (function observe(){
    const adv = findAdvContainer();
    if (!adv) return;
    if (adv.__advDistrictInfoObs) return;
    const mo = new MutationObserver(()=>{
      run();
      // a couple retry passes for batched UI updates
      setTimeout(run, 60);
      setTimeout(run, 180);
      requestAnimationFrame(run);
    });
    mo.observe(adv, { childList: true, subtree: true });
    adv.__advDistrictInfoObs = mo;
  })();
})();


;(()=>{
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvDistrictInfoSpacing__) return;
  window.__AdvDistrictInfoSpacing__ = true;

  function styleExperimentalNote(){
    try{
      const nodes = document.querySelectorAll('#advCards .data-note-votes[data-adv-dinfo="1"]');
      nodes.forEach(el => {
        el.style.marginTop = '4px';    // reduced space above
        el.style.marginBottom = '16px';// increased space below
        el.style.textAlign = 'left';   // keep alignment consistent
      });
    }catch(_){}
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', styleExperimentalNote, { once:true });
  } else {
    styleExperimentalNote();
  }

  // Keep styles if DOM reflows or content is injected
  const adv = document.getElementById('advCards');
  if (adv && !adv.__advDInfoSpacingObs){
    const mo = new MutationObserver(styleExperimentalNote);
    mo.observe(adv, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style'] });
    adv.__advDInfoSpacingObs = mo;
  }
})();


;(()=>{
  // Advanced mode: rename "District Offices" → "Office Information"
  // Insert Website/Contact buttons + DC Office Phone directly below the title
  // Then insert the district office listing directly below those
  // Safe: single capped rAF retry, no heavy observers
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvOfficeInfoComboV2__) return;
  window.__AdvOfficeInfoComboV2__ = true;

  function getData(){
    try{
      if (typeof results!=='undefined' && results && results[0] && results[0].data) return results[0].data;
    }catch(_){}
    return (window.__memberData || window.memberData || window.member || {}) || {};
  }

  function findAdv(){ return document.getElementById('advCards'); }

  function findAndRenameTitle(root){
    if (!root) return null;
    var heads = root.querySelectorAll('.section-title, h1, h2, h3, [role="heading"]');
    var offices = null, officeInfo = null;
    for (var i=0;i<heads.length;i++){
      var t = (heads[i].textContent||'').replace(/\s+/g,' ').trim();
      if (t === 'District Offices'){ offices = heads[i]; break; }
      if (t === 'Office Information'){ officeInfo = heads[i]; }
    }
    if (offices){
      offices.textContent = 'Office Information';
      return offices;
    }
    if (officeInfo) return officeInfo;
    // fallback: contains (case-insensitive)
    for (var j=0;j<heads.length;j++){
      var s = (heads[j].textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if (s.indexOf('district offices')>=0){ heads[j].textContent = 'Office Information'; return heads[j]; }
      if (s.indexOf('office information')>=0) return heads[j];
    }
    return null;
  }

  function ensureContactBelowTitle(titleEl){
    var parent = titleEl && titleEl.parentElement;
    if (!parent) return {wrap:null, phone:null};

    // Buttons wrapper
    var wrap = document.getElementById('district-contact-btns');
    if (!wrap){
      wrap = document.createElement('div');
      wrap.id = 'district-contact-btns';
      wrap.className = 'row';
      wrap.style.display = 'none'; // toggled on when any link exists
      wrap.style.gap = '8px';
      wrap.style.marginTop = '6px';

      var w = document.createElement('a');
      w.id = 'btn-website';
      w.className = 'btn';
      w.target = '_blank'; w.rel = 'noopener noreferrer';
      w.textContent = 'Website';

      var c = document.createElement('a');
      c.id = 'btn-contact';
      c.className = 'btn';
      c.target = '_blank'; c.rel = 'noopener noreferrer';
      c.textContent = 'Contact';

      wrap.appendChild(w); wrap.appendChild(c);
      parent.insertBefore(wrap, titleEl.nextSibling);
    } else if (wrap.previousElementSibling !== titleEl){
      try{ parent.insertBefore(wrap, titleEl.nextSibling); }catch(_){}
    }

    // DC Office Phone line
    var phone = document.getElementById('office-phone-line');
    if (!phone){
      phone = document.createElement('div');
      phone.id = 'office-phone-line';
      phone.style.marginTop = '8px';
      phone.style.display = 'block';
      parent.insertBefore(phone, wrap.nextSibling);
    } else if (phone.previousElementSibling !== wrap){
      try{ parent.insertBefore(phone, wrap.nextSibling); }catch(_){}
    }

    return {wrap:wrap, phone:phone};
  }

  function ensureOfficeListAfter(wrap, phone, titleEl){
    var parent = titleEl && titleEl.parentElement;
    if (!parent) return null;
    var anchor = phone || wrap || titleEl;

    var block = document.getElementById('adv-office-list-block');
    if (!block){
      block = document.createElement('div');
      block.id = 'adv-office-list-block';
      block.style.marginTop = '8px';

      var none = document.createElement('div');
      none.id = 'office-list-none';
      none.className = 'muted';
      none.style.margin = '6px 0';
      none.textContent = 'No offices listed.';

      var list = document.createElement('div');
      list.id = 'office-list';

      var ctr = document.createElement('div');
      ctr.id = 'office-list-ctr';
      ctr.style.paddingTop = '8px';

      var btn = document.createElement('button');
      btn.id = 'office-list-toggle';
      btn.className = 'btn';
      ctr.appendChild(btn);

      block.appendChild(none);
      block.appendChild(list);
      block.appendChild(ctr);

      if (anchor.nextSibling) parent.insertBefore(block, anchor.nextSibling);
      else parent.appendChild(block);
    } else {
      // keep order
      if (block.previousElementSibling !== anchor){
        try{
          if (anchor.nextSibling) parent.insertBefore(block, anchor.nextSibling);
          else parent.appendChild(block);
        }catch(_){}
      }
    }
    return block;
  }

  function hydrate(){
    var adv = findAdv(); if (!adv) return false;
    var titleEl = findAndRenameTitle(adv); if (!titleEl) return false;

    var nodes = ensureContactBelowTitle(titleEl);
    var block = ensureOfficeListAfter(nodes.wrap, nodes.phone, titleEl); if (!block) return false;

    // hydrate contact buttons & phone
    var data = getData();
    var url = (data && data.contact && data.contact.url) ? String(data.contact.url) : '';
    var cf  = (data && data.contact && data.contact.contact_form) ? String(data.contact.contact_form) : '';

    var wBtn = document.getElementById('btn-website');
    var cBtn = document.getElementById('btn-contact');
    var any = false;
    if (wBtn){
      if (/^https?:\/\//i.test(url)){ wBtn.href = url; wBtn.style.display=''; any = true; }
      else { wBtn.style.display = 'none'; }
    }
    if (cBtn){
      if (/^https?:\/\//i.test(cf)){ cBtn.href = cf; cBtn.style.display=''; any = true; }
      else { cBtn.style.display = 'none'; }
    }
    nodes.wrap && (nodes.wrap.style.display = any ? '' : 'none');

    var phoneVal = (data && data.contact && data.contact.phone) ||
                   (data && data.identity && data.identity.contact && data.identity.contact.phone) || '';
    if (nodes.phone){
      if (phoneVal){
        nodes.phone.textContent = '';
        var b = document.createElement('strong'); b.textContent = 'DC Office Phone:';
        nodes.phone.appendChild(b);
        nodes.phone.appendChild(document.createTextNode(' ' + String(phoneVal)));
        nodes.phone.style.display = 'block';
      } else {
        nodes.phone.style.display = 'none';
      }
    }

    // hydrate office list
    var list = document.getElementById('office-list');
    var none = document.getElementById('office-list-none');
    var ctr  = document.getElementById('office-list-ctr');
    var btn  = document.getElementById('office-list-toggle');
    if (!list || !none || !ctr || !btn) return false;

    var officesAll = (data && Array.isArray(data.offices)) ? data.offices.slice() : [];
    var expanded = !!block.__expandedOffices;
    function render(){
      list.innerHTML = '';
      if (!officesAll.length){
        none.style.display = '';
        list.style.display = 'none';
        ctr.style.display = 'none';
        return;
      }
      var slice = expanded ? officesAll : officesAll.slice(0,3);
      slice.forEach(function(o){
        var city  = (o && o.city  || '').toString();
        var state = (o && o.state || '').toString();
        var zip   = (o && (o.zip || o.zip5) || '').toString();
        var addr  = (o && o.address || '').toString();
        var suite = (o && o.suite   || '').toString();
        var phone = (o && o.phone   || '').toString();

        var item = document.createElement('div');
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

        if (phone){
          var line3 = document.createElement('div');
          line3.textContent = phone;
          item.appendChild(line3);
        }

        list.appendChild(item);
      });
      list.style.display = '';

      if (officesAll.length > 3){
        ctr.style.display = '';
        btn.textContent = expanded ? 'Show less' : 'Show more';
      } else {
        ctr.style.display = 'none';
      }
      none.style.display = 'none';
    }
    btn.onclick = function(e){ e.preventDefault(); expanded = !expanded; block.__expandedOffices = expanded; render(); };
    render();

    return true;
  }

  function run(){
    var tries = 0;
    (function tick(){
      if (hydrate()) return;
      if (++tries > 160) return;
      requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
})();


;(()=>{
  // Advanced Mode — District Information Dials (party-colored arcs, labels use class="label" only)
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvDistrictDialsResetPartyV2__) return;
  window.__AdvDistrictDialsResetPartyV2__ = true;

  function getMemberData(){
    try{ if (typeof data !== 'undefined' && data) return data; }catch(_){}
    return (window.__memberData || window.memberData || window.member || {}) || {};
  }

  function partyColor(d){
    var p = (d && (d.party || (d.identity && d.identity.party) || d.party_affiliation || d.partisan)) || '';
    p = String(p||'').trim().toLowerCase();
    if (p.startsWith('r')) return '#dc2626';    // red for Republicans
    return '#2563eb';                           // blue for Democrats/Independents/unknown
  }

  function findAdv(){ return document.getElementById('advCards'); }

  function findDistrictInfoTitle(root){
    if (!root) return null;
    var marked = root.querySelector('.section-title[data-adv-dinfo="1"]');
    if (marked) return marked;
    var heads = root.querySelectorAll('.section-title, h1, h2, h3, [role="heading"]');
    for (var i=0;i<heads.length;i++){
      var t=(heads[i].textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if (t==='district information') return heads[i];
    }
    for (var j=0;j<heads.length;j++){
      var s=(heads[j].textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if (s.indexOf('district information')>=0) return heads[j];
    }
    return null;
  }

  function ensureContainerAfterTitle(titleEl){
    var parent = titleEl && titleEl.parentElement;
    if (!parent) return null;
    var slot = document.getElementById('adv-district-dials');
    if (!slot){
      slot = document.createElement('div');
      slot.id = 'adv-district-dials';
      slot.style.display = 'grid';
      slot.style.gridTemplateColumns = 'repeat(3, minmax(180px, 1fr))';
      slot.style.gap = '16px';
      slot.style.margin = '8px 0 8px';
      slot.style.gridColumn = '1 / -1';
      if (titleEl.nextSibling) parent.insertBefore(slot, titleEl.nextSibling);
      else parent.appendChild(slot);
    } else {
      if (slot.previousElementSibling !== titleEl){
        if (titleEl.nextSibling) parent.insertBefore(slot, titleEl.nextSibling);
        else parent.appendChild(slot);
      }
      slot.innerHTML = '';
    }
    try{
      var ord = parseFloat(getComputedStyle(titleEl).order || '0') || 0;
      slot.style.order = String(ord + 1);
    }catch(_){}
    return slot;
  }

  function normPct(val){
    var n = Number(val);
    if (!isFinite(n)) return null;
    if (Math.abs(n) <= 1) n = n * 100; // accept proportions
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  }

  // Fallback dial renderer (passes color) — labels created with class="label" and no inline styles.
  function renderDialCompat(container, valuePct, centerText, label, tooltip, strokeColor){
    var size=120, stroke=12, r=(size/2)-stroke, C=2*Math.PI*r;
    var pct=(valuePct==null||isNaN(valuePct))?0:Math.max(0,Math.min(100,Number(valuePct)));
    var offset=C*(1-pct/100);
    var wrap=document.createElement('div'); wrap.className='dial'; if(tooltip) wrap.title=tooltip;
    var color=strokeColor||'#2563eb';
    var svg = ''
      + '<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="'+(label||'')+'">'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="#e5e7eb" stroke-width="'+stroke+'"></circle>'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+stroke+'" stroke-linecap="round"'
      +           ' stroke-dasharray="'+C+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 '+(size/2)+' '+(size/2)+')"></circle>'
      +   '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="800">'+centerText+'</text>'
      + '</svg>';
    var labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = label||'';
    wrap.innerHTML = svg;
    wrap.appendChild(labelDiv);
    container.appendChild(wrap);
  }

  function normalizeLabels(slot){
    // Convert any heading-like label to a simple .label element and remove inline styles
    var nodes = slot.querySelectorAll('.dial .section-title, .dial [role="heading"], .dial .dial-label, .dial .label');
    nodes.forEach(function(n){
      if (n.classList){
        n.className = 'label';
      }
      if (n.removeAttribute){
        n.removeAttribute('role');
        n.removeAttribute('style');
      }
    });
  }

  function render(){
    var adv = findAdv(); if (!adv) return false;
    var title = findDistrictInfoTitle(adv); if (!title) return false;
    var slot = ensureContainerAfterTitle(title); if (!slot) return false;

    var member = getMemberData() || {};
    var d = member.district || member.district_info || {};
    var color = partyColor(member);

    function getPath(obj, path){
      try{ var cur=obj; for (var i=0;i<path.length;i++){ if (cur==null) return null; cur=cur[path[i]]; } return cur; }catch(_){ return null; }
    }

    var specs = [
      { path: ['race','white'], invert: true,  label: 'Non-White Population' },
      { path: ['age','under_18'], invert: false, label: 'Minor Population' },
      { path: ['income','200k_plus'], invert: false, label: '>$200k Income Population' },
      { path: ['education','bachelors_plus'], invert: false, label: 'Degreed Population' },
      { path: ['unemployment_percent'], invert: false, label: 'Unemployed Population' },
      { path: ['health_insurance_percent'], invert: true,  label: 'Uninsured Population' }
    ];

    var useRender = (typeof window.renderDial === 'function') ? window.renderDial : renderDialCompat;

    specs.forEach(function(sp){
      var raw = getPath(d, sp.path);
      if (raw==null && sp.path.length===1){ raw = d[sp.path[0]]; }
      var pct = normPct(raw); if (pct==null) pct = 0;
      if (sp.invert) pct = Math.max(0, Math.min(100, 100 - pct));
      var center = (isFinite(pct) ? Math.round(pct) + '%' : '—');
      var cell = document.createElement('div');
      cell.style.display='flex'; cell.style.justifyContent='center'; cell.style.alignItems='center'; cell.style.padding='6px 0';
      // pass party color as 6th param
      useRender(cell, pct, center, sp.label, null, color);
      slot.appendChild(cell);
    });

    // Ensure labels are simple .label elements
    normalizeLabels(slot);
    return true;
  }

  function run(){
    var tries = 0;
    (function tick(){
      if (render()) return;
      if (++tries > 160) return;
      requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
})();


;(()=>{
  // Mobile-responsiveness shim for the six dials:
  // - Keep three columns but allow them to shrink
  // - Scale SVG dials down on small screens so they fit side-by-side
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvDistrictDialsMobileV1__) return;
  window.__AdvDistrictDialsMobileV1__ = true;

  function addResponsiveCSS(){
    if (document.getElementById('adv-dials-responsive-css')) return;
    var css = ""
      + "#adv-district-dials{grid-template-columns:repeat(3, minmax(0, 1fr)) !important;}"
      + "#adv-district-dials .dial{display:flex;flex-direction:column;align-items:center;}"
      + "#adv-district-dials .dial svg{width:100% !important;height:auto !important;max-width:120px;}"
      + "@media (max-width: 680px){"
      + "  #adv-district-dials{gap:10px;}"
      + "  #adv-district-dials .dial svg{max-width:84px;}"
      + "}";
    var s = document.createElement('style');
    s.id = 'adv-dials-responsive-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function applyOnce(){
    var slot = document.getElementById('adv-district-dials');
    if (!slot) return false;
    // Ensure grid can shrink to fit three side-by-side
    slot.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    return true;
  }

  function run(){
    addResponsiveCSS();
    var tries = 0;
    (function tick(){
      if (applyOnce()) return;
      if (++tries > 120) return;
      requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
})();


;(()=>{
  // Responsive update: collapse dials to 2 per row on mobile.
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AdvDistrictDialsMobileV2__) return;
  window.__AdvDistrictDialsMobileV2__ = true;

  function replaceResponsiveCSS(){
    // Remove old style (if present)
    var old = document.getElementById('adv-dials-responsive-css');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    // Add new style
    var css = ""
      + "#adv-district-dials{grid-template-columns:repeat(3, minmax(0, 1fr)); gap:16px;}"
      + "#adv-district-dials .dial{display:flex;flex-direction:column;align-items:center;}"
      + "#adv-district-dials .dial svg{width:100%;height:auto;max-width:120px;}"
      + "@media (max-width: 640px){"
      + "  #adv-district-dials{grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px;}"
      + "  #adv-district-dials .dial svg{max-width:96px;}"
      + "}";
    var s = document.createElement('style');
    s.id = 'adv-dials-responsive-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function clearInlineToAllowCSS(){
    var slot = document.getElementById('adv-district-dials');
    if (!slot) return false;
    // Clear inline gridTemplateColumns so media queries can override
    try{ slot.style.gridTemplateColumns = ''; }catch(_){}
    return true;
  }

  function run(){
    replaceResponsiveCSS();
    var tries = 0;
    (function tick(){
      if (clearInlineToAllowCSS()) return;
      if (++tries > 120) return;
      requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
})();


;(()=>{
  if (typeof window==='undefined' || typeof document==='undefined') return;
  if (window.__ADV_SIG_FIN_V3__) return; window.__ADV_SIG_FIN_V3__=true;

  // ---------- Data helpers ----------
  function pickFirstDefined() {
    for (var i=0; i<arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }
  function getRootData(){
    try{ if (typeof data !== 'undefined' && data) return data; }catch(_){}
    if (Array.isArray(window.results) && window.results[0] && window.results[0].data) return window.results[0].data;
    if (window.__memberData) return window.__memberData;
    if (window.memberData) return window.memberData;
    if (window.member) return window.member;
    return null;
  }
  function deepFindArrays(obj, predicate, maxDepth){
    var out = [];
    function rec(o, depth){
      if (!o || typeof o!=='object' || depth>maxDepth) return;
      if (Array.isArray(o)){
        try{ if (predicate(o)) out.push(o); }catch(_){}
      } else {
        for (var k in o){
          if (!Object.prototype.hasOwnProperty.call(o,k)) continue;
          var v = o[k];
          if (v && typeof v === 'object') rec(v, depth+1);
        }
      }
    }
    rec(obj, 0);
    return out;
  }
  function scoreBillsArray(arr){
    if (!Array.isArray(arr) || arr.length===0) return -1;
    var score = 0, seen = 0;
    for (var i=0;i<Math.min(arr.length, 25); i++){
      var it = arr[i] || {};
      if (typeof it !== 'object') continue;
      seen++;
      if ('title' in it || 'shortTitle' in it) score += 3;
      if ('introducedDate' in it) score += 2;
      if ('number' in it || 'bill' in it) score += 2;
      if ('cosponsors' in it) score += 1;
      if ('policy_area' in it) score += 1;
    }
    return (seen>0 ? score : -1);
  }
  function findBillsArray(member){
    var cand = pickFirstDefined(member && member.bills, member && member.bills_all, member && member.bills_recent, member && member.sponsored_bills);
    if (Array.isArray(cand) && cand.length) return cand;
    var arrays = deepFindArrays(member, function(a){
      if (!Array.isArray(a) || a.length===0) return false;
      var good = 0, test = Math.min(a.length, 5);
      for (var i=0;i<test;i++){
        var x = a[i] || {};
        if (x && typeof x==='object' && ('introducedDate' in x || 'title' in x || 'number' in x || 'bill' in x)) good++;
      }
      return good>=2;
    }, 3);
    if (!arrays.length) return [];
    arrays.sort(function(a,b){ return scoreBillsArray(b) - scoreBillsArray(a); });
    return arrays[0];
  }
  function findFEC(member){
    var fec = pickFirstDefined(member && member.fec, member && member.campaign_finance, member && member.finance, member && member.fec_current);
    function looksGood(o){ return !!(o && (o.totals || o.top_contributors || o.top_organizations)); }
    if (looksGood(fec)) return fec;
    var found = null;
    try{
      var keys = Object.keys(member||{});
      for (var i=0;i<keys.length;i++){
        var v = member[keys[i]];
        if (looksGood(v)) { found = v; break; }
      }
    }catch(_){}
    return found;
  }

  // ---------- UI helpers ----------
  function byId(id){ return document.getElementById(id); }
  function ensureBody(cardId, bodyId){
    var card = byId(cardId); if (!card) return null;
    var title = card.querySelector('.section-title');
    var body = card.querySelector('#'+bodyId);
    if (!body){
      body = document.createElement('div'); body.id = bodyId;
      if (title) title.insertAdjacentElement('afterend', body); else card.appendChild(body);
    }
    return body;
  }
  function partyLetter(p){ p=String(p||'').toUpperCase(); return p[0]==='R'?'R':(p[0]==='D'?'D':'I'); }
  function partyNoun(letter){ return letter==='R'?'Republicans':(letter==='D'?'Democrats':'Independents'); }
  function partyColor(p){ return partyLetter(p)==='R'?'#dc2626':'#2563eb'; }
  function renderDialCompat(container, valuePct, centerText, label, tooltip, strokeColor){
    var size=120, stroke=12, r=(size/2)-stroke, C=2*Math.PI*r;
    var pct=(valuePct==null||isNaN(valuePct))?0:Math.max(0,Math.min(100,Number(valuePct)));
    var offset=C*(1-pct/100);
    var wrap=document.createElement('div'); wrap.className='dial'; if(tooltip) wrap.title=tooltip;
    var color=strokeColor||'#2563eb';
    var svg = ''
      + '<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="'+(label||'')+'">'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="#e5e7eb" stroke-width="'+stroke+'"></circle>'
      +   '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+stroke+'" stroke-linecap="round"'
      +           ' stroke-dasharray="'+C+'" stroke-dashoffset="'+offset+'" transform="rotate(-90 '+(size/2)+' '+(size/2)+')"></circle>'
      +   '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="800">'+centerText+'</text>'
      + '</svg>';
    var labelDiv = document.createElement('div'); labelDiv.className='label'; labelDiv.textContent=label||'';
    wrap.innerHTML = svg; wrap.appendChild(labelDiv); container.appendChild(wrap);
  }

  // ---------- Signature Work ----------
  var __sigworkBuilt = false;
  function renderSignatureWork(){ if (__sigworkBuilt) return true;
    var body = ensureBody('adv-card-sigwork', 'adv-sigwork-body'); if (!body) return false;
    var member = getRootData(); if (!member) return false;

    // Helper: render 'Top cosponsors' list + data note (idempotent)
    
function __renderTopCosponsorsSW(){
  try{
    var body = byId('adv-sigwork-body');
    if(!body) return;
    // Build line once
    var line = body.querySelector('.sw-cosponsors');
    if(!line){
      line = document.createElement('div');
      line.className = 'sw-cosponsors';
      line.style.marginTop = '8px';
      var label = document.createElement('span');
      label.style.fontWeight = '700';
      label.textContent = 'Top cosponsors: ';
      var names = document.createElement('span');
      names.className = 'sw-cosponsors-names';
      names.textContent = '—';
      line.appendChild(label); line.appendChild(names);
      body.appendChild(line);
    }
    var namesEl = line.querySelector('.sw-cosponsors-names');

    // Pull member & cosponsors (try multiple shapes; we will also compute counts from bills)
    var m = getRootData() || {};

    // Count cosponsors across bills to get a reliable COUNT for each bioguide
    function __countCosponsorsFromBills(mm){
      try{
        var bills = (Array.isArray(mm.bills) ? mm.bills : (Array.isArray((mm.legislation||{}).bills) ? mm.legislation.bills : []));
        var counts = Object.create(null);
        var labels = Object.create(null);
        for (var b=0;b<bills.length;b++){
          var cs = bills[b] && bills[b].cosponsors; if(!Array.isArray(cs)) continue;
          for (var j=0;j<cs.length;j++){
            var it = cs[j]||{};
            var bg = it.bioguide || it.bioguide_id || it.id || (it.member && (it.member.bioguide || it.member.bioguide_id || it.member.id));
            if (!bg) continue;
            counts[bg] = (counts[bg]||0)+1;
            // keep a loose fallback label per bioguide (used only if YAML fails)
            labels[bg] = labels[bg] || (it.name || it.member || it.display || ((it.first&&it.last)? (it.first+' '+it.last):''));
          }
        }
        return {counts:counts, labels:labels};
      }catch(_){ return {counts:{}, labels:{}}; }
    }
    var cnt = __countCosponsorsFromBills(m);

    // Start list from data if present; otherwise derive from counts
    var cos = m.cosponsors_top_latest || (m.legislation && m.legislation.cosponsors_top_latest) || m.cosponsors_top || [];
    if (!Array.isArray(cos) || !cos.length){
      var arr=[]; for (var key in cnt.counts){ arr.push({bioguide:key, count:cnt.counts[key], name:cnt.labels[key]||''}); }
      arr.sort(function(a,b){ return (b.count||0)-(a.count||0); });
      cos = arr.slice(0, 10);
    }

    // YAML Name Index (robust, no dependency on external helpers)
    function __buildYAMLIndex(txt){
      try{
        if (!txt || typeof txt !== 'string') return {};
        if (window.__ADV_BG_NAME_IDX) return window.__ADV_BG_NAME_IDX;
        var idx = Object.create(null);

        // Find each 'bioguide: XYZ', then scan forward in that block for names.
        var reBG = /bioguide:\s*([A-Za-z0-9]+)/g, mBG;
        while ((mBG = reBG.exec(txt))){
          var bg = String(mBG[1]).trim();
          var start = mBG.index;
          var windowEnd = Math.min(txt.length, start + 4000); // generous window
          var block = txt.slice(start, windowEnd);

          // Helper to capture quoted OR unquoted YAML values (stop at newline or '#')
          function getField(re){
            var m = re.exec(block);
            if (!m) return '';
            return (m[1] || m[2] || m[3] || '').trim();
          }

          var reFull    = /official_full:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i;
          var reFirst   = /first:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i;
          var reMiddle  = /middle:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i;
          var reLast    = /last:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i;
          var reSuffix  = /suffix:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i;
          var reNick    = /nickname:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i;

          var name = getField(reFull);
          if (!name){
            var first  = getField(reFirst);
            var middle = getField(reMiddle);
            var last   = getField(reLast);
            var suffix = getField(reSuffix);
            var nick   = getField(reNick);
            var parts = [];
            if (first)  parts.push(first);
            if (middle) parts.push(middle);
            if (last)   parts.push(last);
            if (suffix) parts.push(suffix);
            name = parts.join(' ').replace(/\s+/g,' ').trim();
            if (!name && nick && last) name = (nick + ' ' + last).trim();
          }

          if (name){
            idx[bg] = name;
            idx[String(bg).toUpperCase()] = name; // also store uppercase key
          }
        }
        window.__ADV_BG_NAME_IDX = idx;
        return idx;
      }catch(_){ return {}; }
    }
function __yamlName(bg){
      try{
        if (!bg) return '';
        var txt = String(window.__ADV_YAML_TEXT || '');
        if (!txt) return '';
        var idx = __buildYAMLIndex(txt);
        var key=String(bg).trim(); var nm = idx[key] || idx[key.toUpperCase()] || '';
        if (nm) return nm;
        // Last-resort localized search
        try {
          var esc = key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          var m = new RegExp('bioguide:\\s*' + esc).exec(txt);
          if (m){
            var block = txt.slice(m.index, Math.min(txt.length, m.index+4000));
            var mFull = /official_full:\s*(?:\"([^\"]+)\"|'([^']+)'|([^\n#]+))/i.exec(block);
            if (mFull) return (mFull[1]||mFull[2]||mFull[3]||'').trim();
          }
        } catch(_){}
        return '';
      }catch(_){ return ''; }
    }
    function __getBG(it){
      if (!it || typeof it === 'string') return null;
      return it.bioguide || it.bioguide_id || it.id || (it.member && (it.member.bioguide || it.member.bioguide_id || it.member.id)) || null;
    }
    function __fallbackLabel(it){
      if (typeof it === 'string') return it;
      return (it && (it.name || it.member || it.display || ((it.first && it.last)? (it.first+' '+it.last) : ''))) || '';
    }

    // Build labels as "NAME (COUNT)"
    var labels = [];
    for (var i2=0;i2<cos.length;i2++){
      var it = cos[i2]; if (!it) continue;
      var bg = __getBG(it);
      var nm = __yamlName(bg) || __fallbackLabel(it);
      var c = (bg && cnt.counts[bg]) || it.count || it.total || 0;
      if (!c && Array.isArray(m.bills)) c = 0; // keep 0 if we didn't see them in bills
      if (nm){
        labels.push(c ? (nm + ' (' + c + ')') : nm);
      }
    }

    // Render with identical UX to "Similar ideologies"
    if (typeof _wireShowToggle === 'function'){
      _wireShowToggle({ root: line, namesEl: namesEl, items: labels, limitClosed: 3, limitOpen: 10, mutedClass: 'muted' });
    } else {
      namesEl.textContent = (labels.slice(0,3).join(', ')) || '—';
      var toggle = line.querySelector('.sw-cosponsors-toggle');
      if (!toggle){
        var spacer=document.createElement('span'); spacer.className='sw-cosponsors-spacer'; spacer.setAttribute('aria-hidden','true'); spacer.textContent='  ';
        toggle=document.createElement('span'); toggle.className='muted sw-cosponsors-toggle'; toggle.style.cursor='pointer';
        line.appendChild(spacer); line.appendChild(toggle);
      }
      var expanded=false;
      function redraw(){ var items = expanded ? labels.slice(0,10) : labels.slice(0,3); namesEl.textContent=(items.join(', '))||'—'; toggle.textContent = labels.length>3 ? (expanded?'Show less':'Show more') : ''; }
      toggle.onclick=function(e){ e.preventDefault(); expanded=!expanded; redraw(); }; redraw();
    }

    // Data note (once)
    if (!body.querySelector('.sw-data-note')){
      var note=document.createElement('div'); note.className='muted sw-data-note'; note.style.marginTop='6px'; note.textContent='Data from Congress.gov • Updated Monthly'; body.appendChild(note);
    }
  }catch(_){}
}

    var billsAll = findBillsArray(member);
    var ws = (member && member.work_statistics) || {};
    var id = (member && member.identity) || {};
    var pLetter = partyLetter(id.party);
    var colorParty = partyColor(id.party);

    if (!Array.isArray(billsAll) || billsAll.length===0){ try{ __renderTopCosponsorsSW(); __sigworkBuilt = true; }catch(_){ } return true; }

    // clear placeholders
    Array.from(body.parentElement.querySelectorAll('.muted')).forEach(function(n){
      if ((n.textContent||'').toLowerCase().indexOf('advanced')===0) n.remove();
    });
    body.innerHTML='';

    // dials
    var dialsWrap = document.createElement('div'); dialsWrap.id='adv-sigwork-dials'; dialsWrap.className='grid two'; body.appendChild(dialsWrap);
    function toNum(x){ var n=Number(x); return isNaN(n)?0:n; }
    var total = toNum(ws.total_hr_sr);
    var passed = toNum(ws.total_hr_sr_became_public_law);
    var bipart = toNum(ws.total_hr_sr_bipartisan);
    var pctPassed = total>0 ? (passed/total)*100 : NaN;
    var pctBipart = total>0 ? (bipart/total)*100 : NaN;
    var useDial = (typeof window.renderDial === 'function') ? window.renderDial : renderDialCompat;
    useDial(dialsWrap, isNaN(pctPassed)?NaN:Math.round(pctPassed), String(passed), 'Bills Passed', 'HR+SR became law / Total HR+SR', colorParty);
    useDial(dialsWrap, isNaN(pctBipart)?NaN:Math.round(pctBipart), String(bipart), 'Bipartisan Bills Sponsored', 'Bipartisan HR+SR / Total HR+SR', colorParty);

    if (total>0){
      var dials = dialsWrap.querySelectorAll('.dial');
      if (dials.length>=2){
        var dialPassed = dials[dials.length-2];
        var dialBip = dials[dials.length-1];
        var sub1 = document.createElement('div'); sub1.className='muted'; sub1.textContent = (isNaN(pctPassed)?'':(String(Math.round(pctPassed))+'% of bills sponsored passed')); dialPassed.appendChild(sub1);
        var pEff = (typeof ws.passed_rate_percentile_party === 'number') ? ws.passed_rate_percentile_party : null;
        if (pEff!=null){
          var sub1b=document.createElement('div'); sub1b.className='muted';
          var partyWord = partyNoun(pLetter);
          sub1b.textContent = (pEff<50) ? ('Less effective than '+String(Math.round(100-pEff))+'% of '+partyWord) : ('More effective than '+String(Math.round(pEff))+'% of '+partyWord);
          dialPassed.appendChild(sub1b);
        }
        var sub2=document.createElement('div'); sub2.className='muted'; sub2.textContent = (isNaN(pctBipart)?'':(String(Math.round(pctBipart))+'% of bills sponsored were bipartisan')); dialBip.appendChild(sub2);
        var pBip = (typeof ws.bipartisan_rate_percentile_party === 'number') ? ws.bipartisan_rate_percentile_party : null;
        if (pBip!=null){
          var sub2b=document.createElement('div'); sub2b.className='muted';
          var partyWord2 = partyNoun(pLetter);
          sub2b.textContent = (pBip<50) ? ('Less bipartisan than '+String(Math.round(100-pBip))+'% of '+partyWord2) : ('More bipartisan than '+String(Math.round(pBip))+'% of '+partyWord2);
          dialBip.appendChild(sub2b);
        }
      }
    }

    // sponsored bills list
    billsAll.sort(function(a,b){
      var ad=Date.parse(a && a.introducedDate || '')||0;
      var bd=Date.parse(b && b.introducedDate || '')||0;
      return bd - ad;
    });
    var policyAreas = Array.from(new Set(billsAll.map(function(b){ return String(b && b.policy_area || '').trim(); }).filter(Boolean))).sort();

    
    // --- Sponsored Bills list (Basic parity, self-contained) ---
    // Title row with Filter button (right aligned)
    var sbTitle = document.createElement('div'); 
    sbTitle.className='section-title'; 
    sbTitle.style.display='flex'; 
    sbTitle.style.alignItems='center'; 
    sbTitle.style.gap='8px'; 
    sbTitle.textContent='Sponsored Bills';
    var filterBtn = document.createElement('button'); 
    filterBtn.className='btn'; 
    filterBtn.textContent='Filter'; 
    filterBtn.style.marginLeft='auto'; 
    sbTitle.appendChild(filterBtn);
body.appendChild(sbTitle);

    // Build list container with Basic's id/class
    var billsWrap = document.createElement('div'); 
    billsWrap.id='sponsored-bills'; 
    billsWrap.className='stack'; 
    body.appendChild(billsWrap);
    // Compute unique policy areas (skip blanks), sorted
    var policyAreas = Array.from(
      new Set(
        billsAll.map(function(b){ return String(b && b.policy_area || '').trim(); }).filter(function(s){ return !!s; })
      )
    ).sort();

    // Popover for filter
    var pop = document.createElement('div'); 
    pop.style.position='fixed'; 
    pop.style.zIndex='10000'; 
    pop.style.background='#fff'; 
    pop.style.border='1px solid var(--border)'; 
    pop.style.borderRadius='12px'; 
    pop.style.boxShadow='0 8px 20px rgba(0,0,0,.08)'; 
    pop.style.padding='10px'; 
    pop.style.minWidth='260px'; 
    pop.style.maxWidth='min(96vw, 420px)'; 
    pop.style.display='none'; 
    document.body.appendChild(pop);

    // Popover contents
    pop.innerHTML = ''; 
    var title = document.createElement('div'); 
    title.style.fontWeight='700'; 
    title.style.marginBottom='6px'; 
    title.textContent='Filter by policy area'; 
    pop.appendChild(title);

    var search = null, chipWrap = null;
    if (true) {
      search = document.createElement('input'); 
      search.type='search'; 
      search.placeholder='Search areas…'; 
      search.style.width='100%'; 
      search.style.padding='8px 10px'; 
      search.style.border='1px solid var(--border)'; 
      search.style.borderRadius='8px'; 
      search.style.marginBottom='8px'; 
      pop.appendChild(search);

      chipWrap = document.createElement('div'); 
      chipWrap.style.display='flex'; 
      chipWrap.style.flexWrap='wrap'; 
      chipWrap.style.gap='8px'; 
      chipWrap.style.maxHeight='240px'; 
      chipWrap.style.overflow='auto'; 
      pop.appendChild(chipWrap);
    }

    var activePolicy = null; // null = no filter
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
      } else {
        // reset potential previous styles when re-rendering
        c.style.background = '';
        c.style.boxShadow = '';
        c.style.fontWeight = '';
        c.style.outline = '';
      }
      c.addEventListener('click', function(e){
        e.preventDefault();
        if (label === '(All)') {
          activePolicy = null;
        } else {
          activePolicy = label;
        }
        renderSponsoredBills();
        // Re-render chips so emphasis moves to the selected one
        try { renderChips(search ? search.value : ''); } catch(_) {}
      });
      return c;
    }
    function renderChips(q){ 
      if (!chipWrap) return;
      chipWrap.innerHTML=''; 
      var qry = (q||'').toLowerCase().trim();
      chipWrap.appendChild(makeChip('(All)', activePolicy===null));
      policyAreas.filter(function(a){ return !qry || a.toLowerCase().indexOf(qry)!==-1; })
                 .forEach(function(a){ chipWrap.appendChild(makeChip(a, activePolicy===a)); });
    }
    function showPop(btn){ var r=btn.getBoundingClientRect(); pop.style.left=r.left+'px'; pop.style.top=(r.bottom+6)+'px'; pop.style.display='block'; }
    function hidePop(){ pop.style.display='none'; }

    filterBtn.addEventListener('click', function(e){ 
      e.preventDefault(); 
      
      if (pop.style.display==='block') hidePop(); 
      else { renderChips(''); showPop(filterBtn); } 
    });
    if (search){ search.addEventListener('input', function(){ renderChips(search.value); }); }

    // Expand/collapse state
    var expandedSB = false;
    var oldCtr=document.getElementById('sponsored-bills-ctr'); if(oldCtr&&oldCtr.closest&&oldCtr.closest('#advCards')) oldCtr.remove();
var ctrl=document.createElement('div'); ctrl.id='sponsored-bills-ctr'; ctrl.style.paddingTop='8px';
var btn=document.createElement('button'); btn.className='btn'; btn.textContent= expandedSB ? 'Show less' : 'Show more';
btn.addEventListener('click', function(e){ e.preventDefault(); expandedSB=!expandedSB; btn.textContent = expandedSB ? 'Show less' : 'Show more'; renderSponsoredBills(); });
ctrl.appendChild(btn);
if (billsWrap.parentNode) billsWrap.parentNode.insertBefore(ctrl, billsWrap.nextSibling);


    function fmtType(bt){
      bt = String(bt||'').toLowerCase();
      if (bt==='hr') return 'H.R.';
      if (bt==='sr') return 'S.R.';
      if (bt==='s') return 'S.';
      if (bt==='hres') return 'H.Res.';
      if (bt==='sres') return 'S.Res.';
      return bt.toUpperCase();
    }

    function renderSponsoredBills(){
      // keep ctrl visibility in sync
      ctrl.style.display = 'block';
      billsWrap.innerHTML='';
      var list = billsAll.filter(function(b){ 
        if (!activePolicy) return true; 
        var pa = String(b && b.policy_area || '').trim(); 
        return pa === activePolicy; 
      });

      var maxDefault = 3;
      var maxExpanded = 10;
      var show = list.slice(0, expandedSB ? Math.min(maxExpanded, list.length) : Math.min(maxDefault, list.length));
      // Show control only when there are more than default items
      if (list.length <= maxDefault){ ctrl.style.display='none'; expandedSB=false; btn.textContent='Show more'; btn.setAttribute('aria-expanded','false'); }
      else { ctrl.style.display='block'; }
      show.forEach(function(b){
        var type = fmtType(b && b.billType);
        var num  = String(b && (b.number || b.bill) || '');
        var date = String(b && b.introducedDate || '');
        var title= String(b && (b.title || b.title_raw || b.shortTitle) || '');
        var latest = '';
        if (b && b.latestAction){
          latest = typeof b.latestAction === 'string' ? b.latestAction : (b.latestAction.text || '');
        }
        var policyArea = String(b && b.policy_area || '').trim();
        var url = (b && (b.congressdotgovUrl || b.congressdotgov_url)) || '';

        var row = document.createElement('div');
        row.className='stack';
        row.style.borderTop='1px solid var(--border)';
        row.style.paddingTop='8px';

        // First line: TYPE NUM • DATE (+ pills)
        var head = document.createElement('div');
        var strong = document.createElement('strong');
        if (url){
          strong.textContent = type + (num ? (' ' + num) : '');
        } else {
          strong.textContent = type + (num ? (' ' + num) : '');
        }
        head.appendChild(strong);
        if (date){
          head.appendChild(document.createTextNode(' • '));
          var span = document.createElement('span'); span.className='muted';
          try { span.textContent = new Date(date).toLocaleDateString(); } catch(e){ span.textContent = String(date); }
          head.appendChild(span);
        }
        if (b && b.bipartisan === true){
          head.appendChild(document.createTextNode(' '));
          var bp = document.createElement('span'); 
          bp.className='pill P'; 
          bp.textContent = 'Bipartisan';
          head.appendChild(bp);
        }
        row.appendChild(head);

        // Second line: Title
        if (title){
          var line = document.createElement('div');
          line.style.textDecoration = 'none';
          line.textContent = title;
          row.appendChild(line);
        }

        // Third line: latest action
        if (latest){
          var meta = document.createElement('div');
          meta.className='muted';
          meta.textContent = 'Latest action: ' + latest;
          row.appendChild(meta);
        }

        // Fourth: Policy Area (neutral pill)
        if (policyArea){
          var subj = document.createElement('div');
          var pill = document.createElement('span');
          pill.className='pill N';
          pill.textContent = policyArea;
          subj.appendChild(pill);
          row.appendChild(subj);
        }

        billsWrap.appendChild(row);
      });

      if (list.length===0){
        var none = document.createElement('div'); none.className='muted'; none.textContent='No sponsored bills.'; billsWrap.appendChild(none);
      }
    }

    renderSponsoredBills();
    
    // --- Top Cosponsors line + note (Signature Work)
    try{ __renderTopCosponsorsSW(); }catch(_){}

 __sigworkBuilt = true;
return true;
  }

  // ---------- Campaign Finance Overview ----------
  function renderFinance(){
  if (window.__financeBuilt) return true;
// Ensure body + containers under the Advanced card
  var bodyNode = ensureBody('adv-card-finance', 'adv-finance-body'); if (!bodyNode) return false;
  // Remove placeholder text that says "Advanced ... will appear here."
  Array.from(bodyNode.parentElement.querySelectorAll('.muted')).forEach(function(n){
    var t=(n.textContent||'').toLowerCase();
    if (t.indexOf('advanced')===0) n.remove();
  });
  // Create our inner containers if not present
  var none = document.getElementById('adv-finance-none');
  if (!none) { none = document.createElement('div'); none.id='adv-finance-none'; none.className='muted'; none.textContent='No information available.'; bodyNode.appendChild(none); }
  var content = document.getElementById('adv-finance-content');
  if (!content) { content = document.createElement('div'); content.id='adv-finance-content'; bodyNode.appendChild(content); }
// Delegate finance toggle buttons to survive rerenders
if (!content.__financeDelegated){
  content.__financeDelegated = true;
  (function(){
    var lastTS = 0;
    function handleToggle(e){
      var el = e.target;
      if (el && el.nodeType !== 1) el = el.parentElement;
      var btn = el && el.closest ? el.closest('.finance-toggle-pacs, .finance-toggle-orgs') : null;
      if (!btn) return;
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(_){} }
      var now = Date.now(); if (now - lastTS < 200) return; lastTS = now;
      var x = window.scrollX||0, y = window.scrollY||0;
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(_){} }
      try{ btn.blur(); }catch(_){}
      if (btn.classList.contains('finance-toggle-pacs')){
        expanded = !expanded;
        renderPacs();
      } else {
        expanded2 = !expanded2;
        renderOrgs();
      }
      window.scrollTo(x,y);
    }
    content.addEventListener('pointerup', handleToggle, {passive:false});
    content.addEventListener('touchend', handleToggle, {passive:false});
    content.addEventListener('click', handleToggle, {passive:false});
  })();
}


  // Use the exact same rendering logic as Basic mode, pointed at our Advanced containers
  try {
    var data = getRootData();
    

        try {
    
          var financeNone = document.getElementById('adv-finance-none');
          var financeContent = document.getElementById('adv-finance-content');
          var fec = findFEC(data);
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
                btn.className = 'btn finance-toggle-pacs';
                btn.textContent = expanded ? 'Show less' : 'Show more';
                
    
    (function(){
      btn.setAttribute('role','button');
      btn.setAttribute('tabindex','0');
      var _last1=0;
      function on1(e){
        if(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } }
        var now = Date.now(); if (now - _last1 < 220) return; _last1 = now;
        var x = window.scrollX||0, y = window.scrollY||0;
        expanded = !expanded;
        renderPacs();
        window.scrollTo(x,y);
      }
      if (window.PointerEvent) { btn.addEventListener('pointerup', on1, {passive:false}); }
      btn.addEventListener('touchend', on1, {passive:false});
      btn.addEventListener('click', on1, {passive:false});
      btn.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); on1(e); } });
    })();
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

          // ----- Major Employers of Donors (with toggle styled like Key Votes) -----
          var nextTitle2 = document.createElement('div'); nextTitle2.className = 'section-title'; nextTitle2.style.marginTop='12px'; nextTitle2.textContent='Major Employers of Donors';
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
                
    
    (function(){
      btn2.setAttribute('role','button');
      btn2.setAttribute('tabindex','0');
      var _last2=0;
      function on2(e){
        if(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } }
        var now = Date.now(); if (now - _last2 < 250) return; _last2 = now;
        var x = window.scrollX||0, y = window.scrollY||0;
        expanded2 = !expanded2;
        renderOrgs();
        window.scrollTo(x, y);
      }
      if (window.PointerEvent) { btn2.addEventListener('pointerup', on2, {passive:false}); }
      btn2.addEventListener('touchend', on2, {passive:false});
      btn2.addEventListener('click', on2, {passive:false});
      btn2.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); on2(e); } });
    })();
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

          // Append data source footer to Campaign Finance card (once)
          try {
    
            var financeCard = document.getElementById('adv-card-finance');
            if (financeCard && !financeCard.querySelector('.data-note-finance')) {
              var f3 = document.createElement('div');
              f3.className = 'muted data-note-finance';
              f3.style.marginTop = '10px';
              f3.style.textAlign = 'left';
              f3.textContent = 'Data from FEC.gov • Updated Quarterly';
              financeCard.appendChild(f3);
            }
          } catch(e) { /* ignore */ }

        } catch (e) {
          if (window && window.console) console.warn('Finance render error:', e);
        }
      
  } catch(e){ /* non-fatal */ }
  window.__financeBuilt = true;
  return true;
}

  // ---------- Scheduler ----------
  (function run(){
    var attempts = 0;
    function tick(){
      var ok1 = renderSignatureWork();
      var ok2 = renderFinance();
      if (ok1 && ok2) return;
      if (++attempts > 300) return;
      requestAnimationFrame(tick);
    }
    tick();
    window.addEventListener('hashchange', function(){ window.__financeBuilt = false; setTimeout(function(){ attempts=0; tick(); }, 30); });
    var adv = document.getElementById('advCards');
    if (adv && !adv.__sigfinObs){
      var mo = new MutationObserver(function(){ setTimeout(function(){ attempts=0; tick(); }, 20); });
      mo.observe(adv, {childList:true, subtree:true});
      adv.__sigfinObs = mo;
    }
  })();
})();
