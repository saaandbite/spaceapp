/**
 * page2.js — Treasure Map: Global & Indonesia Spatial Explorer
 * Uses Leaflet.js for interactive mapping
 */
(async function () {
  'use strict';

  const DATA = '../datasets/exports/';
  const fetchJSON = url => fetch(DATA + url).then(r => r.json());

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
  const [pinsData, indoData, fireballsData, clustersData] = await Promise.all([
    fetchJSON('map_pins.json'),
    fetchJSON('indonesia.json'),
    fetchJSON('fireballs.json'),
    fetchJSON('clusters.json')
  ]);

  /* Handle both array and {pins:[]} shapes */
  const pins = Array.isArray(pinsData) ? pinsData : (pinsData.pins || pinsData);

  /* ---------- map init ---------- */
  const map = L.map('map', { zoomControl: true }).setView([20, 0], 2);

  const darkTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, HERE, Garmin', maxZoom: 16
  });
  const satTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, Earthstar Geographics', maxZoom: 18
  });
  darkTile.addTo(map);
  L.control.layers({ 'Dark Space': darkTile, 'Satellite': satTile }).addTo(map);

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
    const icon = L.divIcon({
      className: '',
      html: `<div style="font-size:1.5rem; text-shadow:0 2px 6px rgba(0,0,0,.6); cursor:pointer">🇮🇩</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14]
    });
    const marker = L.marker([m.latitude, m.longitude], { icon });
    marker.bindPopup(`
      <b>${m.name}</b> (${m.year})<br>
      Class: ${m.recclass}<br>
      Mass: <b>${fmtMass(m.mass_kg)}</b><br>
      Energy: ${m.energy_tons_tnt} Ton TNT<br>
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

  /* ---------- cluster overlays ---------- */
  const CLUSTER_COLORS = ['rgba(79,195,247,0.15)', 'rgba(79,195,247,0.15)', 'rgba(255,171,64,0.12)', 'rgba(105,240,174,0.12)', 'rgba(255,138,101,0.12)'];
  clustersData.clusters.forEach((c, i) => {
    const radiusM = Math.sqrt(c.count) * 3000;
    L.circle([c.centroid_lat, c.centroid_lon], {
      radius: radiusM, fillColor: CLUSTER_COLORS[i],
      fillOpacity: 0.4, color: CLUSTER_COLORS[i].replace(/[\d.]+\)$/, '0.6)'),
      weight: 1, dashArray: '5,5'
    }).bindTooltip(`<b>Cluster ${c.cluster}: ${c.name}</b><br>${c.count.toLocaleString()} records (${c.pct}%)<br>${c.interpretation}`, { sticky: true })
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
    document.getElementById('detail-energy').textContent = p.energy_tons_tnt ? p.energy_tons_tnt + ' Ton TNT' : '—';
  }

  /* ---------- mode toggle ---------- */
  function setMode(mode) {
    btnGlobal.classList.toggle('active', mode === 'global');
    btnIndo.classList.toggle('active', mode === 'indonesia');

    if (mode === 'global') {
      map.removeLayer(indoLayer);
      globalLayer.addTo(map);
      map.flyTo([20, 0], 2, { duration: 1 });
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
