/**
 * page1.js — Parallax Documentary: Charts & Data Visualization
 * Uses Chart.js to render the 3 investigative "clues"
 */
(async function () {
  'use strict';

  const DATA = '../datasets/exports/';

  /* ---------- helpers ---------- */
  const fetchJSON = url => fetch(DATA + url).then(r => r.json());
  const fmt = n => Number(n).toLocaleString();
  const MATERIAL_COLORS = {
    'Iron / Stony-Iron': '#ff5252',
    'Achondrite':        '#ffab40',
    'Carbonaceous Chondrite': '#69f0ae',
    'Ordinary Chondrite': '#4fc3f7'
  };
  const MATERIAL_EMOJI = {
    'Iron / Stony-Iron': '🔩',
    'Achondrite':        '🌑',
    'Carbonaceous Chondrite': '🌿',
    'Ordinary Chondrite': '🪨'
  };

  /* ---------- load data ---------- */
  const [trendData, matData, rfData, clusterData] = await Promise.all([
    fetchJSON('trend_decades.json'),
    fetchJSON('material_classes.json'),
    fetchJSON('rf_model.json'),
    fetchJSON('clusters.json')
  ]);

  /* ==========================================================
     CLUE 1 — Decade Chart (Stacked Bar + Line)
     ========================================================== */
  const decades = trendData.decades;
  const labels = decades.map(d => d.decade + 's' + (d.is_partial ? '*' : ''));

  new Chart(document.getElementById('canvas-decades'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Antarctica Finds',
          data: decades.map(d => d.antarctica),
          backgroundColor: 'rgba(79,195,247,0.5)',
          stack: 'total',
          order: 2
        },
        {
          label: 'Non-Antarctica Finds',
          data: decades.map(d => d.non_antarctica),
          backgroundColor: 'rgba(136,136,170,0.4)',
          stack: 'total',
          order: 2
        },
        {
          label: 'Observed Falls (Human-Witnessed)',
          data: decades.map(d => d.fell),
          type: 'line',
          borderColor: '#ff5252',
          backgroundColor: 'rgba(255,82,82,0.15)',
          pointBackgroundColor: '#ff5252',
          pointRadius: 5,
          borderWidth: 3,
          tension: 0.3,
          fill: false,
          yAxisID: 'yFell',
          order: 1
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e8e8f0', font: { size: 12 } } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { stacked: true, position: 'left', title: { display: true, text: 'Total Finds', color: '#8888aa' }, ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        yFell: { position: 'right', title: { display: true, text: 'Observed Falls', color: '#ff5252' }, ticks: { color: '#ff5252' }, grid: { drawOnChartArea: false }, min: 0, max: 120 }
      }
    }
  });

  document.getElementById('verdict1').innerHTML =
    '<strong>The answer is NO.</strong> Earth is not being bombarded more frequently. ' +
    'The red line proves that human-witnessed meteorite falls stayed remarkably stable at ' +
    '<strong style="color:var(--danger)">~55–88 per decade</strong> for over a century. ' +
    'The dramatic surge after 1970 is entirely caused by systematic Antarctic blue-ice expeditions — ' +
    'scientists actively searching for meteorites on a white backdrop, not rocks falling more often.';

  /* ==========================================================
     CLUE 2 — Material Comparison Cards + Chart
     ========================================================== */
  const cardsContainer = document.getElementById('material-cards');
  matData.classes.forEach(m => {
    const color = MATERIAL_COLORS[m.material_class];
    const emoji = MATERIAL_EMOJI[m.material_class];
    cardsContainer.innerHTML += `
      <div class="card" style="border-left:4px solid ${color}">
        <div style="font-size:2rem; margin-bottom:.5rem">${emoji}</div>
        <h3 style="color:${color}">${m.material_class}</h3>
        <p class="text-muted" style="font-size:.8rem; margin:.4rem 0">${m.pct}% of data · ${fmt(m.count)} records</p>
        <p style="font-size:.95rem"><strong>${m.mean_mass_kg < 10 ? m.mean_mass_kg.toFixed(2) + ' kg' : fmt(Math.round(m.mean_mass_kg)) + ' kg'}</strong> avg</p>
        <p class="text-muted" style="font-size:.82rem">${m.analogy}</p>
        <p class="badge mt-1" style="font-size:.7rem">${m.impact_regime}</p>
      </div>`;
  });

  new Chart(document.getElementById('canvas-materials'), {
    type: 'bar',
    data: {
      labels: matData.classes.map(m => m.material_class),
      datasets: [{
        label: 'Count',
        data: matData.classes.map(m => m.count),
        backgroundColor: matData.classes.map(m => MATERIAL_COLORS[m.material_class]),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#e8e8f0', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });

  document.getElementById('verdict2').innerHTML =
    '<strong>90.84%</strong> of all meteorites are <strong style="color:var(--chondrite)">Ordinary Chondrites</strong> — ' +
    'common space rocks (tensile strength 35 MPa) that shatter in the atmosphere as <em>airbursts</em>. ' +
    'Only <strong style="color:var(--danger)">3.49%</strong> are dense <strong style="color:var(--danger)">Iron meteorites</strong> ' +
    '(350 MPa) massive enough to survive atmospheric entry and crater the ground. ' +
    'This is why the Chelyabinsk meteor <strong>exploded 30 km in the air</strong> rather than hitting the surface — ' +
    'and why 1,500 people were injured by <em>glass from shattered windows</em>, not by a crater impact.';

  /* ==========================================================
     CLUE 3 — Feature Importance + Clusters
     ========================================================== */
  const fi = rfData.feature_importance;
  new Chart(document.getElementById('canvas-features'), {
    type: 'bar',
    data: {
      labels: fi.map(f => f.label),
      datasets: [{
        label: 'Importance %',
        data: fi.map(f => f.importance_pct),
        backgroundColor: fi.map(f =>
          f.feature.startsWith('abs_lat') || f.feature === 'latitude'
            ? '#ff5252'
            : f.feature === 'log10_mass_g' ? '#ffab40'
            : f.feature === 'longitude' ? '#4fc3f7' : '#69f0ae'
        ),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Importance %', color: '#8888aa' }, ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#e8e8f0', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });

  /* ML stats badges */
  const statsEl = document.getElementById('ml-stats');
  const m = rfData.metrics;
  statsEl.innerHTML = `
    <div style="display:flex; gap:.75rem; flex-wrap:wrap; align-items:center">
      <span class="badge glow">ROC-AUC: ${m.roc_auc.toFixed(4)}</span>
      <span class="badge">Accuracy: ${(m.accuracy * 100).toFixed(2)}%</span>
      <span class="badge">PR-AUC: ${m.pr_auc.toFixed(4)}</span>
      <span class="badge" style="background:rgba(255,82,82,0.12); color:var(--danger); border-color:rgba(255,82,82,0.25)">
        Latitude = ${rfData.latitude_total_pct}% of signal
      </span>
    </div>`;

  /* Cluster cards */
  const CLUSTER_COLORS = ['#4fc3f7', '#4fc3f7', '#ffab40', '#69f0ae', '#ff8a65'];
  const clusterEl = document.getElementById('cluster-cards');
  clusterData.clusters.forEach((c, i) => {
    const color = CLUSTER_COLORS[i];
    clusterEl.innerHTML += `
      <div class="card" style="border-top:3px solid ${color}">
        <h3 style="color:${color}; font-size:1rem">Cluster ${c.cluster}: ${c.name}</h3>
        <p class="text-muted" style="font-size:.8rem">${fmt(c.count)} records (${c.pct}%)</p>
        <p style="font-size:.85rem; margin:.4rem 0">Median mass: ${c.median_mass_g < 1000 ? c.median_mass_g + ' g' : (c.median_mass_g / 1000).toFixed(1) + ' kg'}</p>
        <p style="font-size:.82rem">Fell ratio: ${c.fell_pct}%</p>
        <p class="text-muted" style="font-size:.78rem; margin-top:.4rem">${c.interpretation}</p>
      </div>`;
  });

  /* Background Video Switcher */
  const bgVideo = document.getElementById('bg-video');
  const btnFlash = document.getElementById('btn-vid-flash');
  const btnOrbit = document.getElementById('btn-vid-orbit');
  if (bgVideo && btnFlash && btnOrbit) {
    btnFlash.addEventListener('click', () => {
      bgVideo.src = '../assets/videos/YTDown.com_YouTube_Media_K01woThoJrM_Chelyabinsk-Meteor-The-Flash-That-Shook-a-City_001_1080p.mp4';
      bgVideo.play().catch(() => {});
      btnFlash.classList.add('active');
      btnOrbit.classList.remove('active');
    });
    btnOrbit.addEventListener('click', () => {
      bgVideo.src = '../assets/videos/YTDown.com_YouTube_Media_3Dx3f7NGm18_Orbit-of-the-Chelyabinsk-meteor_001_1080p.mp4';
      bgVideo.play().catch(() => {});
      btnOrbit.classList.add('active');
      btnFlash.classList.remove('active');
    });
  }
})();
