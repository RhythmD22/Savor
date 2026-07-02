import { getMealLog, getMealTypeTotals, getDailyTotals, addMealEntry, removeMealEntry, getRecipes, getProfile } from './data.js';
import { searchFood } from './api.js';
import { formatNumber, formatDate, showToast, debounce } from './utils.js';

let currentDate = new Date();

function initMealLog() {
  currentDate = new Date();
  updateDateDisplay();
  renderMealLog();

  const prevBtn = document.getElementById('btn-date-prev');
  const nextBtn = document.getElementById('btn-date-next');
  if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));

  const todayBtn = document.getElementById('btn-date-today');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const today = new Date();
      if (formatDate(currentDate) !== formatDate(today)) {
        currentDate = today;
        updateDateDisplay();
        renderMealLog();
      }
    });
  }

}

function changeDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  updateDateDisplay();
  renderMealLog();
}

function updateDateDisplay() {
  const display = document.getElementById('meal-log-date');
  if (!display) return;

  const today = formatDate(new Date());
  const current = formatDate(currentDate);

  if (current === today) {
    display.textContent = 'Today';
  } else if (current === formatDate(new Date(Date.now() - 86400000))) {
    display.textContent = 'Yesterday';
  } else if (current === formatDate(new Date(Date.now() + 86400000))) {
    display.textContent = 'Tomorrow';
  } else {
    display.textContent = currentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}

function renderMealLog() {
  const date = currentDate;
  const totals = getDailyTotals(date);
  const profile = getProfile();
  const mealTypes = getMealTypeTotals(date);

  const calGoal = profile.calorieGoal || 2000;
  const calPercent = Math.min((totals.calories / calGoal) * 100, 100);

  const elements = {
    'total-calories-value': formatNumber(totals.calories),
    'total-protein-value': formatNumber(totals.protein),
    'total-carbs-value': formatNumber(totals.carbs),
    'total-fat-value': formatNumber(totals.fat),
  };

  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const calBar = document.getElementById('calorie-bar-fill');
  if (calBar) {
    calBar.style.width = `${calPercent}%`;
    calBar.setAttribute('aria-valuenow', Math.round(calPercent));
    calBar.className = `progress-fill ${calPercent >= 100 ? 'progress-fill-warning' : 'progress-fill-brand'}`;
  }

  const proteinBar = document.getElementById('protein-bar-fill');
  const carbsBar = document.getElementById('carbs-bar-fill');
  const fatBar = document.getElementById('fat-bar-fill');

  const proteinGoal = profile.proteinGoal || 150;
  const carbsGoal = profile.carbsGoal || 200;
  const fatGoal = profile.fatGoal || 65;

  if (proteinBar) {
    const pct = Math.min((totals.protein / proteinGoal) * 100, 100);
    proteinBar.style.width = `${pct}%`;
    proteinBar.setAttribute('aria-valuenow', Math.round(pct));
  }
  if (carbsBar) {
    const pct = Math.min((totals.carbs / carbsGoal) * 100, 100);
    carbsBar.style.width = `${pct}%`;
    carbsBar.setAttribute('aria-valuenow', Math.round(pct));
  }
  if (fatBar) {
    const pct = Math.min((totals.fat / fatGoal) * 100, 100);
    fatBar.style.width = `${pct}%`;
    fatBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  const barValues = {
    'bar-protein-current': formatNumber(totals.protein),
    'bar-protein-goal': profile.proteinGoal,
    'bar-carbs-current': formatNumber(totals.carbs),
    'bar-carbs-goal': profile.carbsGoal,
    'bar-fat-current': formatNumber(totals.fat),
    'bar-fat-goal': profile.fatGoal,
  };
  Object.entries(barValues).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value !== null ? value : '—';
  });

  const sections = document.getElementById('meal-log-sections');
  if (!sections) return;

  const order = ['breakfast', 'lunch', 'dinner', 'snack'];
  const typeLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

  sections.innerHTML = order
    .map(
      (type) => {
        const entries = mealTypes[type] || [];
        const typeCal = entries.reduce((s, e) => s + e.calories, 0);

        const entriesHTML = entries
          .map(
            (e) => `
            <div class="meal-log-entry glass glass-card">
              <div class="meal-log-entry-info">
                <div class="meal-log-entry-name truncate">${escapeHTML(e.foodName)}</div>
                <div class="meal-log-entry-macros">
                  <span class="text-secondary">P:${formatNumber(e.protein)}</span>
                  <span class="text-secondary">C:${formatNumber(e.carbs)}</span>
                  <span class="text-secondary">F:${formatNumber(e.fat)}</span>
                  <span>${e.servingSize > 1 ? '×' + e.servingSize : ''}</span>
                </div>
              </div>
              <span class="meal-log-entry-calories">${formatNumber(e.calories)} cal</span>
              <button class="meal-log-entry-actions btn-icon-only" data-remove-entry="${e.id}" aria-label="Remove entry">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>`
          )
          .join('');

        return `
          <div class="meal-log-section">
            <div class="meal-log-section-header">
              <span class="meal-log-section-title">${typeLabels[type]}</span>
              <span class="meal-log-section-calories">${typeCal > 0 ? formatNumber(typeCal) + ' cal' : ''}</span>
            </div>
            <div class="meal-log-entries">
              ${entriesHTML}
            </div>
            <button class="add-food-btn" data-meal-type="${type}">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Food
            </button>
          </div>`;
      }
    )
    .join('');

  sections.querySelectorAll('.add-food-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mealType = btn.dataset.mealType || 'snack';
      openFoodSearch(mealType);
    });
  });

  sections.querySelectorAll('[data-remove-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entryId = btn.dataset.removeEntry;
      removeMealEntry(date, entryId);
      showToast('Entry removed');
      renderMealLog();
    });
  });
}

