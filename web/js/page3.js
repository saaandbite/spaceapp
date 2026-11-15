/**
 * page3.js — Drop a Meteor! Real-Map Impact & Mitigation Sandbox
 * Compliant with NASA Space Apps Challenge 2026 Blueprint
 * Features:
 *   - MapLibre GL 3D globe that flattens to a street map when zoomed in (Dark & Satellite tiles)
 *   - Physics-accurate kinetic energy & hazard radius equations
 *   - No-crater rule for Ordinary Chondrite < 500 kg (Fragment Strewn Field)
 *   - NASA SEDAC GPWv4 population density estimation
 *   - NASA NeoWs real asteroid presets
 *   - NASA DART kinetic impactor deflection simulation
 */
(async function () {
  'use strict';

  const fetchJSON = window.fetchData;

  /* -------------------------------------------------------------
     DOM Elements
     ------------------------------------------------------------- */
  const citySelect      = document.getElementById('city-select');
  const asteroidSelect  = document.getElementById('asteroid-select');
  const materialSelect  = document.getElementById('material-select');
  const materialInfo    = document.getElementById('material-info');
  const massSlider      = document.getElementById('mass-slider');
  const massDisplay     = document.getElementById('mass-display');
  const velocitySlider  = document.getElementById('velocity-slider');
  const velocityDisplay = document.getElementById('velocity-display');
  const btnDrop         = document.getElementById('btn-drop');
  const resultsCard     = document.getElementById('results-card');
  const resultsBody     = document.getElementById('results-body');
  const lblLat          = document.getElementById('lbl-lat');
  const lblLng          = document.getElementById('lbl-lng');
  const btnDart         = document.getElementById('btn-dart');
  const dartDvInput     = document.getElementById('dart-dv');
  const dartDaysInput   = document.getElementById('dart-days');
  const dartResult      = document.getElementById('dart-result');

  /* -------------------------------------------------------------
     State Variables
     ------------------------------------------------------------- */
  let currentLat = -6.20;
  let currentLng = 106.85;
  let currentMassKg = 32.49; // Default verified example (Jumapalo)
  let currentVelocityMs = 17000;
  let currentMaterial = null;
  let targetMarker = null;
  let hazardLayerGroup = null;
  let dartLayerGroup = null;

  /* Data caches */
  let physicsData = null;
  let cityPresetsData = null;
  let asteroidPresetsData = null;
  let populationGridData = null;

  /* -------------------------------------------------------------
     Unit Helpers
     ------------------------------------------------------------- */
  function formatMass(kg) {
    if (kg >= 1e9) return (kg / 1e9).toFixed(2) + ' Mt (Megatonnes)';
    if (kg >= 1e6) return (kg / 1e6).toFixed(2) + ' kt (Kilotonnes)';
    if (kg >= 1000) return (kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' tonnes';
    if (kg >= 1) return kg.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' kg';
    return (kg * 1000).toFixed(1) + ' g';
  }

  function formatDistance(meters) {
    if (meters >= 1000) {
      return (meters / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km';
    }
    return Math.round(meters).toLocaleString() + ' m';
  }

  function formatNumber(num) {
    return Math.round(num).toLocaleString();
  }

  /* Logarithmic slider conversion for mass (0.1 kg to 100,000 kg) */
  function sliderToMass(val) {
    // 0 -> 0.1 kg, 100 -> 100,000 kg (6 orders of magnitude: 10^-1 to 10^5)
    return Math.pow(10, (val / 100) * 6 - 1);
  }

  function massToSlider(kg) {
    const clamped = Math.max(0.1, Math.min(100000, kg));
    return ((Math.log10(clamped) + 1) / 6) * 100;
  }

  /* -------------------------------------------------------------
     Load Datasets
     ------------------------------------------------------------- */
  try {
    const [physics, cities, asteroids, popGrid] = await Promise.all([
      fetchJSON('physics.json'),
      fetchJSON('city_presets.json'),
      fetchJSON('asteroid_presets.json'),
      fetchJSON('population_grid.json').catch(e => {
        console.warn('Population grid load failed, using fallback:', e);
        return null;
      })
    ]);

    physicsData = physics;
    cityPresetsData = cities;
    asteroidPresetsData = asteroids;
    populationGridData = popGrid;
  } catch (err) {
    showLoadError(err); // the map and physics still work; presets and materials will be missing
  }

  /* -------------------------------------------------------------
     Map Initialization
     ------------------------------------------------------------- */
  const map = Globe.create('sim-map', { center: [currentLng, currentLat], zoom: 1.6, basemaps: ['dark', 'satellite'] });
  const { circlePolygon } = Globe;
  const stopSpin = map.stopSpin;
  const EMPTY = { type: 'FeatureCollection', features: [] };

  const mapReady = map.ready.then(() => {
    map.addSource('hazard', { type: 'geojson', data: EMPTY });
    map.addLayer({ id: 'hazard-fill', type: 'fill', source: 'hazard', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'] } });
    map.addLayer({ id: 'hazard-line', type: 'line', source: 'hazard', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });
    map.addSource('dart', { type: 'geojson', data: EMPTY });
    map.addLayer({ id: 'dart-line', type: 'line', source: 'dart', paint: { 'line-color': '#81b29a', 'line-width': 3, 'line-dasharray': [2, 2] } });
  });

  /* Hover tooltip for rings (Leaflet's sticky tooltip) */
  const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
  map.on('mousemove', 'hazard-fill', e => {
    // features come back topmost first, so the smallest ring under the cursor wins
    hoverPopup.setLngLat(e.lngLat).setHTML(e.features[0].properties.label).addTo(map);
  });
  map.on('mouseleave', 'hazard-fill', () => hoverPopup.remove());

  hazardLayerGroup = {
    setRings: features => mapReady.then(() => map.getSource('hazard').setData({ type: 'FeatureCollection', features })),
    clearLayers: () => mapReady.then(() => map.getSource('hazard').setData(EMPTY))
  };
  let deflMarker = null;
  dartLayerGroup = {
    clearLayers() {
      if (deflMarker) { deflMarker.remove(); deflMarker = null; }
      mapReady.then(() => map.getSource('dart').setData(EMPTY));
    }
  };

  /* Target Marker */
  const targetEl = document.createElement('div');
  targetEl.style.cssText = 'width:22px;height:22px;background:#ff5a3c;border:3px solid #fff;border-radius:50%;box-shadow:0 0 14px rgba(255,90,60,.8);cursor:grab';
  targetEl.title = 'Impact Ground Zero';

  targetMarker = new maplibregl.Marker({ element: targetEl, draggable: true })
    .setLngLat([currentLng, currentLat])
    .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML('<b>Impact Ground Zero</b><br>Drag me or click anywhere on map.'))
    .addTo(map);

  targetMarker.on('dragend', function () {
    const pos = targetMarker.getLngLat();
    setCoordinates(pos.lat, pos.lng);
  });

  map.on('click', function (e) {
    stopSpin();
    setCoordinates(e.lngLat.lat, e.lngLat.lng);
  });

  function setCoordinates(lat, lng) {
    currentLat = parseFloat(lat.toFixed(4));
    currentLng = parseFloat(lng.toFixed(4));
    targetMarker.setLngLat([currentLng, currentLat]);
    lblLat.textContent = currentLat.toFixed(2);
    lblLng.textContent = currentLng.toFixed(2);
  }

  /* Fit the camera around a ring of radius radiusM (fitBounds via the ring's polygon) */
  function flyToRadius(lat, lng, radiusM, opts = {}) {
    const bounds = new maplibregl.LngLatBounds();
    circlePolygon(lat, lng, radiusM, {}, 32).geometry.coordinates[0].forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: 60, duration: Globe.flight(2500), essential: true, ...opts });
  }

  /* -------------------------------------------------------------
     Populate Dropdowns & Form Controls
     ------------------------------------------------------------- */

  /* 1. Cities */
  if (cityPresetsData && cityPresetsData.cities) {
    cityPresetsData.cities.forEach((c, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${c.name}, ${c.country} · ${formatNumber(c.density_km2)} people/km²`;
      citySelect.appendChild(opt);
    });

    citySelect.addEventListener('change', function () {
      const val = this.value;
      if (val === '') return;
      const city = cityPresetsData.cities[parseInt(val, 10)];
      if (city) {
        setCoordinates(city.latitude, city.longitude);
        stopSpin();
        map.flyTo({ center: [city.longitude, city.latitude], zoom: 11, duration: Globe.flight(2500), essential: true });
      }
    });
  }

  /* 2. Materials */
  if (physicsData && physicsData.material_params) {
    physicsData.material_params.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.material_class;
      opt.textContent = m.material_class;
      if (m.material_class === 'Ordinary Chondrite') opt.selected = true;
      materialSelect.appendChild(opt);
    });

    currentMaterial = physicsData.material_params.find(m => m.material_class === 'Ordinary Chondrite') || physicsData.material_params[0];
    updateMaterialInfo();

    materialSelect.addEventListener('change', function () {
      const sel = physicsData.material_params.find(m => m.material_class === this.value);
      if (sel) {
        currentMaterial = sel;
        updateMaterialInfo();
      }
    });
  }

  function updateMaterialInfo() {
    if (!currentMaterial) return;
    materialInfo.textContent = `Density: ${currentMaterial.density_g_cm3} g/cm³ · Yield: ${currentMaterial.yield_strength_mpa} MPa · Regime: ${currentMaterial.impact_regime}`;
  }

  /* 3. Asteroid Presets */
  if (asteroidPresetsData) {
    const grpNeo = document.createElement('optgroup');
    grpNeo.label = 'NASA NeoWs (Recent Encounters)';
    if (asteroidPresetsData.neows_feed) {
      asteroidPresetsData.neows_feed.slice(0, 8).forEach(a => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({
          name: a.name,
          mass: a.mass_kg_est,
          v: Math.round(a.velocity_kms * 1000),
          mat: 'Ordinary Chondrite'
        });
        opt.textContent = `${a.name} (Ø ${Math.round(a.diameter_mean_m)}m, ${a.velocity_kms.toFixed(1)} km/s)`;
        grpNeo.appendChild(opt);
      });
    }
    asteroidSelect.appendChild(grpNeo);

    const grpSentry = document.createElement('optgroup');
    grpSentry.label = 'NASA Sentry (Impact Monitoring)';
    if (asteroidPresetsData.sentry_top25) {
      asteroidPresetsData.sentry_top25.slice(0, 8).forEach(a => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({
          name: a.fullname,
          mass: a.mass_kg_est,
          v: Math.round(a.velocity_inf_kms * 1000),
          mat: 'Carbonaceous Chondrite'
        });
        opt.textContent = `${a.fullname} (Ø ${Math.round(a.diameter_m)}m, ${a.velocity_inf_kms.toFixed(1)} km/s)`;
        grpSentry.appendChild(opt);
      });
    }
    asteroidSelect.appendChild(grpSentry);

    asteroidSelect.addEventListener('change', function () {
      if (!this.value) return;
      try {
        const item = JSON.parse(this.value);
        currentMassKg = item.mass;
        currentVelocityMs = item.v;

        // Update slider positions
        massSlider.value = massToSlider(currentMassKg);
        massDisplay.textContent = formatMass(currentMassKg);

        velocitySlider.value = currentVelocityMs;
        velocityDisplay.textContent = (currentVelocityMs / 1000).toFixed(1) + ' km/s';

        // Update material
        materialSelect.value = item.mat;
        currentMaterial = physicsData.material_params.find(m => m.material_class === item.mat) || currentMaterial;
        updateMaterialInfo();
      } catch (e) {
        console.error(e);
      }
    });
  }

  /* 4. Sliders */
  // Initial default: Jumapalo = 32.49 kg
  massSlider.value = massToSlider(32.49);
  currentMassKg = 32.49;
  massDisplay.textContent = formatMass(currentMassKg);

  massSlider.addEventListener('input', function () {
    currentMassKg = sliderToMass(parseFloat(this.value));
    massDisplay.textContent = formatMass(currentMassKg);
    asteroidSelect.value = ''; // Reset asteroid preset when user manually slides
  });

  const angleSlider = document.getElementById('angle-slider');
  const angleDisplay = document.getElementById('angle-display');
  angleSlider.addEventListener('input', function () {
    angleDisplay.textContent = this.value + '°';
  });

  velocitySlider.addEventListener('input', function () {
    currentVelocityMs = parseFloat(this.value);
    velocityDisplay.textContent = (currentVelocityMs / 1000).toFixed(1) + ' km/s';
  });

  /* -------------------------------------------------------------
     Population Density Estimation (NASA SEDAC GPWv4)
     ------------------------------------------------------------- */
  function estimatePopulation(centerLat, centerLng, radiusKm) {
    if (radiusKm <= 0) return 0;

    // 1. If population grid is available, compute accurately
    if (populationGridData && Array.isArray(populationGridData.cells)) {
      const cells = populationGridData.cells;
      const degRadius = radiusKm / 111.32;
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      const degLonRadius = Math.abs(cosLat) > 0.01 ? degRadius / Math.abs(cosLat) : degRadius;

      let totalPop = 0;
      let matchedCells = 0;

      for (let i = 0; i < cells.length; i++) {
        const [cLat, cLon, density] = cells[i];

        // Bounding box pre-filter
        if (Math.abs(cLat - centerLat) <= degRadius + 0.3 && Math.abs(cLon - centerLng) <= degLonRadius + 0.3) {
          // Equirectangular distance approximation
          const dX = (cLon - centerLng) * 111.32 * cosLat;
          const dY = (cLat - centerLat) * 111.32;
          const distKm = Math.hypot(dX, dY);

          if (distKm <= radiusKm) {
            // Each 0.5° cell area in km²
            const cellAreaKm2 = (0.5 * 111.32) * (0.5 * 111.32 * Math.cos((cLat * Math.PI) / 180));
            totalPop += density * Math.max(1, cellAreaKm2);
            matchedCells++;
          }
        }
      }

      if (matchedCells > 0) {
        return Math.round(totalPop);
      }
    }

    // 2. Fallback: Interpolate from closest city preset
    let nearestCity = null;
    let minDist = Infinity;
    if (cityPresetsData && cityPresetsData.cities) {
      cityPresetsData.cities.forEach(city => {
        const d = Math.hypot(city.latitude - centerLat, city.longitude - centerLng);
        if (d < minDist) {
          minDist = d;
          nearestCity = city;
        }
      });
    }

    // If within ~1.5° (approx 160km) of a known city preset
    if (nearestCity && minDist < 1.5) {
      const areaKm2 = Math.PI * Math.pow(radiusKm, 2);
      // Use localized density
      const localDensity = nearestCity.density_km2;
      return Math.round(localDensity * areaKm2);
    }

    // Global average terrestrial density fallback (~60 people/km²)
    const area = Math.PI * Math.pow(radiusKm, 2);
    return Math.round(60 * area);
  }

  /* -------------------------------------------------------------
     Atmospheric Breakup Altitude
     Rock breaks when ram pressure rho_air(h) * v^2 exceeds its strength;
     rho_air(h) = RHO0 * exp(-h / H).
     RHO0 = 1.225 kg/m3 (sea level); H = 8.6 km is chosen so the blueprint's
     Jumapalo example (35 MPa, 17 km/s) gives 19.9 km. Collins et al. 2005
     use RHO0 = 1, H = 8 km, which gives ~16.9 km for the same rock.
     Returns km, or 0 when the rock reaches the ground intact.
     ------------------------------------------------------------- */
  const RHO0 = 1.225, SCALE_H_KM = 8.6;
  function breakupAltitudeKm(strengthMpa, velocityMs) {
    const rhoNeeded = (strengthMpa * 1e6) / (velocityMs * velocityMs);
    return rhoNeeded >= RHO0 ? 0 : SCALE_H_KM * Math.log(RHO0 / rhoNeeded);
  }
  console.assert(Math.abs(breakupAltitudeKm(35, 17000) - 19.9) < 0.05, 'breakup altitude: Jumapalo should be 19.9 km');
  console.assert(breakupAltitudeKm(350, 17000) < 1, 'breakup altitude: iron at 17 km/s should reach the ground');

  /* -------------------------------------------------------------
     "Drop It!" Physics Engine & Visualizer
     ------------------------------------------------------------- */
  btnDrop.addEventListener('click', function () {
    runImpactSimulation();
  });

  function runImpactSimulation(isInitial = false) {
    hazardLayerGroup.clearLayers();
    dartLayerGroup.clearLayers();
    dartResult.textContent = '';

    /* Trigger visual shockwave & shake on user action */
    if (!isInitial) {
      const simMapEl = document.getElementById('sim-map');
      if (simMapEl) {
        simMapEl.classList.remove('impact-shake');
        void simMapEl.offsetWidth; // Force reflow
        simMapEl.classList.add('impact-shake');
        setTimeout(() => simMapEl.classList.remove('impact-shake'), 500);
      }

      // Expanding shockwave; the 0×0 wrapper keeps MapLibre's positioning transform off the animated element
      const wave = document.createElement('div');
      wave.style.pointerEvents = 'none';
      wave.innerHTML = '<div class="shockwave-effect" style="position:absolute"></div>';
      stopSpin();
      // play the shockwave once the camera has arrived
      map.once('moveend', () => {
        const shockwaveMarker = new maplibregl.Marker({ element: wave }).setLngLat([currentLng, currentLat]).addTo(map);
        setTimeout(() => shockwaveMarker.remove(), 1500);
      });
    }

    const mass = currentMassKg;
    const v = currentVelocityMs;

    /* Exact Blueprint Physics Formulas */
    const eJoules = 0.5 * mass * Math.pow(v, 2);
    const eTonsTNT = eJoules / 4.184e9;
    const eKilotons = eTonsTNT / 1000;

    // Radius scaling: 15, 220, 650 * (kt ^ (1/3))
    const ktFactor = Math.pow(Math.max(1e-9, eKilotons), 1 / 3);
    // Entry-angle correction for the crater only: × sin(θ)^(1/3) (Collins et al. 2005); 90° = blueprint formula
    const angleDeg = parseFloat(angleSlider.value);
    const angleFactor = Math.cbrt(Math.sin(angleDeg * Math.PI / 180));
    const rCraterM = 15 * ktFactor * angleFactor;
    const rBlastM = 220 * ktFactor;
    const rGlassM = 650 * ktFactor;

    /* Check No-Crater Rule (Ordinary Chondrite < 500 kg airburst) */
    const isOrdinaryChondrite = currentMaterial && currentMaterial.material_class.includes('Ordinary Chondrite');
    const isAirburstStrewn = isOrdinaryChondrite && mass < 500;

    /* Population Estimation */
    const popBlast = estimatePopulation(currentLat, currentLng, rBlastM / 1000);
    const popGlass = estimatePopulation(currentLat, currentLng, rGlassM / 1000);

    /* Draw hazard rings (largest first so smaller rings sit on top) */
    const craterLabel = isAirburstStrewn ? 'Fragment Strewn Field (No Surface Crater)' : 'Surface Crater Zone';
    const craterColor = isAirburstStrewn ? '#9aa5b8' : '#ff5a3c';
    hazardLayerGroup.setRings([
      circlePolygon(currentLat, currentLng, rGlassM, { color: '#fff176', opacity: 0.12, label: `<span class="ring-dot" style="background:#fff176"></span>Window Shatter Zone: ${formatDistance(rGlassM)}` }),
      circlePolygon(currentLat, currentLng, rBlastM, { color: '#ffab40', opacity: 0.22, label: `<span class="ring-dot" style="background:#ffab40"></span>Severe Blast & Evacuation: ${formatDistance(rBlastM)}` }),
      circlePolygon(currentLat, currentLng, Math.max(5, rCraterM), { color: craterColor, opacity: 0.45, label: `<span class="ring-dot" style="background:${craterColor}"></span>${craterLabel}: ${formatDistance(rCraterM)}` })
    ]);

    // On load the globe keeps spinning; on Drop It the camera flies from space down to the rings
    if (!isInitial) flyToRadius(currentLat, currentLng, rGlassM * 1.35);

    /* Build Results Card HTML */
    const regime = currentMaterial ? currentMaterial.impact_regime : 'Atmospheric Entry';
    const breakupKm = currentMaterial ? breakupAltitudeKm(currentMaterial.yield_strength_mpa, v) : null;
    const breakupText = breakupKm === null ? '—'
      : breakupKm >= 1 ? `${breakupKm.toFixed(1)} km above ground`
      : 'Below 1 km: reaches the ground nearly intact';

    let energyComparison = '';
    if (eTonsTNT >= 15000) {
      const hiroshimaRatio = (eTonsTNT / 15000).toFixed(1);
      energyComparison = ` (~${hiroshimaRatio}× Hiroshima bomb)`;
    } else if (eTonsTNT >= 500) {
      const chelyabinskRatio = (eTonsTNT / 500000).toFixed(3);
      energyComparison = ` (~${chelyabinskRatio}× Chelyabinsk)`;
    }

    resultsBody.innerHTML = `
      <div class="result-hero">
        <span class="num">${eTonsTNT < 1 ? eTonsTNT.toFixed(3) : eTonsTNT < 10 ? eTonsTNT.toFixed(2) : formatNumber(eTonsTNT)}</span>
        <span>tons of TNT${energyComparison}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Kinetic Energy</span>
        <span class="result-value">${eJoules.toExponential(2)} J</span>
      </div>
      <div class="result-row">
        <span class="result-label">Entry Regime</span>
        <span class="result-value" style="font-size:.8rem; max-width:60%; text-align:right">${regime}</span>
      </div>
      <div class="result-row">
        <span class="result-label">Entry Angle</span>
        <span class="result-value">${angleDeg}° <span class="text-muted" style="font-size:.75rem">(crater ×${angleFactor.toFixed(2)})</span></span>
      </div>
      <div class="result-row">
        <span class="result-label">Breakup Altitude</span>
        <span class="result-value text-accent">${breakupText}</span>
      </div>

      <div class="mt-2" style="border-top:1px solid rgba(255,255,255,.08); padding-top:.5rem">
        <div class="result-ring">
          <span class="ring-dot" style="background:${craterColor}"></span>
          <span class="result-label" style="flex:1">${craterLabel}</span>
          <span class="result-value" style="color:${craterColor}">${formatDistance(rCraterM)}</span>
        </div>
        <div class="result-ring">
          <span class="ring-dot" style="background:var(--warning)"></span>
          <span class="result-label" style="flex:1">Severe Structural Airblast (>20 psi)</span>
          <span class="result-value text-warning">${formatDistance(rBlastM)}</span>
        </div>
        <div class="result-ring">
          <span class="ring-dot" style="background:var(--caution)"></span>
          <span class="result-label" style="flex:1">Window Shatter & Acoustic Shockwave</span>
          <span class="result-value" style="color:var(--caution)">${formatDistance(rGlassM)}</span>
        </div>
      </div>

      <div class="mt-2" style="background:rgba(255,255,255,.03); padding:.6rem; border-radius:8px">
        <div class="result-row" style="border-bottom:none">
          <span class="result-label">People in blast zone (est.)</span>
          <span class="result-value text-danger" style="white-space:nowrap">${formatNumber(popBlast)}</span>
        </div>
        <div class="result-row" style="border-bottom:none">
          <span class="result-label">People in glass-shatter zone (est.)</span>
          <span class="result-value text-warning" style="white-space:nowrap">${formatNumber(popGlass)}</span>
        </div>
      </div>

      <div class="verdict mt-2" style="margin:0.75rem 0 0 0; padding:.75rem 1rem; font-size:.8rem">
        <b>Civil defense:</b>
        ${isAirburstStrewn
          ? 'Tropospheric airburst will produce high-velocity acoustic shockwave. Move away from glass windows immediately. Do NOT gaze at fireball. Lie prone on ground with head protected.'
          : 'Catastrophic ground impact with severe shockwave. Immediate evacuation mandatory within orange zone. Window protection protocol in yellow perimeter.'}
      </div>
    `;

    resultsCard.classList.remove('hidden');
  }

  /* -------------------------------------------------------------
     DART Kinetic Impactor Deflection Simulator
     ------------------------------------------------------------- */
  btnDart.addEventListener('click', function () {
    const deltaV = parseFloat(dartDvInput.value) || 0.01; // m/s
    const leadTimeDays = parseFloat(dartDaysInput.value) || 30; // days
    const leadTimeSeconds = leadTimeDays * 86400;

    /* Exact formula: shift_km = delta_v_ms * lead_time_s / 1000 */
    const shiftKm = (deltaV * leadTimeSeconds) / 1000;

    dartLayerGroup.clearLayers();

    // Deflection direction: shift longitude westward/eastward slightly for visual representation
    const shiftDegLng = shiftKm / (111.32 * Math.cos((currentLat * Math.PI) / 180));
    const deflectedLat = currentLat;
    const deflectedLng = currentLng + shiftDegLng;

    // Deflected marker (green) and dashed trajectory-shift line
    const deflEl = document.createElement('div');
    deflEl.style.cssText = 'width:18px;height:18px;background:#81b29a;border:2px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(129,178,154,.8);cursor:pointer';
    deflMarker = new maplibregl.Marker({ element: deflEl })
      .setLngLat([deflectedLng, deflectedLat])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`<b>Deflected impact point</b><br>Shifted by <b>${shiftKm.toFixed(2)} km</b> away from ground zero!`))
      .addTo(map);

    mapReady.then(() => map.getSource('dart').setData({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: [[currentLng, currentLat], [deflectedLng, deflectedLat]] }
    }));

    // Output explanation
    dartResult.innerHTML = `
      <div style="color:var(--success); font-weight:600; margin-top:.4rem">
        Deflection distance: <span class="num">${shiftKm.toFixed(2)} km</span>
      </div>
      <p style="font-size:.78rem; margin-top:.2rem">
        By applying <b>${(deltaV * 100).toFixed(1)} cm/s</b> delta-V with <b>${leadTimeDays} days</b> warning lead time, 
        the meteoroid trajectory is displaced by <b>${shiftKm.toFixed(2)} km</b>, effectively averting direct municipal center impact.
      </p>
    `;

    // Fit bounds to show both ground zero and deflected marker
    stopSpin();
    map.fitBounds([[Math.min(currentLng, deflectedLng), currentLat], [Math.max(currentLng, deflectedLng), currentLat]],
      { padding: 80, maxZoom: 14, duration: Globe.flight(2000), essential: true });
  });

  // Run initial simulation on load for default Jumapalo without shake
  runImpactSimulation(true);

})();
