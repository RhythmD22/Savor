import { getDailyTotals, getMealTypeTotals, getRecipes, getProfile } from './data.js';
import { formatNumber, escapeHTML } from './utils.js';

function initHome() {
  const today = new Date();
  const totals = getDailyTotals(today);
  const profile = getProfile();
  const recipes = getRecipes();

  const calorieGoal = profile.calorieGoal || 2000;
  const percent = Math.min((totals.calories / calorieGoal) * 100, 100);
  const remaining = calorieGoal - totals.calories;

  const ringEl = document.getElementById('calorie-ring-fill');
  if (ringEl) {
    const circumference = 2 * Math.PI * 80;
    const offset = circumference - (percent / 100) * circumference;
    ringEl.style.strokeDasharray = circumference;
    ringEl.style.strokeDashoffset = offset;
  }

  const calValue = document.getElementById('calorie-value');
  if (calValue) calValue.textContent = formatNumber(totals.calories);

  const calRemaining = document.getElementById('calorie-remaining');
  if (calRemaining) {
    calRemaining.textContent = remaining > 0 ? `${formatNumber(remaining)} left` : `${formatNumber(Math.abs(remaining))} over`;
    calRemaining.classList.toggle('over', remaining < 0);
  }

  const macroProtein = document.getElementById('macro-protein-value');
  const macroCarbs = document.getElementById('macro-carbs-value');
  const macroFat = document.getElementById('macro-fat-value');
  if (macroProtein) macroProtein.textContent = `${formatNumber(totals.protein)}g`;
  if (macroCarbs) macroCarbs.textContent = `${formatNumber(totals.carbs)}g`;
  if (macroFat) macroFat.textContent = `${formatNumber(totals.fat)}g`;

  const macroProteinGoal = document.getElementById('macro-protein-goal');
  const macroCarbsGoal = document.getElementById('macro-carbs-goal');
  const macroFatGoal = document.getElementById('macro-fat-goal');
  if (macroProteinGoal) macroProteinGoal.textContent = `goal ${formatNumber(profile.proteinGoal)}`;
  if (macroCarbsGoal) macroCarbsGoal.textContent = `goal ${formatNumber(profile.carbsGoal)}`;
  if (macroFatGoal) macroFatGoal.textContent = `goal ${formatNumber(profile.fatGoal)}`;

  const recentRecipesContainer = document.getElementById('recent-recipes');
  if (recentRecipesContainer) {
    const recent = recipes.slice(0, 4);
    if (recent.length === 0) {
      recentRecipesContainer.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-text">No recipes yet. Import or create your first recipe.</p>
        </div>`;
    } else {
      recentRecipesContainer.innerHTML = recent
        .map(
          (r) => `
          <button class="glass glass-card mini-recipe-card" data-route="recipe-detail" data-id="${r.id}">
            <div class="mini-recipe-image-placeholder" aria-hidden="true">
              ${r.title.charAt(0).toUpperCase()}
            </div>
            <span class="mini-recipe-name truncate">${escapeHTML(r.title)}</span>
            <span class="mini-recipe-meta">${r.nutrition?.calories ? formatNumber(r.nutrition.calories) + ' cal' : ''}</span>
          </button>`
        )
        .join('');
    }
  }

  const mealBreakdown = document.getElementById('meal-breakdown');
  if (mealBreakdown) {
    const mealTypes = getMealTypeTotals(today);
    const sections = [];
    const order = ['breakfast', 'lunch', 'dinner', 'snack'];
    order.forEach((type) => {
      if (mealTypes[type] && mealTypes[type].length > 0) {
        const typeCal = mealTypes[type].reduce((s, e) => s + e.calories, 0);
        const entriesHTML = mealTypes[type]
          .map(
            (e) => `
            <div class="meal-entry glass glass-card">
              <span class="meal-entry-name truncate">${escapeHTML(e.foodName)}</span>
              <span class="meal-entry-detail">${e.servingSize > 1 ? e.servingSize + 'x' : ''}</span>
              <span class="meal-entry-calories">${formatNumber(e.calories)} cal</span>
            </div>`
          )
          .join('');
        sections.push(`
          <div class="meal-group">
            <div class="meal-group-title">${type.charAt(0).toUpperCase() + type.slice(1)} · ${formatNumber(typeCal)} cal</div>
            ${entriesHTML}
          </div>`);
      }
    });

    if (sections.length === 0) {
      mealBreakdown.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-text">No meals logged today. Tap the + button to start tracking.</p>
        </div>`;
    } else {
      mealBreakdown.innerHTML = sections.join('');
    }
  }
}

export { initHome };