function openFoodSearch(mealType) {
  const existing = document.querySelector('.dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Search foods');

  overlay.innerHTML = `
    <div class="dialog-sheet food-search-dialog">
      <div class="dialog-handle"></div>
      <button class="icon-btn dialog-close-btn" aria-label="Close search" style="position:absolute;top:var(--space-md);right:var(--space-md)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <input type="text" class="glass-input search-input-fixed" id="food-search-input" placeholder="Search recipes or foods..." autocomplete="off">
      <div class="food-search-results" id="food-search-results">
        <p class="text-tertiary text-sm text-center">Start typing to search your recipes</p>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const removeOverlay = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeOverlay();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeOverlay();
    }
  });

  const closeBtn = overlay.querySelector('.dialog-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', removeOverlay);

  const sheet = overlay.querySelector('.dialog-sheet');
  const handle = overlay.querySelector('.dialog-handle');
  const resultsEl = document.getElementById('food-search-results');

  let startY = 0;
  let currentTranslate = 0;
  let dragging = false;

  const onTouchStart = (e) => {
    startY = e.touches[0].clientY;
    currentTranslate = 0;
    dragging = true;
    sheet.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!dragging) return;
    const deltaY = e.touches[0].clientY - startY;

    if (deltaY > 0) {
      currentTranslate = deltaY;
      sheet.style.transform = `translateY(${deltaY}px)`;
      const opacity = Math.max(0, 1 - deltaY / 300);
      overlay.style.background = `rgba(0, 0, 0, ${0.55 * opacity})`;
      e.preventDefault();
    } else if (deltaY < -10 && resultsEl) {
      resultsEl.scrollTop += Math.abs(deltaY);
      startY = e.touches[0].clientY;
    }
  };

  const onTouchEnd = () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = 'transform 0.25s ease, opacity 0.25s ease';

    if (currentTranslate > 100) {
      sheet.style.transform = 'translateY(100%)';
      overlay.style.background = 'rgba(0, 0, 0, 0)';
      setTimeout(removeOverlay, 250);
    } else {
      sheet.style.transform = '';
      overlay.style.background = '';
    }
  };

  handle.addEventListener('touchstart', onTouchStart, { passive: false });
  handle.addEventListener('touchmove', onTouchMove, { passive: false });
  handle.addEventListener('touchend', onTouchEnd);

  const searchInput = document.getElementById('food-search-input');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
    searchInput.addEventListener(
      'input',
      debounce(async (e) => {
        const query = e.target.value.trim();
        const results = await searchFood(query);
        renderFoodResults(results, overlay, mealType);
      }, 250)
    );
  }
}

function renderFoodResults(results, overlay, mealType) {
  const container = document.getElementById('food-search-results');
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML =
      '<p class="text-tertiary text-sm text-center">No matching foods found</p>';
    return;
  }

  container.innerHTML = results
    .map(
      (r) => `
      <button class="food-search-item glass glass-card" data-food-id="${r.id}" data-food-name="${escapeHTML(r.name)}"
        data-calories="${r.calories}" data-protein="${r.protein}" data-carbs="${r.carbs}" data-fat="${r.fat}">
        <div class="food-search-info">
          <div class="food-search-name">${escapeHTML(r.name)}</div>
          <div class="food-search-brand">${escapeHTML(r.source || '')} \u00B7 ${r.per100g ? 'per 100g' : 'per serving'}</div>
        </div>
        <span class="food-search-calories">${formatNumber(r.calories)} cal</span>
      </button>`
    )
    .join('');

  container.querySelectorAll('.food-search-item').forEach((item) => {
    item.addEventListener('click', () => {
      const entry = {
        foodName: item.dataset.foodName,
        calories: parseFloat(item.dataset.calories) || 0,
        protein: parseFloat(item.dataset.protein) || 0,
        carbs: parseFloat(item.dataset.carbs) || 0,
        fat: parseFloat(item.dataset.fat) || 0,
        mealType,
        servingSize: 1,
      };

      addMealEntry(currentDate, entry);
      overlay.remove();
      document.body.style.overflow = '';
      showToast(`Added to ${mealType}`);
      renderMealLog();
    });
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export { initMealLog };