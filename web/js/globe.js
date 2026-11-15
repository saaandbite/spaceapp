/**
 * globe.js — shared MapLibre GL globe setup for the Treasure Map (page 2) and the simulator (page 3).
 * A 3D Earth when zoomed out that flattens to a normal map near city level.
 */
(function () {
  'use strict';

  // No GPU (hardware acceleration off / missing driver) means WebGL runs on the CPU: render lighter there
  const SOFTWARE_GL = (() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return !gl || /swiftshader|basic render|llvmpipe|software/i.test(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '');
    } catch (e) { return true; }
  })();

  // CARTO basemaps now watermark tiles without an API key, so the dark map stays on Esri (base + labels)
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const esri = (path, maxzoom, attribution = '') => ({
    type: 'raster', tiles: [ESRI + path + '/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom, attribution
  });
  // NASA GIBS layers only go to native zoom 8; MapLibre upscales beyond that
  const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
  const gibs = (layer, ext, attribution) => ({
    type: 'raster', tiles: [GIBS + layer + '/GoogleMapsCompatible_Level8/{z}/{y}/{x}.' + ext], tileSize: 256, maxzoom: 8, attribution
  });

  const BASEMAPS = {
    dark: { label: 'Dark Map', sources: {
      'dark-base': esri('Canvas/World_Dark_Gray_Base', 16, '© Esri, HERE, Garmin'),
      'dark-ref': esri('Canvas/World_Dark_Gray_Reference', 16)
    } },
    satellite: { label: 'Satellite + Labels', sources: {
      'sat-img': esri('World_Imagery', 18, '© Esri, Maxar, Earthstar Geographics'),
      'sat-roads': esri('Reference/World_Transportation', 18),
      'sat-places': esri('Reference/World_Boundaries_and_Places', 18)
    } },
    blackMarble: { label: 'NASA Black Marble', sources: {
      'black-marble': gibs('VIIRS_Black_Marble/default/2016-01-01', 'png', 'NASA Earth Observatory / GIBS (VIIRS Black Marble 2016)')
    } },
    blueMarble: { label: 'NASA Blue Marble', sources: {
      'blue-marble': gibs('BlueMarble_ShadedRelief_Bathymetry/default', 'jpeg', 'NASA Blue Marble / GIBS')
    } }
  };

  /** Create a globe in `container` with the given basemap keys (first one shown). */
  function create(container, { center, zoom, basemaps }) {
    const sources = {}, layers = [{ id: 'space', type: 'background', paint: { 'background-color': '#05050f' } }];
    basemaps.forEach((key, i) => Object.entries(BASEMAPS[key].sources).forEach(([id, src]) => {
      sources[id] = src;
      layers.push({ id, type: 'raster', source: id, layout: { visibility: i === 0 ? 'visible' : 'none' } });
    }));

    const map = new maplibregl.Map({
      container, center, zoom, maxZoom: 18,
      pixelRatio: SOFTWARE_GL ? 1 : Math.min(devicePixelRatio, 2),
      fadeDuration: SOFTWARE_GL ? 0 : 300,
      attributionControl: { compact: true },
      style: {
        version: 8, sources, layers,
        projection: { type: 'globe' },
        sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] }
      }
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');

    /* Basemap switcher */
    map.addControl({
      onAdd() {
        const el = document.createElement('div');
        el.className = 'maplibregl-ctrl maplibregl-ctrl-group basemap-switch';
        el.innerHTML = basemaps.map((k, i) => `<button type="button" data-map="${k}"${i === 0 ? ' class="active"' : ''}>${BASEMAPS[k].label}</button>`).join('');
        el.addEventListener('click', e => {
          const pick = e.target.dataset.map;
          if (!pick) return;
          el.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === e.target));
          basemaps.forEach(k => Object.keys(BASEMAPS[k].sources).forEach(id =>
            map.setLayoutProperty(id, 'visibility', k === pick ? 'visible' : 'none')));
        });
        return el;
      },
      onRemove() {}
    }, 'top-right');

    /* Slow spin until the user touches the globe (skipped for reduced motion / no GPU) */
    let spinning = !SOFTWARE_GL && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.stopSpin = () => { spinning = false; };
    ['mousedown', 'touchstart', 'wheel'].forEach(ev => map.on(ev, map.stopSpin));
    (function spin() {
      if (!spinning) return;
      if (map.getZoom() < 3) { const c = map.getCenter(); map.setCenter([c.lng + 0.08, c.lat]); }
      requestAnimationFrame(spin);
    })();

    map.ready = new Promise(resolve => map.on('load', resolve));
    return map;
  }

  /** Geodesic circle as a GeoJSON polygon feature (MapLibre has no metre-radius circle). */
  function circlePolygon(lat, lng, radiusM, props, steps = 96) {
    const R = 6371008.8, d = radiusM / R;
    const φ1 = lat * Math.PI / 180, λ1 = lng * Math.PI / 180;
    const ring = [];
    for (let i = 0; i <= steps; i++) {
      const θ = (i / steps) * 2 * Math.PI;
      const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ));
      const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
      ring.push([λ2 * 180 / Math.PI, φ2 * 180 / Math.PI]);
    }
    return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } };
  }
  console.assert(Math.abs(circlePolygon(0, 0, 111195, {}).geometry.coordinates[0][0][1] - 1) < 0.001, 'circlePolygon: 111.2 km north of the equator should be ~1° lat');

  /** Duration for camera flights: long and cinematic with a GPU, short without one. */
  const flight = ms => (SOFTWARE_GL ? Math.min(ms, 600) : ms);

  window.Globe = { create, circlePolygon, flight, SOFTWARE_GL };
})();
