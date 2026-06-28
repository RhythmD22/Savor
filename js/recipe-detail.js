import { getRecipe, toggleFavorite, deleteRecipe, addMealEntry } from './data.js';
import { formatNumber, formatTime, formatDecimal, showToast, showConfirm } from './utils.js';

let currentRecipeId = null;

function initRecipeDetail(data) {
  if (!data?.id) {
    window.navigateTo('recipes');
    return;
  }

  currentRecipeId = data.id;
  const recipe = getRecipe(data.id);

  if (!recipe) {
    window.navigateTo('recipes');
    return;
  }

  document.getElementById('page-title').textContent = recipe.title;
  document.title = `${recipe.title} — Savor`;

  renderRecipeDetail(recipe);
  bindActions(recipe);
}

function renderRecipeDetail(recipe) {
  const placeholders = {
    'recipe-hero': `<div class="recipe-hero-placeholder">${recipe.title.charAt(0).toUpperCase()}</div>`,
    'recipe-title': escapeHTML(recipe.title),
  };

  if (recipe.image) {
    const hero = document.getElementById('recipe-hero');
    if (hero) hero.innerHTML = `<img class="recipe-hero-image" src="${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.title)}">`;
  }

  const titleEl = document.getElementById('recipe-title');
  if (titleEl) titleEl.textContent = recipe.title;

  const prepTimeEl = document.getElementById('info-prep-time');
  const cookTimeEl = document.getElementById('info-cook-time');
  const servingsEl = document.getElementById('info-servings');
  const caloriesEl = document.getElementById('info-calories');
  if (prepTimeEl) prepTimeEl.textContent = formatTime(recipe.prepTime);
  if (cookTimeEl) cookTimeEl.textContent = formatTime(recipe.cookTime);
  if (servingsEl) servingsEl.textContent = recipe.servings || '—';
  if (caloriesEl) caloriesEl.textContent = recipe.nutrition?.calories ? formatNumber(recipe.nutrition.calories) : '—';

  const sourceLink = document.getElementById('recipe-source-link');
  if (sourceLink) {
    sourceLink.innerHTML = recipe.sourceUrl
      ? `Source: ${escapeHTML(recipe.sourceName || recipe.sourceUrl)}`
      : '';
    sourceLink.href = recipe.sourceUrl || '#';
    sourceLink.style.display = recipe.sourceUrl ? '' : 'none';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
  }

  const nutrients = [
    { label: 'Calories', value: formatNumber(recipe.nutrition?.calories) },
    { label: 'Protein', value: `${formatDecimal(recipe.nutrition?.protein)}g` },
    { label: 'Carbohydrates', value: `${formatDecimal(recipe.nutrition?.carbs)}g` },
    { label: 'Fat', value: `${formatDecimal(recipe.nutrition?.fat)}g` },
    { label: 'Fiber', value: `${formatDecimal(recipe.nutrition?.fiber)}g` },
    { label: 'Sugar', value: `${formatDecimal(recipe.nutrition?.sugar)}g` },
    { label: 'Sodium', value: recipe.nutrition?.sodium ? `${formatNumber(recipe.nutrition.sodium)}mg` : '—' },
  ];

  const nutritionGrid = document.getElementById('nutrition-grid');
  if (nutritionGrid) {
    nutritionGrid.innerHTML = nutrients
      .map(
        (n) => `
        <div class="nutrition-item">
          <span class="nutrition-item-name">${n.label}</span>
          <span class="nutrition-item-value">${n.value}</span>
        </div>`
      )
      .join('');
  }

  const ingredientsList = document.getElementById('ingredients-list');
  if (ingredientsList) {
    if (recipe.ingredients.length === 0) {
      ingredientsList.innerHTML = '<p class="text-tertiary text-sm">No ingredients listed.</p>';
    } else {
      ingredientsList.innerHTML = recipe.ingredients
        .map(
          (ing, i) => `
        <label class="ingredient-item">
          <input type="checkbox" class="ingredient-checkbox">
          <span class="ingredient-name">${escapeHTML(typeof ing === 'string' ? ing : ing.text || ing.quantity + ' ' + ing.unit + ' ' + ing.name)}</span>
        </label>`
        )
        .join('');
    }
  }

  const instructionsList = document.getElementById('instructions-list');
  if (instructionsList) {
    if (recipe.instructions.length === 0) {
      instructionsList.innerHTML =
        '<p class="text-tertiary text-sm">No instructions provided.</p>';
    } else {
      instructionsList.innerHTML = recipe.instructions
        .map(
          (step, i) => `
          <div class="instruction-step">
            <div class="step-number">${i + 1}</div>
            <p class="step-text">${escapeHTML(step)}</p>
          </div>`
        )
        .join('');
    }
  }

  const tagsContainer = document.getElementById('recipe-tags');
  if (tagsContainer) {
    const tags = [];
    if (recipe.cuisine) tags.push(recipe.cuisine);
    if (recipe.mealType) tags.push(recipe.mealType);
    if (recipe.difficulty) tags.push(recipe.difficulty);
    tagsContainer.innerHTML = tags.map((t) => `<span class="tag tag-brand">${escapeHTML(t)}</span>`).join('');
  }

  const favBtn = document.getElementById('btn-favorite');
  if (favBtn) {
    favBtn.classList.toggle('active', recipe.isFavorite);
    favBtn.setAttribute('aria-label', recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites');
  }
}

function bindActions(recipe) {
  const favBtn = document.getElementById('btn-favorite');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      toggleFavorite(recipe.id);
      const updated = getRecipe(recipe.id);
      if (updated) {
        favBtn.classList.toggle('active', updated.isFavorite);
        favBtn.setAttribute('aria-label', updated.isFavorite ? 'Remove from favorites' : 'Add to favorites');
        showToast(updated.isFavorite ? 'Added to favorites' : 'Removed from favorites');
      }
    });
  }

  const cookBtn = document.getElementById('btn-cook-recipe');
  if (cookBtn) {
    cookBtn.addEventListener('click', () => {
      const today = new Date();

      const perServing = {
        calories: Math.round(recipe.nutrition?.calories / (recipe.servings || 1)),
        protein: Math.round((recipe.nutrition?.protein / (recipe.servings || 1)) * 10) / 10,
        carbs: Math.round((recipe.nutrition?.carbs / (recipe.servings || 1)) * 10) / 10,
        fat: Math.round((recipe.nutrition?.fat / (recipe.servings || 1)) * 10) / 10,
      };

      const entry = {
        recipeId: recipe.id,
        foodName: recipe.title,
        servingSize: 1,
        mealType: recipe.mealType || 'dinner',
        calories: perServing.calories,
        protein: perServing.protein,
        carbs: perServing.carbs,
        fat: perServing.fat,
      };

      addMealEntry(today, entry);
      showToast(`Added "${recipe.title}" to today's meal log`);
    });
  }

  const deleteBtn = document.getElementById('btn-delete-recipe');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      showConfirm('Delete this recipe?', () => {
        deleteRecipe(recipe.id);
        showToast('Recipe deleted');
        window.navigateTo('recipes');
      });
    });
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export { initRecipeDetail };