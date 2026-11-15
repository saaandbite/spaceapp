/**
 * page2.js — Treasure Map: Global & Indonesia Spatial Explorer
 * Uses Leaflet.js for interactive mapping
 */
(async function () {
  'use strict';

  const fetchJSON = window.fetchData;

  /* ---------- helpers ---------- */
  const MATERIAL_COLORS = {
    'Iron / Stony-Iron':      '#ff5252',
    'Achondrite':              '#ffab40',
    'Carbonaceous Chondrite':  '#69f0ae',
    'Ordinary Chondrite':      '#4fc3f7'
  };

  /** Format mass smartly */
  function fmtMass(kg) {
    if (kg >= 1000) return (kg / 1000).toFixed(1) + ' tonnes';
    if (kg >= 1) return kg.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' kg';
    return (kg * 1000).toFixed(1) + ' g';
  }

  /* ---------- load data ---------- */
  let pinsData, indoData, fireballsData, clustersData;
  try {
    [pinsData, indoData, fireballsData, clustersData] = await Promise.all([
      fetchJSON('map_pins.json'),
      fetchJSON('indonesia.json'),
      fetchJSON('fireballs.json'),
      fetchJSON('clusters.json')
    ]);
  } catch (err) {
    showLoadError(err);
    return;
  }

  /* Handle both array and {pins:[]} shapes */
  const pins = Array.isArray(pinsData) ? pinsData : (pinsData.pins || pinsData);

  /* ---------- map init ---------- */
  // centre at -20° so zoom 2 shows ~70°N down to Antarctica (where 71% of clean records are)
  const WORLD_VIEW = [[-20, 20], 2];
  const map = L.map('map', { zoomControl: true }).setView(...WORLD_VIEW);

  // CARTO basemaps now watermark tiles without an API key, so the dark map stays on Esri (base + labels)
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  const darkTile = L.layerGroup([
    L.tileLayer(ESRI + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri, HERE, Garmin', maxNativeZoom: 16, maxZoom: 18 }),
    L.tileLayer(ESRI + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 16, maxZoom: 18 })
  ]);
  // NASA GIBS layers only go to native zoom 8; Leaflet upscales beyond that
  const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
  const blackMarble = L.tileLayer(GIBS + 'VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png', {
    attribution: 'NASA Earth Observatory / GIBS (VIIRS Black Marble 2016)', maxNativeZoom: 8, maxZoom: 12
  });
  const blueMarble = L.tileLayer(GIBS + 'BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg', {
    attribution: 'NASA Blue Marble / GIBS', maxNativeZoom: 8, maxZoom: 12
  });
  darkTile.addTo(map);
  L.control.layers({
    'Dark Map': darkTile,
    'NASA Black Marble (city lights)': blackMarble,
    'NASA Blue Marble': blueMarble
  }).addTo(map);

  /* ---------- layers ---------- */
  const globalLayer  = L.layerGroup().addTo(map);
  const indoLayer    = L.layerGroup();
  const fireballLayer = L.layerGroup();
  const clusterLayer = L.layerGroup();

  /* ---------- DOM refs ---------- */
  const btnGlobal    = document.getElementById('btn-global');
  const btnIndo      = document.getElementById('btn-indonesia');
  const pinList      = document.getElementById('pin-list');
  const detailCard   = document.getElementById('pin-detail');
  const chkFireballs = document.getElementById('chk-fireballs');
  const chkClusters  = document.getElementById('chk-clusters');

  /* ---------- populate global markers ---------- */
  pins.forEach(p => {
    const r = Math.max(3, Math.min(15, Math.log10(Math.max(p.mass_kg, 1)) * 3));
    const color = MATERIAL_COLORS[p.material_class] || '#4fc3f7';
    const marker = L.circleMarker([p.latitude, p.longitude], {
      radius: r, fillColor: color, fillOpacity: 0.7,
      color: color, weight: 1, opacity: 0.9
    });
    marker.bindPopup(`
      <b>${p.name}</b><br>
      Year: ${p.year || '—'} · ${p.fall_type || ''}<br>
      Class: ${p.recclass || ''}<br>
      Mass: <b>${fmtMass(p.mass_kg)}</b><br>
      Material: ${p.material_class}
    `);
    marker.on('click', () => showDetail(p));
    globalLayer.addLayer(marker);
  });

  /* ---------- populate Indonesia markers ---------- */
  indoData.meteorites.forEach(m => {
    const icon = L.divIcon({ className: '', html: '<div class="indo-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    const marker = L.marker([m.latitude, m.longitude], { icon });
    marker.bindPopup(`
      <b>${m.name}</b> (${m.year})<br>
      Class: ${m.recclass}<br>
      Mass: <b>${fmtMass(m.mass_kg)}</b><br>
      Energy: ${m.energy_tons_tnt} tons of TNT<br>
      Regime: ${m.impact_regime}
    `);
    marker.on('click', () => showDetail(m));
    marker._metData = m;
    indoLayer.addLayer(marker);
  });

  /* ---------- fireballs ---------- */
  (Array.isArray(fireballsData) ? fireballsData : (fireballsData.fireballs || [])).forEach(f => {
    if (f.latitude == null || f.longitude == null) return;
    L.circleMarker([f.latitude, f.longitude], {
      radius: 2.5, fillColor: '#ffab40', fillOpacity: 0.35,
      color: '#ffab40', weight: 0.5, opacity: 0.5
    }).bindPopup(`
      <b>Fireball</b><br>
      ${f.datetime_utc || ''}<br>
      Altitude: ${f.altitude_km ? f.altitude_km.toFixed(1) + ' km' : '—'}<br>
      Energy: ${f.energy_kilotons_tnt ? f.energy_kilotons_tnt.toFixed(3) + ' kt' : '—'}
    `).addTo(fireballLayer);
  });

  /* ---------- historic airbursts (Chelyabinsk, Bone): always visible ---------- */
  (fireballsData.special_cases || []).forEach(s => {
    L.marker([s.latitude, s.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<div style="font-size:1.6rem; text-shadow:0 0 10px rgba(255,171,64,.9); cursor:pointer">💥</div>',
        iconSize: [28, 28], iconAnchor: [14, 14]
      }),
      title: s.name,
      zIndexOffset: 1000
    }).bindPopup(`
      <b>${s.name}</b><br>
      Satellite-detected airburst · ${s.datetime_utc.slice(0, 10)}<br>
      Energy: <b>${s.energy_kilotons_tnt} kt TNT</b><br>
      Burst altitude: ${s.altitude_km} km
    `).addTo(map);
  });

  /* ---------- cluster overlays ---------- */
  const CLUSTER_COLORS = ['#4fc3f7', '#4fc3f7', '#ffab40', '#69f0ae', '#ff8a65']; // same as page 1 cards
  map.createPane('clusters').style.zIndex = 350; // below the pins (overlayPane = 400) so pins stay visible and clickable
  clustersData.clusters.forEach((c, i) => {
    const radiusM = Math.sqrt(c.count) * 10000; // area ~ record count; visible at world zoom
    L.circle([c.centroid_lat, c.centroid_lon], {
      pane: 'clusters', radius: radiusM, fillColor: CLUSTER_COLORS[i], fillOpacity: 0.15,
      color: CLUSTER_COLORS[i], opacity: 0.8, weight: 2, dashArray: '6,6'
    }).bindTooltip(`<b>Cluster ${c.cluster}: ${(EN.cluster[c.cluster] || [c.name])[0]}</b><br>${c.count.toLocaleString()} records (${c.pct}%)<br>${(EN.cluster[c.cluster] || [, c.interpretation])[1]}`, { sticky: true })
      .addTo(clusterLayer);
  });

  /* ---------- sidebar logic ---------- */
  function renderPinList(items, isIndo) {
    pinList.innerHTML = '';
    items.forEach(p => {
      const color = MATERIAL_COLORS[p.material_class] || '#4fc3f7';
      const el = document.createElement('div');
      el.className = 'pin-item';
      el.innerHTML = `
        <span class="pin-dot" style="background:${color}"></span>
        <div>
          <div class="pin-name">${p.name}</div>
          <div class="pin-meta">${p.year || '—'} · ${fmtMass(p.mass_kg)}</div>
        </div>`;
      el.addEventListener('click', () => {
        map.flyTo([p.latitude, p.longitude], isIndo ? 9 : 6, { duration: 1 });
        showDetail(p);
        document.querySelectorAll('.pin-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
      });
      pinList.appendChild(el);
    });
  }

  function showDetail(p) {
    detailCard.classList.remove('hidden');
    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-year').textContent = p.year || '—';
    document.getElementById('detail-class').textContent = p.recclass || '—';
    document.getElementById('detail-mass').textContent = fmtMass(p.mass_kg);
    document.getElementById('detail-type').textContent = p.fall_type || '—';
    document.getElementById('detail-material').textContent = p.material_class || '—';
    document.getElementById('detail-regime').textContent = p.impact_regime || '—';
    document.getElementById('detail-energy').textContent = p.energy_tons_tnt ? p.energy_tons_tnt + ' tons of TNT' : '—';
  }

  /* ---------- mode toggle ---------- */
  function setMode(mode) {
    btnGlobal.classList.toggle('active', mode === 'global');
    btnIndo.classList.toggle('active', mode === 'indonesia');

    if (mode === 'global') {
      map.removeLayer(indoLayer);
      globalLayer.addTo(map);
      map.flyTo(...WORLD_VIEW, { duration: 1 });
      const sorted = [...pins].sort((a, b) => b.mass_kg - a.mass_kg).slice(0, 80);
      renderPinList(sorted, false);
      detailCard.classList.add('hidden');
    } else {
      map.removeLayer(globalLayer);
      indoLayer.addTo(map);
      map.flyTo([-2, 118], 5, { duration: 1 });
      renderPinList(indoData.meteorites, true);
      /* Auto-select Prambanan */
      const prambanan = indoData.meteorites.find(m => m.name === indoData.default_pin);
      if (prambanan) {
        showDetail(prambanan);
        const firstItem = pinList.querySelector('.pin-item');
        if (firstItem) firstItem.classList.add('active');
        setTimeout(() => {
          indoLayer.eachLayer(l => {
            if (l._metData && l._metData.name === prambanan.name) l.openPopup();
          });
        }, 1200);
      }
    }
  }

  document.getElementById('btn-antarctica').addEventListener('click', () => {
    setMode('global');
    chkClusters.checked = true;
    clusterLayer.addTo(map);
    // most Antarctic finds sit in two groups (~75°E Yamato, ~160°E Transantarctic); centre between them
    setTimeout(() => map.flyTo([-72, 117], 3, { duration: 1.2 }), 50);
  });

  btnGlobal.addEventListener('click', () => setMode('global'));
  btnIndo.addEventListener('click', () => setMode('indonesia'));

  /* ---------- toggle layers ---------- */
  chkFireballs.addEventListener('change', () => {
    chkFireballs.checked ? fireballLayer.addTo(map) : map.removeLayer(fireballLayer);
  });
  chkClusters.addEventListener('change', () => {
    chkClusters.checked ? clusterLayer.addTo(map) : map.removeLayer(clusterLayer);
  });

  /* ---------- init ---------- */
  const sorted = [...pins].sort((a, b) => b.mass_kg - a.mass_kg).slice(0, 80);
  renderPinList(sorted, false);
})();
