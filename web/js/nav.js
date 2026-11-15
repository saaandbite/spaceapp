/* nav.js — Navigation & scroll reveal */
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

  /* Mobile nav toggle (hamburger) */
  document.querySelectorAll('.nav-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const links = btn.parentElement.querySelector('.nav-links');
      if (!links) return;
      const open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    const links = btn.parentElement.querySelector('.nav-links');
    if (links) links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }));
  });
