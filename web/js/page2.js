/**
 * page2.js — Treasure Map: Global & Indonesia Spatial Explorer
 * MapLibre GL globe (shared setup in globe.js)
 */
(async function () {
  'use strict';

  const fetchJSON = window.fetchData;

  /* ---------- helpers ---------- */
  const MATERIAL_COLORS = {
    // muted earth tones so the four classes stay apart without competing with the amber accent
    'Iron / Stony-Iron':      '#e07a5f',
    'Achondrite':              '#e9c46a',
    'Carbonaceous Chondrite':  '#81b29a',
    'Ordinary Chondrite':      '#9aa5b8'
  };

  /** Format mass smartly */
  function fmtMass(kg) {
    if (kg >= 1000) return (kg / 1000).toFixed(1) + ' tonnes';
    if (kg >= 1) return kg.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' kg';
    return (kg * 1000).toFixed(1) + ' g';
  }

  const pinPopup = p => `
      <b>${p.name}</b><br>
      Year: ${p.year || '—'} · ${p.fall_type || ''}<br>
      Class: ${p.recclass || ''}<br>
      Mass: <b>${fmtMass(p.mass_kg)}</b><br>
      Material: ${p.material_class}`;

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
  const fireballs = Array.isArray(fireballsData) ? fireballsData : (fireballsData.fireballs || []);

  /* ---------- map init ---------- */
  // centre at -20° so the globe shows the southern hemisphere too (71% of clean records are Antarctic)
  const WORLD_VIEW = { center: [20, -20], zoom: 1.6 };
  const map = Globe.create('map', { ...WORLD_VIEW, basemaps: ['dark', 'blackMarble', 'blueMarble'] });
  const fly = (opts) => { map.stopSpin(); map.flyTo({ duration: Globe.flight(1500), essential: true, ...opts }); };

  /* ---------- DOM refs ---------- */
  const btnGlobal    = document.getElementById('btn-global');
  const btnIndo      = document.getElementById('btn-indonesia');
  const pinList      = document.getElementById('pin-list');
  const detailCard   = document.getElementById('pin-detail');
  const chkFireballs = document.getElementById('chk-fireballs');
  const chkClusters  = document.getElementById('chk-clusters');

  const popup = new maplibregl.Popup({ offset: 8, maxWidth: '260px' });
  const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
  const setVisible = (id, on) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');

  /* ---------- GeoJSON layers: clusters (bottom), fireballs, global pins (top) ---------- */
  const CLUSTER_COLORS = ['#9aa5b8', '#9aa5b8', '#e9c46a', '#81b29a', '#e07a5f'];
  map.ready.then(() => {
    map.addSource('clusters', { type: 'geojson', data: { type: 'FeatureCollection', features: clustersData.clusters.map((c, i) =>
      // area ~ record count; visible at world zoom
      Globe.circlePolygon(c.centroid_lat, c.centroid_lon, Math.sqrt(c.count) * 10000, {
        color: CLUSTER_COLORS[i],
        label: `<b>Cluster ${c.cluster}: ${(EN.cluster[c.cluster] || [c.name])[0]}</b><br>${c.count.toLocaleString()} records (${c.pct}%)<br>${(EN.cluster[c.cluster] || [, c.interpretation])[1]}`
      })) } });
    map.addLayer({ id: 'clusters-fill', type: 'fill', source: 'clusters', layout: { visibility: 'none' }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 } });
    map.addLayer({ id: 'clusters-line', type: 'line', source: 'clusters', layout: { visibility: 'none' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [3, 3] } });

    map.addSource('fireballs', { type: 'geojson', data: { type: 'FeatureCollection', features: fireballs
      .filter(f => f.latitude != null && f.longitude != null)
      .map(f => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.longitude, f.latitude] }, properties: {
        html: `<b>Fireball</b><br>${f.datetime_utc || ''}<br>Altitude: ${f.altitude_km ? f.altitude_km.toFixed(1) + ' km' : '—'}<br>Energy: ${f.energy_kilotons_tnt ? f.energy_kilotons_tnt.toFixed(3) + ' kt' : '—'}`
      } })) } });
    map.addLayer({ id: 'fireballs', type: 'circle', source: 'fireballs', layout: { visibility: 'none' }, paint: {
      'circle-radius': 2.5, 'circle-color': '#ff9e3d', 'circle-opacity': 0.35,
      'circle-stroke-color': '#ff9e3d', 'circle-stroke-width': 0.5, 'circle-stroke-opacity': 0.5
    } });

    map.addSource('pins', { type: 'geojson', data: { type: 'FeatureCollection', features: pins.map((p, i) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: { i, r: Math.max(3, Math.min(15, Math.log10(Math.max(p.mass_kg, 1)) * 3)), color: MATERIAL_COLORS[p.material_class] || '#9aa5b8' }
    })) } });
    map.addLayer({ id: 'pins', type: 'circle', source: 'pins', paint: {
      'circle-radius': ['get', 'r'], 'circle-color': ['get', 'color'], 'circle-opacity': 0.7,
      'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1, 'circle-stroke-opacity': 0.9
    } });

    map.on('click', 'pins', e => {
      const p = pins[e.features[0].properties.i];
      popup.setLngLat([p.longitude, p.latitude]).setHTML(pinPopup(p)).addTo(map);
      showDetail(p);
    });
    map.on('click', 'fireballs', e => {
      if (map.getLayoutProperty('pins', 'visibility') !== 'none' && map.queryRenderedFeatures(e.point, { layers: ['pins'] }).length) return; // a pin on top wins
      popup.setLngLat(e.lngLat).setHTML(e.features[0].properties.html).addTo(map);
    });
    map.on('mousemove', 'clusters-fill', e => hoverPopup.setLngLat(e.lngLat).setHTML(e.features[0].properties.label).addTo(map));
    map.on('mouseleave', 'clusters-fill', () => hoverPopup.remove());
    ['pins', 'fireballs'].forEach(id => {
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
    });
  });

  /* ---------- Indonesia markers (DOM markers, shown in Indonesia mode) ---------- */
  const indoMarkers = indoData.meteorites.map(m => {
    const el = document.createElement('div');
    el.className = 'indo-pin';
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([m.longitude, m.latitude])
      .setPopup(new maplibregl.Popup({ offset: 12, maxWidth: '260px' }).setHTML(`
        <b>${m.name}</b> (${m.year})<br>
        Class: ${m.recclass}<br>
        Mass: <b>${fmtMass(m.mass_kg)}</b><br>
        Energy: ${m.energy_tons_tnt} tons of TNT<br>
        Regime: ${m.impact_regime}`));
    el.addEventListener('click', () => showDetail(m));
    marker._metData = m;
    return marker;
  });

  /* ---------- historic airbursts (Chelyabinsk, Bone): always visible ---------- */
  (fireballsData.special_cases || []).forEach(s => {
    const el = document.createElement('div');
    el.className = 'airburst-pin';
    el.title = s.name;
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.8 5.8l2.5 2.5M15.7 15.7l2.5 2.5M18.2 5.8l-2.5 2.5M8.3 15.7l-2.5 2.5"/></svg>';
    new maplibregl.Marker({ element: el })
      .setLngLat([s.longitude, s.latitude])
      .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(`
        <b>${s.name}</b><br>
        Satellite-detected airburst · ${s.datetime_utc.slice(0, 10)}<br>
        Energy: <b>${s.energy_kilotons_tnt} kt TNT</b><br>
        Burst altitude: ${s.altitude_km} km`))
      .addTo(map);
  });

  /* ---------- sidebar logic ---------- */
  function renderPinList(items, isIndo) {
    pinList.innerHTML = '';
    items.forEach(p => {
      const color = MATERIAL_COLORS[p.material_class] || '#9aa5b8';
      const el = document.createElement('div');
      el.className = 'pin-item';
      el.innerHTML = `
        <span class="pin-dot" style="background:${color}"></span>
        <div>
          <div class="pin-name">${p.name}</div>
          <div class="pin-meta">${p.year || '—'} · ${fmtMass(p.mass_kg)}</div>
        </div>`;
      el.addEventListener('click', () => {
        fly({ center: [p.longitude, p.latitude], zoom: isIndo ? 9 : 6 });
        showDetail(p);
        if (!isIndo) popup.setLngLat([p.longitude, p.latitude]).setHTML(pinPopup(p)).addTo(map);
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
    popup.remove();
    map.ready.then(() => setVisible('pins', mode === 'global'));

    if (mode === 'global') {
      indoMarkers.forEach(mk => mk.remove());
      fly(WORLD_VIEW);
      const sorted = [...pins].sort((a, b) => b.mass_kg - a.mass_kg).slice(0, 80);
      renderPinList(sorted, false);
      detailCard.classList.add('hidden');
    } else {
      indoMarkers.forEach(mk => mk.addTo(map));
      fly({ center: [118, -2], zoom: 4 });
      renderPinList(indoData.meteorites, true);
      /* Auto-select Prambanan */
      const prambanan = indoData.meteorites.find(m => m.name === indoData.default_pin);
      if (prambanan) {
        showDetail(prambanan);
        const firstItem = pinList.querySelector('.pin-item');
        if (firstItem) firstItem.classList.add('active');
        const mk = indoMarkers.find(mk => mk._metData.name === prambanan.name);
        // open once the camera has landed (a moveend listener can fire early from the previous flight)
        setTimeout(() => { if (mk && !mk.getPopup().isOpen()) mk.togglePopup(); }, Globe.flight(1500) + 100);
      }
    }
  }

  document.getElementById('btn-antarctica').addEventListener('click', () => {
    setMode('global');
    chkClusters.checked = true;
    map.ready.then(() => { setVisible('clusters-fill', true); setVisible('clusters-line', true); });
    // most Antarctic finds sit in two groups (~75°E Yamato, ~160°E Transantarctic); centre between them
    fly({ center: [117, -75], zoom: 1.9 });
  });

  btnGlobal.addEventListener('click', () => setMode('global'));
  btnIndo.addEventListener('click', () => setMode('indonesia'));

  /* ---------- toggle layers ---------- */
  chkFireballs.addEventListener('change', () => map.ready.then(() => setVisible('fireballs', chkFireballs.checked)));
  chkClusters.addEventListener('change', () => map.ready.then(() => {
    setVisible('clusters-fill', chkClusters.checked);
    setVisible('clusters-line', chkClusters.checked);
  }));

  /* ---------- init ---------- */
  const sorted = [...pins].sort((a, b) => b.mass_kg - a.mass_kg).slice(0, 80);
  renderPinList(sorted, false);
})();
