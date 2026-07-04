import { getRecipes } from './data.js';
import { formatNumber, formatTime, debounce, escapeHTML } from './utils.js';
import { initConversions } from './conversions.js';

let currentFilter = 'all';
let searchQuery = '';

export function initRecipes() {
  renderRecipes();
  initConversions();

  const searchInput = document.getElementById('recipe-search-input');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        searchQuery = e.target.value.toLowerCase();
        renderRecipes();
      }, 200)
    );
  }

  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter || 'all';
      renderRecipes();
    });
  });
}

function renderRecipes() {
  let recipes = getRecipes();

  if (searchQuery) {
    recipes = recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(searchQuery)) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery))
    );
  }

  if (currentFilter === 'favorites') {
    recipes = recipes.filter((r) => r.isFavorite);
  } else if (currentFilter !== 'all') {
    recipes = recipes.filter((r) => r.mealType === currentFilter || r.tags.includes(currentFilter));
  }

  recipes.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

  const container = document.getElementById('recipe-cards');
  const stats = document.getElementById('recipe-stats');
  if (!container) return;

  if (stats) {
    stats.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;
  }

  if (recipes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p class="empty-state-title">No recipes found</p>
        <p class="empty-state-text">Import a recipe from a URL or create one manually to get started.</p>
      </div>`;
    return;
  }

  container.innerHTML = recipes
    .map(
      (r) => `
      <button class="recipe-card glass glass-card" data-route="recipe-detail" data-id="${r.id}" aria-label="View recipe: ${escapeHTML(r.title)}">
        ${r.image ? `<img class="recipe-card-image" src="${escapeHTML(r.image)}" alt="${escapeHTML(r.title)}" loading="lazy">` : `<div class="recipe-card-image-placeholder" aria-hidden="true">${r.title.charAt(0).toUpperCase()}</div>`}
        <div class="recipe-card-content">
          <div class="recipe-card-title truncate">${escapeHTML(r.title)}</div>
          ${r.sourceName ? `<div class="recipe-card-source">${escapeHTML(r.sourceName)}</div>` : ''}
          <div class="recipe-card-meta">
            <span>${r.nutrition?.calories ? formatNumber(r.nutrition.calories) + ' cal' : ''}</span>
            <span>${formatTime(r.totalTime || r.prepTime + r.cookTime)}</span>
            <span>${r.servings ? r.servings + ' servings' : ''}</span>
          </div>
          <div class="recipe-card-tags">
            ${r.tags
          .slice(0, 3)
          .map((t) => `<span class="tag tag-brand">${escapeHTML(t)}</span>`)
          .join('')}
            ${r.isFavorite ? '<span class="tag tag-warning">★ Favorite</span>' : ''}
          </div>
        </div>
      </button>`
    )
    .join('');
}