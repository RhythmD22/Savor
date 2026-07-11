import { getMealLog, getMealTypeTotals, getDailyTotals, addMealEntry, removeMealEntry, getProfile, DEFAULT_CALORIE_GOAL } from './data.js';
import { searchFood } from './api.js';
import { formatNumber, formatDate, showToast, debounce, escapeHTML, MS_PER_DAY } from './utils.js';

let currentDate = new Date();

export function initMealLog() {
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
  } else if (current === formatDate(new Date(Date.now() - MS_PER_DAY))) {
    display.textContent = 'Yesterday';
  } else if (current === formatDate(new Date(Date.now() + MS_PER_DAY))) {
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

  const calGoal = profile.calorieGoal || DEFAULT_CALORIE_GOAL;
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
                <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>`
          )
          .join('');

        return `
          <div class="meal-log-section">
            <div class="meal-log-section-header">
              <h3 class="meal-log-section-title">${typeLabels[type]}</h3>
              <span class="meal-log-section-calories">${typeCal > 0 ? formatNumber(typeCal) + ' cal' : ''}</span>
            </div>
            <div class="meal-log-entries">
              ${entriesHTML}
            </div>
            <button class="add-food-btn" data-meal-type="${type}" aria-label="Add food to ${typeLabels[type]}">
              <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
  overlay.setAttribute('aria-labelledby', 'food-search-heading');

  const previousFocus = document.activeElement;

  overlay.innerHTML = `
    <div class="dialog-sheet food-search-dialog">
      <div class="dialog-handle"></div>
      <h2 id="food-search-heading" class="dialog-title">Search Foods</h2>
      <button class="icon-btn dialog-close-btn" aria-label="Close search">
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <label for="food-search-input" class="food-search-label">Find a food</label>
      <input type="text" class="glass-input search-input-fixed" id="food-search-input" placeholder="Search recipes or foods..." autocomplete="off">
      <div class="food-search-results" id="food-search-results" aria-live="polite">
        <p class="text-tertiary text-sm text-center">Start typing to search your recipes</p>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const removeOverlay = () => {
    overlay.remove();
    document.body.style.overflow = '';
    if (previousFocus) {
      setTimeout(() => previousFocus.focus(), 50);
    }
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeOverlay();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeOverlay();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = overlay.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
        renderFoodResults(results, overlay, mealType, previousFocus);
      }, 250)
    );
  }
}

function renderFoodResults(results, overlay, mealType, previousFocus) {
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
      <div class="food-search-item glass glass-card" data-food-id="${r.id}" data-food-name="${escapeHTML(r.name)}"
        data-calories="${r.calories}" data-protein="${r.protein}" data-carbs="${r.carbs}" data-fat="${r.fat}">
        <button class="food-search-select" aria-expanded="false" id="food-select-${r.id}" aria-controls="food-stepper-${r.id}">
          <div class="food-search-info">
            <div class="food-search-name">${escapeHTML(r.name)}</div>
            <div class="food-search-brand">${escapeHTML(r.source || '')} \u00B7 ${r.per100g ? 'per 100g' : 'per serving'}</div>
          </div>
          <span class="food-search-calories" data-cals="${r.calories}">${formatNumber(r.calories)} cal</span>
        </button>
        <div class="food-search-stepper" id="food-stepper-${r.id}">
          <div class="stepper-controls">
            <button class="stepper-btn stepper-minus" aria-label="Decrease servings">-</button>
            <span class="stepper-value">1</span>
            <button class="stepper-btn stepper-plus" aria-label="Increase servings">+</button>
            <span class="stepper-label">serving</span>
          </div>
          <button class="stepper-add-btn btn btn-primary">Add</button>
        </div>
      </div>`
    )
    .join('');

  let activeItem = null;

  container.querySelectorAll('.food-search-select').forEach((select) => {
    const handleSelect = () => {
      const item = select.closest('.food-search-item');

      if (activeItem && activeItem !== item) {
        activeItem.classList.remove('active');
        activeItem.querySelector('.food-search-select').setAttribute('aria-expanded', 'false');
        const val = activeItem.querySelector('.stepper-value');
        if (val) val.textContent = '1';
      }

      if (!item.classList.contains('active')) {
        item.classList.add('active');
        select.setAttribute('aria-expanded', 'true');
        activeItem = item;
      }
    };

    select.addEventListener('click', handleSelect);
  });

  container.querySelectorAll('.stepper-minus').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.food-search-item');
      const val = item.querySelector('.stepper-value');
      const count = Math.max(1, parseInt(val.textContent) - 1);
      val.textContent = count;
      updateStepperCalories(item, count);
    });
  });

  container.querySelectorAll('.stepper-plus').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.food-search-item');
      const val = item.querySelector('.stepper-value');
      const count = parseInt(val.textContent) + 1;
      val.textContent = count;
      updateStepperCalories(item, count);
    });
  });

  container.querySelectorAll('.stepper-add-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.food-search-item');
      const servingSize = parseInt(item.querySelector('.stepper-value').textContent) || 1;

      const entry = {
        foodName: item.dataset.foodName,
        calories: (parseFloat(item.dataset.calories) || 0) * servingSize,
        protein: (parseFloat(item.dataset.protein) || 0) * servingSize,
        carbs: (parseFloat(item.dataset.carbs) || 0) * servingSize,
        fat: (parseFloat(item.dataset.fat) || 0) * servingSize,
        mealType,
        servingSize,
      };

      addMealEntry(currentDate, entry);
      overlay.remove();
      document.body.style.overflow = '';
      if (previousFocus) {
        setTimeout(() => previousFocus.focus(), 50);
      }
      showToast(`Added to ${mealType}`);
      renderMealLog();
    });
  });
}

function updateStepperCalories(item, count) {
  const calEl = item.querySelector('.food-search-calories');
  if (calEl) {
    const baseCals = parseFloat(calEl.dataset.cals) || 0;
    calEl.textContent = `${formatNumber(baseCals * count)} cal`;
  }
  const label = item.querySelector('.stepper-label');
  if (label) {
    label.textContent = count === 1 ? 'serving' : 'servings';
  }
}