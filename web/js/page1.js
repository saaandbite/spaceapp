/**
 * page1.js — Parallax Documentary, rebuilt (2026-11-15)
 *
 * Structure (per DESIGN.md): pinned/sticky scenes + stepped narrative.
 * - Lenis smooth scroll + GSAP ScrollTrigger scrub when available.
 * - Pure-CSS sticky layout + IntersectionObserver stepper as fallback,
 *   so the story survives a blocked CDN.
 * - Charts are enhancement: safeChart guards every Chart.js call.
 * All numbers come from datasets/exports/.
 */
(async function () {
  'use strict';

  const DATA = '../datasets/exports/';

  /* ---------- helpers ---------- */
  const fetchJSON = url => fetch(DATA + url).then(r => r.json());
  const fmt = n => Number(n).toLocaleString();
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safeChart = (id, cfg) => {
    if (typeof Chart === 'undefined') return null;
    try { return new Chart(document.getElementById(id), cfg); }
    catch (e) { return null; }
  };

  /* ---------- load data ---------- */
  const [trendData, matData, rfData, clusterData, indoData, fireballsData] = await Promise.all([
    fetchJSON('trend_decades.json'),
    fetchJSON('material_classes.json'),
    fetchJSON('rf_model.json'),
    fetchJSON('clusters.json'),
    fetchJSON('indonesia.json'),
    fetchJSON('fireballs.json')
  ]);
  void clusterData; // clusters are told as steps in ch3; the JSON stays the source of truth

  /* ==========================================================
     CHARTS — restyled to the page's editorial system (v4.2).
     The old charts were default Chart.js: rainbow bars, grey
     gridlines, two axes with titles, values hidden in tooltips
     — dashboard slop. These follow the DESIGN.md tokens (IBM
     Plex Mono, ink bg, one amber accent) and NYT/Pudding
     practice: no legends, no gridlines, no second axis, values
     labelled directly on the chart, one quiet colour + amber
     for whatever the current step is about.
     ========================================================== */
  const AMBER = '#ff9e3d';
  const INK_BAR = '#3d4457';        // quiet slate: every bar at rest
  const INK_BAR_DIM = 'rgba(61,68,87,0.45)';
  const MUTED = '#9a9aad';
  const ANT_TOP = '#5a6178';        // Antarctica (lighter, top segment)
  const REST_BOTTOM = '#2f3547';    // rest of the world (darker, base)
  const HAIRLINE = 'rgba(255,255,255,.16)';
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'IBM Plex Mono', monospace";
    Chart.defaults.color = MUTED;
  }
  const TOOLTIP = {
    backgroundColor: '#16161f',
    borderColor: 'rgba(255,158,61,.4)', borderWidth: 1,
    titleColor: AMBER, bodyColor: '#e8e8f0',
    titleFont: { weight: '600' }, padding: 10, displayColors: false
  };

  /* Direct value labels, drawn on the canvas after each render:
     horizontal bars get their value at the bar's end, stacked
     vertical bars get the column total on top (the biggest
     column's total in amber). No datalabels dependency.
     NOTE: the format is a string key, not a function — Chart.js
     resolves option values through a proxy that CALLS any
     function it finds, so storing fmt itself here made Chart.js
     invoke it with the chart context and throw. */
  const LABEL_FORMATS = {
    int: fmt,
    pct: v => v.toFixed(1) + '%'
  };
  const directLabels = {
    id: 'directLabels',
    afterDatasetsDraw(chart) {
      const opts = (chart.options.plugins && chart.options.plugins.directLabels) || {};
      const format = LABEL_FORMATS[opts.format] || LABEL_FORMATS.int;
      const { ctx } = chart;
      const small = chart.width < 520;
      ctx.save();
      ctx.font = `600 ${small ? 10 : 11}px 'IBM Plex Mono', monospace`;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      // Dark halo so a label stays legible where it crosses the falls line.
      const drawLabel = (text, x, y) => {
        ctx.strokeStyle = '#0c0c11';
        ctx.lineWidth = 4;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      };
      if (opts.mode === 'horizontal') {
        const meta = chart.getDatasetMeta(0);
        if (meta.type !== 'bar') { ctx.restore(); return; }
        meta.data.forEach((bar, i) => {
          const v = chart.data.datasets[0].data[i];
          if (v == null) return;
          const active = Array.isArray(chart.data.datasets[0].backgroundColor)
            && chart.data.datasets[0].backgroundColor[i] === AMBER;
          ctx.fillStyle = active ? AMBER : MUTED;
          ctx.textAlign = 'left';
          drawLabel(format(v), bar.x + 8, bar.y);
        });
      } else if (opts.mode === 'stackedTotal') {
        let topMeta = null;
        chart.data.datasets.forEach((ds, di) => {
          if (chart.getDatasetMeta(di).type === 'bar') topMeta = chart.getDatasetMeta(di);
        });
        if (!topMeta) { ctx.restore(); return; }
        const totals = chart.data.labels.map((_, i) =>
          chart.data.datasets.reduce((s, ds, di) =>
            chart.getDatasetMeta(di).type === 'bar' ? s + (ds.data[i] || 0) : s, 0));
        const max = Math.max(...totals);
        topMeta.data.forEach((bar, i) => {
          ctx.fillStyle = totals[i] === max ? AMBER : MUTED;
          ctx.textAlign = 'center';
          drawLabel(format(totals[i]), bar.x, bar.y - 10);
        });
      }
      ctx.restore();
    }
  };

  const decades = trendData.decades;
  const decadeLabels = decades.map(d => d.decade + 's' + (d.is_partial ? '*' : ''));
  const fullDecadeData = {
    labels: decadeLabels,
    antarctica: decades.map(d => d.antarctica),
    nonAntarctica: decades.map(d => d.non_antarctica),
    fell: decades.map(d => d.fell)
  };

  const decadesChart = safeChart('canvas-decades', {
    type: 'bar',
    data: {
      labels: fullDecadeData.labels,
      datasets: [
        { label: 'Rest of world', data: fullDecadeData.nonAntarctica, backgroundColor: REST_BOTTOM, stack: 'total', order: 2, borderRadius: 0, borderSkipped: false, categoryPercentage: 0.72, barPercentage: 0.95 },
        { label: 'Antarctica', data: fullDecadeData.antarctica, backgroundColor: ANT_TOP, stack: 'total', order: 2, borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, borderSkipped: false, categoryPercentage: 0.72, barPercentage: 0.95 },
        { label: 'Observed falls', data: fullDecadeData.fell, type: 'line', borderColor: AMBER, backgroundColor: 'rgba(255,158,61,0)', pointBackgroundColor: AMBER, pointBorderColor: AMBER, pointRadius: 3, pointHoverRadius: 4, borderWidth: 2.5, tension: 0.3, fill: false, yAxisID: 'yFell', order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600 },
      layout: { padding: { top: 14 } },
      plugins: {
        legend: { display: false },
        tooltip: { ...TOOLTIP, mode: 'index', intersect: false },
        directLabels: { mode: 'stackedTotal', format: 'int' }
      },
      scales: {
        x: { ticks: { font: { size: 10 } }, grid: { display: false }, border: { color: HAIRLINE } },
        y: { stacked: true, display: false },
        yFell: { display: false, min: 0, max: 120 }
      }
    },
    plugins: [directLabels]
  });

  const maxCount = Math.max(...matData.classes.map(m => m.count));
  const materialsChart = safeChart('canvas-materials', {
    type: 'bar',
    data: {
      labels: matData.classes.map(m => m.material_class),
      datasets: [{
        label: 'Records',
        data: matData.classes.map(m => m.count),
        backgroundColor: matData.classes.map(() => INK_BAR),
        borderRadius: 4, borderSkipped: false,
        categoryPercentage: 0.62, barPercentage: 0.8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: { ...TOOLTIP, callbacks: { label: c => ' ' + fmt(c.parsed.x) + ' records' } },
        directLabels: { mode: 'horizontal', format: 'int' }
      },
      scales: {
        x: { display: false, max: maxCount * 1.18 },
        y: {
          ticks: {
            font: { size: 11 },
            color: (c) => (materialsChart && Array.isArray(materialsChart.data.datasets[0].backgroundColor) && materialsChart.data.datasets[0].backgroundColor[c.index] === AMBER) ? AMBER : MUTED
          },
          grid: { display: false }, border: { display: false }
        }
      }
    },
    plugins: [directLabels]
  });

  const fi = rfData.feature_importance;
  /* Display labels in clean English: the export labels mix languages
     ('Komposisi …', '|lintang|'). The `feature` key stays the logic. */
  const FI_LABEL = {
    'abs_latitude': 'Absolute latitude',
    'latitude': 'Latitude',
    'log10_mass_g': 'Log10 mass',
    'longitude': 'Longitude',
    'mat_Iron / Stony-Iron': 'Iron',
    'mat_Ordinary Chondrite': 'Ordinary',
    'mat_Achondrite': 'Achondrite',
    'mat_Carbonaceous Chondrite': 'Carbonaceous'
  };
  const isLat = f => f.feature.startsWith('abs_lat') || f.feature === 'latitude';
  const isComp = f => f.feature.startsWith('mat_');
  const featuresChart = safeChart('canvas-features', {
    type: 'bar',
    data: {
      labels: fi.map(f => FI_LABEL[f.feature] || f.label),
      datasets: [{
        label: 'Importance',
        data: fi.map(f => f.importance_pct),
        backgroundColor: fi.map(f => isLat(f) ? AMBER : INK_BAR),
        borderRadius: 4, borderSkipped: false,
        categoryPercentage: 0.62, barPercentage: 0.8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: { ...TOOLTIP, callbacks: { label: c => ' ' + c.parsed.x.toFixed(2) + '% of the signal' } },
        directLabels: { mode: 'horizontal', format: 'pct' }
      },
      scales: {
        x: { display: false, max: 36 },
        y: {
          ticks: {
            font: { size: 11 },
            color: (c) => (featuresChart && Array.isArray(featuresChart.data.datasets[0].backgroundColor) && featuresChart.data.datasets[0].backgroundColor[c.index] === AMBER) ? AMBER : MUTED
          },
          grid: { display: false }, border: { display: false }
        }
      }
    },
    plugins: [directLabels]
  });

  /* ==========================================================
     CHAPTER 6 — Indonesia Highlights (from the data itself)
     ========================================================== */
  const indoEl = document.getElementById('indo-highlights');
  if (indoEl) {
    const indoList = Array.isArray(indoData) ? indoData : (indoData.meteorites || []);
    const prambanan = indoList.find(m => m.is_default_pin) || indoList[0];
    const fireList = Array.isArray(fireballsData) ? fireballsData : (fireballsData.fireballs || []);
    const bone = fireList.find(f => (f.datetime_utc || '').indexOf('2009-10-08') === 0);
    if (prambanan) {
      indoEl.innerHTML += `
      <div class="card" style="border-left:4px solid #ff5252">
        <div style="margin-bottom:.5rem; color:#ff5252"><svg class="ic" style="font-size:2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg></div>
        <h3 style="color:#ff5252">${prambanan.name} — ${prambanan.year}</h3>
        <p class="text-muted" style="font-size:.8rem; margin:.4rem 0">${prambanan.recclass} · ${prambanan.fall_type}</p>
        <p style="font-size:.95rem"><strong>${fmt(Math.round(prambanan.mass_kg))} kg</strong> — the heaviest of Indonesia's ${fmt(indoList.length)} recorded meteorites</p>
        <p class="text-muted" style="font-size:.82rem">An iron meteorite, found near Prambanan temple. Energy equivalent: ${prambanan.energy_tons_tnt} tons of TNT.</p>
      </div>`;
    }
    if (bone) {
      indoEl.innerHTML += `
      <div class="card" style="border-left:4px solid #ffab40">
        <div style="margin-bottom:.5rem; color:#ffab40"><svg class="ic" style="font-size:2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.8 5.8l2.5 2.5M15.7 15.7l2.5 2.5M18.2 5.8l-2.5 2.5M8.3 15.7l-2.5 2.5"/></svg></div>
        <h3 style="color:#ffab40">Bolide Bone — 2009</h3>
        <p class="text-muted" style="font-size:.8rem; margin:.4rem 0">CNEOS fireball · Sulawesi, Indonesia · 8 Oct 2009</p>
        <p style="font-size:.95rem"><strong>${bone.energy_kilotons_tnt.toFixed(0)} kt of TNT</strong> at ${bone.altitude_km.toFixed(1)} km altitude</p>
        <p class="text-muted" style="font-size:.82rem">A fireball over Indonesian waters, seen only by satellites — proof that meteors keep falling where nobody walks to find them.</p>
      </div>`;
    }
  }

  /* ==========================================================
     STEP HANDLERS — one per chapter; each step changes state
     ========================================================== */
  function setDecadesStep(step) {
    if (!decadesChart) return;
    // Dataset order: [0] rest of world (base), [1] Antarctica (top), [2] falls line.
    if (step === 0) {
      const n = 7; // 1900s–1960s only: the quiet sky
      decadesChart.data.labels = fullDecadeData.labels.slice(0, n);
      decadesChart.data.datasets[0].data = fullDecadeData.nonAntarctica.slice(0, n);
      decadesChart.data.datasets[1].data = fullDecadeData.antarctica.slice(0, n);
      decadesChart.data.datasets[2].data = fullDecadeData.fell.slice(0, n);
    } else {
      decadesChart.data.labels = fullDecadeData.labels;
      decadesChart.data.datasets[0].data = fullDecadeData.nonAntarctica;
      decadesChart.data.datasets[1].data = fullDecadeData.antarctica;
      decadesChart.data.datasets[2].data = fullDecadeData.fell;
    }
    decadesChart.update();
  }
  function setSceneStep(stepEl) {
    // Generic overlay-scene updater (Ch. 3 Antarctica + Tunguska interlude):
    // each step swaps the giant figure shown behind the scrolling text.
    const section = stepEl.closest('section');
    if (!section) return;
    const big = section.querySelector('.scene-big');
    const sub = section.querySelector('.scene-sub');
    const bigText = stepEl.dataset.big || stepEl.dataset.lat;
    if (big && bigText) big.textContent = bigText;
    if (sub && stepEl.dataset.sub) sub.textContent = stepEl.dataset.sub;
  }
  function setMaterialStep(stepEl) {
    const count = document.getElementById('mat-count');
    const name = document.getElementById('mat-name');
    const note = document.getElementById('mat-note');
    if (count && stepEl.dataset.count && count.textContent !== stepEl.dataset.count) {
      count.textContent = stepEl.dataset.count;
      pulseNum(count);
    }
    if (name && stepEl.dataset.name) name.textContent = stepEl.dataset.name;
    if (note && stepEl.dataset.note) note.textContent = stepEl.dataset.note;
    if (materialsChart && stepEl.dataset.mat) {
      // Highlight by material NAME, not by step number: the chart's row
      // order (Iron, Achondrite, Carbonaceous, Ordinary) differs from the
      // narrative order (Ordinary, Iron, Achondrite, Carbonaceous).
      // One accent only: the active material goes amber, the rest stay slate.
      const idx = matData.classes.findIndex(m => m.material_class === stepEl.dataset.mat);
      if (idx >= 0) {
        materialsChart.data.datasets[0].backgroundColor =
          matData.classes.map((m, i) => i === idx ? AMBER : INK_BAR);
        materialsChart.update();
      }
    }
  }
  function setFeatureStep(step) {
    if (!featuresChart) return;
    // Step 1: latitude carries the signal — amber on the two latitude
    // bars. Step 2: composition is almost nothing — amber on the four
    // tiny bars, so the eye lands on how small they are. Otherwise
    // the base state: latitude amber, everything else slate.
    const bg = fi.map(f => {
      if (step === 1) return isLat(f) ? AMBER : INK_BAR_DIM;
      if (step === 2) return isComp(f) ? AMBER : INK_BAR_DIM;
      return isLat(f) ? AMBER : INK_BAR;
    });
    featuresChart.data.datasets[0].backgroundColor = bg;
    featuresChart.update();
  }
  function setCh1Step(stepEl) {
    const num = document.getElementById('ch1-num');
    const cap = document.getElementById('ch1-cap');
    if (num && stepEl.dataset.num && num.textContent !== stepEl.dataset.num) {
      num.textContent = stepEl.dataset.num;
      pulseNum(num);
    }
    if (cap && stepEl.dataset.cap) cap.textContent = stepEl.dataset.cap;
  }

  const STEP_HANDLERS = {
    ch1: el => setCh1Step(el),
    ch2: el => setDecadesStep(Number(el.dataset.step)),
    ch3: el => setSceneStep(el),
    ch4: el => setMaterialStep(el),
    ch5: el => setFeatureStep(Number(el.dataset.step)),
    tunguska: el => setSceneStep(el)
  };

  function activateStep(stepEl) {
    const section = stepEl.closest('section');
    if (!section) return;
    const handler = STEP_HANDLERS[section.id];
    if (handler) handler(stepEl);
    section.querySelectorAll('.step').forEach(s => s.classList.toggle('active', s === stepEl));
  }

  /* Step detection: GSAP ScrollTrigger when available, else IntersectionObserver */
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !reducedMotion;

  /* When a result figure changes value, it pulses in place (scale only,
     anchored to its left edge) — never translates. A number that moves
     while its panel stays put reads as the number running away. */
  function pulseNum(el) {
    if (!hasGsap || !el) return;
    gsap.fromTo(el, { scale: 1.05 }, { scale: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
  }
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.scrolly .step, .scene .step').forEach(stepEl => {
      ScrollTrigger.create({
        trigger: stepEl,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter: () => activateStep(stepEl),
        onEnterBack: () => activateStep(stepEl)
      });
    });
  } else if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) activateStep(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.scrolly .step, .scene .step').forEach(el => io.observe(el));
  }
  // Without IntersectionObserver (or GSAP) the first-step init below still
  // leaves every chapter in its step-0 state, so the story stays readable.

  /* Start every chapter on its first step (charts/figures show step 0) */
  document.querySelectorAll('section.scrolly, section.scene').forEach(sec => {
    const first = sec.querySelector('.step');
    if (first) activateStep(first);
  });

  /* ==========================================================
     MOTION FOUNDATION — Lenis + GSAP hero parallax (guarded)
     ========================================================== */
  if (typeof Lenis !== 'undefined' && !reducedMotion) {
    try {
      const lenis = new Lenis({ lerp: 0.1 });
      if (hasGsap) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(t => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { /* smooth scroll is enhancement only */ }
  }

  if (hasGsap) {
    // GSAP parallax, per the greensock/GSAP ScrollTrigger canon
    // (data-speed layers, section scrub, pin only where the pattern
    // demands it): every layer moves at its own speed, scrubbed to
    // scroll with a slight lag (scrub: 1), ease: 'none' so motion is
    // strictly scroll-driven. Backgrounds move less, foregrounds more.
    // The scrolly graphic stays pinned (ScrollTrigger's own pin
    // pattern) — but the motion inside it is continuous multi-speed
    // parallax, not a static panel with swapped text.
    // Hero: three layers, three speeds.
    gsap.to('.hero-video', { y: 120, scale: 1.08, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    gsap.to('.hero-trail', { y: -90, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    gsap.to('.hero-content', { y: -170, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    // Chapter heads drift slower than the body text beneath them.
    document.querySelectorAll('.scrolly-head, .scene-head').forEach(head => {
      gsap.to(head, { y: -40, ease: 'none',
        scrollTrigger: { trigger: head, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    // Photo bands: the image pans inside its frame.
    document.querySelectorAll('.photo-band').forEach(band => {
      gsap.fromTo(band, { backgroundPosition: 'center 20%' }, { backgroundPosition: 'center 80%', ease: 'none',
        scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    // Finale background pans like a band.
    gsap.fromTo('.finale', { backgroundPosition: 'center 20%' }, { backgroundPosition: 'center 80%', ease: 'none',
      scrollTrigger: { trigger: '#conclusion', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    // Pinned scrolly panels: the panel is the BACKGROUND layer — it
    // stays put while the steps (foreground) scroll past at 1:1. That
    // speed difference IS the parallax. The result figures and charts
    // inside the panel must stay anchored to it: v4 drifted them
    // (number y: -80), which made the numbers visibly run upward
    // while their panel stayed still. Depth inside the panel now
    // comes only from the decorative glow behind the content, which
    // drifts slowly the other way like a background should.
    document.querySelectorAll('.scrolly').forEach(sec => {
      const g = sec.querySelector('.scrolly-graphic');
      if (!g) return;
      const glow = g.querySelector('.graphic-glow');
      if (glow) gsap.to(glow, { y: 30, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top 85%', end: 'bottom 15%', scrub: 1 } });
    });
  }

  /* Scroll progress bar (vanilla; always on) */
  const progressBar = document.getElementById('progress-bar');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressBar && max > 0) progressBar.style.width = (window.scrollY / max * 100) + '%';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Background Video Switcher */
  const bgVideo = document.getElementById('bg-video');
  const btnFlash = document.getElementById('btn-vid-flash');
  const btnOrbit = document.getElementById('btn-vid-orbit');
  const btnClips = document.getElementById('btn-vid-clips');
  const VID_FLASH = '../assets/videos/YTDown.com_YouTube_Media_K01woThoJrM_Chelyabinsk-Meteor-The-Flash-That-Shook-a-City_001_1080p.mp4';
  const VID_ORBIT = '../assets/videos/YTDown.com_YouTube_Media_3Dx3f7NGm18_Orbit-of-the-Chelyabinsk-meteor_001_1080p.mp4';
  const VID_CLIPS = '../assets/videos/YTDown.com_YouTube_Media_zdxo0HVgip8_P-4-Video-Clips-of-the-Chelyabinsk-Meteor-Event_001_2160p.mp4';
  function switchVideo(src, btn) {
    if (!bgVideo) return;
    bgVideo.src = src;
    bgVideo.play().catch(() => {});
    [btnFlash, btnOrbit, btnClips].forEach(b => b && b.classList.toggle('active', b === btn));
  }
  if (bgVideo && btnFlash && btnOrbit) {
    btnFlash.addEventListener('click', () => switchVideo(VID_FLASH, btnFlash));
    btnOrbit.addEventListener('click', () => switchVideo(VID_ORBIT, btnOrbit));
    if (btnClips) btnClips.addEventListener('click', () => switchVideo(VID_CLIPS, btnClips));
  }

  /* Refresh ScrollTrigger measurements once charts/images settle */
  const refresh = () => { if (hasGsap) ScrollTrigger.refresh(); };
  window.addEventListener('load', () => setTimeout(refresh, 400));
  setTimeout(refresh, 1500);
})();
