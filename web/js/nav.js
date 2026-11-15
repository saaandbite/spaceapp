/* nav.js — Navigation & scroll reveal */

/* English UI text for labels that the exported JSON stores in Indonesian */
window.EN = {
  analogy: {
    'Iron / Stony-Iron': 'As heavy as a grand piano',
    'Achondrite': 'As heavy as a bowling ball',
    'Carbonaceous Chondrite': 'As heavy as a house cat',
    'Ordinary Chondrite': 'As heavy as a laptop'
  },
  cluster: [
    ['Antarctica (avg. lon 97°)', 'Systematic collecting by ice expeditions (search bias).'],
    ['Antarctica (avg. lon 107°)', 'Systematic collecting by ice expeditions (search bias).'],
    ['Sahara & Arabia', 'Dry deserts: dark rocks are easy to spot on bare ground.'],
    ['Populated continents', 'Where people live: most records are witnessed falls.'],
    ['North America (plains & deserts)', 'US plains and deserts: many finds by meteorite hunters.']
  ],
  feature: {
    'abs_latitude': 'Distance from equator (|latitude|)',
    'latitude': 'Latitude',
    'log10_mass_g': 'Mass (log10 g)',
    'longitude': 'Longitude',
    'mat_Iron / Stony-Iron': 'Material: Iron / Stony-Iron',
    'mat_Ordinary Chondrite': 'Material: Ordinary Chondrite',
    'mat_Achondrite': 'Material: Achondrite',
    'mat_Carbonaceous Chondrite': 'Material: Carbonaceous Chondrite'
  }
};

/* Shared JSON loader + visible error banner (pages are blank without their data) */
window.fetchData = url => fetch('../datasets/exports/' + url).then(r => {
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
});
window.showLoadError = err => {
  console.error(err);
  if (document.getElementById('load-error')) return;
  const box = document.createElement('div');
  box.id = 'load-error';
  box.setAttribute('role', 'alert');
  box.innerHTML = location.protocol === 'file:'
    ? '<strong>Data could not load.</strong> This page has to run on a web server. In the project folder run <code>python -m http.server 8000</code> and open <code>http://localhost:8000</code>.'
    : `<strong>Some data could not load.</strong> Check your connection and reload the page. <span class="text-muted">(${err && err.message ? err.message : err})</span>`;
  document.body.appendChild(box);
};

(function () {
  'use strict';

  /* Highlight active nav link based on current filename */
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* Intersection Observer for .reveal elements */
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* Smooth scroll for same-page anchor links */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* Collapsible sections */
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      const body = header.nextElementSibling;
      if (body) body.classList.toggle('open');
    });
  });
})();
