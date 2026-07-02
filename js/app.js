import { initTheme } from './theme.js';
import { initHome } from './index.js';
import { initRecipes } from './recipes.js';
import { initRecipeDetail } from './recipe-detail.js';
import { initImport } from './import.js';
import { initMealLog } from './meal-log.js';
import { initHealth } from './health.js';

(() => {
  'use strict';

  const routeMap = {
    home: { template: 'template-home', heading: 'Dashboard', title: 'Savor — Dashboard' },
    recipes: { template: 'template-recipes', heading: 'Recipes', title: 'Recipes — Savor' },
    'recipe-detail': { template: 'template-recipe-detail', heading: 'Recipe', title: 'Recipe — Savor' },
    import: { template: 'template-import', heading: 'Import Recipe', title: 'Import — Savor' },
    'meal-log': { template: 'template-meal-log', heading: 'Meal Log', title: 'Meal Log — Savor' },
    health: { template: 'template-health', heading: 'Health', title: 'Health — Savor' },
  };

  const initMap = {
    home: initHome,
    recipes: initRecipes,
    'recipe-detail': initRecipeDetail,
    import: initImport,
    'meal-log': initMealLog,
    health: initHealth,
  };

  let currentRoute = 'home';
  let currentDetailId = null;

  function navigateTo(route, data) {
    if (!routeMap[route]) return;

    if (route === 'recipe-detail' && data?.id === currentDetailId) return;
    if (route === currentRoute && !data) {
      const existingPage = document.querySelector(`[data-page="${route}"]`);
      if (existingPage && route !== 'recipe-detail') return;
    }

    currentRoute = route;
    currentDetailId = route === 'recipe-detail' ? data?.id : null;

    const spec = routeMap[route];
    const template = document.getElementById(spec.template);
    if (!template) return;

    const root = document.getElementById('app-root');
    root.innerHTML = '';
    root.appendChild(template.content.cloneNode(true));

    document.getElementById('page-title').textContent = spec.heading;
    document.title = spec.title;

    const sidebarHeading = document.getElementById('sidebar-heading');
    if (sidebarHeading) sidebarHeading.textContent = spec.heading;

    document.querySelectorAll('.nav-item').forEach((btn) => {
      const isFAB = btn.classList.contains('nav-fab');
      const btnRoute = btn.dataset.route;

      let isActive;
      if (isFAB) {
        isActive = route === 'import';
      } else if (route === 'recipe-detail') {
        isActive = btnRoute === 'recipes';
      } else {
        isActive = btnRoute === route;
      }

      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    const initFn = initMap[route];
    if (initFn) {
      initFn(data);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    root.setAttribute('tabindex', '-1');
    root.focus({ preventScroll: true });

    const announcer = document.getElementById('nav-announcer') || (() => {
      const el = document.createElement('div');
      el.id = 'nav-announcer';
      el.className = 'sr-only';
      el.setAttribute('aria-live', 'assertive');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
      return el;
    })();
    announcer.textContent = spec.heading;
  }

  function init() {
    initTheme();

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route) navigateTo(route);
      });
    });

    document.body.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (link) {
        e.preventDefault();
        const route = link.dataset.route;
        const id = link.dataset.id;
        navigateTo(route, id ? { id } : undefined);
      }
    });

    navigateTo('home');
  }

  window.navigateTo = navigateTo;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }
})();