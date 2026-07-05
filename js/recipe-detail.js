import { getRecipe, updateRecipe, toggleFavorite, deleteRecipe, addMealEntry } from './data.js';
import { formatNumber, formatTime, formatDecimal, showToast, showConfirm, escapeHTML, autoSizeTextarea } from './utils.js';

let currentRecipeId = null;
let editIngredients = [];
let editInstructions = [];

export function initRecipeDetail(data) {
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
          <span class="ingredient-name">${escapeHTML(typeof ing === 'string' ? ing : ing.text || [ing.quantity, ing.unit, ing.name].filter(Boolean).join(' '))}</span>
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
    const starIcon = favBtn.querySelector('svg');
    if (starIcon) starIcon.setAttribute('fill', recipe.isFavorite ? '#fbbf24' : 'none');
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
        const starIcon = favBtn.querySelector('svg');
        if (starIcon) starIcon.setAttribute('fill', updated.isFavorite ? '#fbbf24' : 'none');
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

  const editBtn = document.getElementById('btn-edit-recipe');
  if (editBtn) {
    editBtn.addEventListener('click', () => showEditForm(recipe));
  }

  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', hideEditForm);
  }

  const saveEditBtn = document.getElementById('btn-save-edit');
  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', () => handleSaveEdit(recipe));
  }

  bindEditEditorEvents();

  const descTa = document.getElementById('edit-recipe-description');
  if (descTa) {
    descTa.addEventListener('input', (e) => autoSizeTextarea(e.target));
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

function showEditForm(recipe) {
  document.getElementById('recipe-view-content').setAttribute('hidden', '');
  document.getElementById('recipe-edit-form').removeAttribute('hidden');

  document.getElementById('edit-recipe-title').value = recipe.title || '';
  document.getElementById('edit-recipe-description').value = recipe.description || '';
  autoSizeTextarea(document.getElementById('edit-recipe-description'));

  document.getElementById('edit-recipe-servings').value = recipe.servings || '';
  document.getElementById('edit-recipe-prep').value = recipe.prepTime || '';
  document.getElementById('edit-recipe-cook').value = recipe.cookTime || '';
  document.getElementById('edit-recipe-calories').value = recipe.nutrition?.calories || '';
  document.getElementById('edit-recipe-protein').value = recipe.nutrition?.protein || '';
  document.getElementById('edit-recipe-carbs').value = recipe.nutrition?.carbs || '';
  document.getElementById('edit-recipe-fat').value = recipe.nutrition?.fat || '';
  document.getElementById('edit-recipe-fiber').value = recipe.nutrition?.fiber || '';
  document.getElementById('edit-recipe-sugar').value = recipe.nutrition?.sugar || '';
  document.getElementById('edit-recipe-sodium').value = recipe.nutrition?.sodium || '';
  document.getElementById('edit-recipe-tags').value = (recipe.tags || []).join(', ');
  document.getElementById('edit-recipe-cuisine').value = recipe.cuisine || '';
  document.getElementById('edit-recipe-meal-type').value = recipe.mealType || '';

  editIngredients = (recipe.ingredients || []).length > 0
    ? recipe.ingredients.slice()
    : [{ text: '' }];
  editInstructions = (recipe.instructions || []).length > 0
    ? recipe.instructions.slice()
    : [''];

  renderEditIngredients();
  renderEditInstructions();
  rebindEditIngredientEvents();
  rebindEditInstructionEvents();

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function hideEditForm() {
  document.getElementById('recipe-edit-form').setAttribute('hidden', '');
  document.getElementById('recipe-view-content').removeAttribute('hidden');
}

function handleSaveEdit(recipe) {
  const title = document.getElementById('edit-recipe-title')?.value?.trim();
  if (!title) {
    showToast('Please enter a recipe title', 'error');
    return;
  }

  const updates = {
    title,
    description: document.getElementById('edit-recipe-description')?.value || '',
    servings: parseInt(document.getElementById('edit-recipe-servings')?.value) || recipe.servings,
    prepTime: parseInt(document.getElementById('edit-recipe-prep')?.value) || 0,
    cookTime: parseInt(document.getElementById('edit-recipe-cook')?.value) || 0,
    totalTime: (parseInt(document.getElementById('edit-recipe-prep')?.value) || 0) +
      (parseInt(document.getElementById('edit-recipe-cook')?.value) || 0),
    ingredients: editIngredients.filter((i) => i.text?.trim()),
    instructions: editInstructions.filter((s) => s?.trim()),
    nutrition: {
      calories: parseFloat(document.getElementById('edit-recipe-calories')?.value) || 0,
      protein: parseFloat(document.getElementById('edit-recipe-protein')?.value) || 0,
      carbs: parseFloat(document.getElementById('edit-recipe-carbs')?.value) || 0,
      fat: parseFloat(document.getElementById('edit-recipe-fat')?.value) || 0,
      fiber: parseFloat(document.getElementById('edit-recipe-fiber')?.value) || 0,
      sugar: parseFloat(document.getElementById('edit-recipe-sugar')?.value) || 0,
      sodium: parseFloat(document.getElementById('edit-recipe-sodium')?.value) || 0,
    },
    tags: (document.getElementById('edit-recipe-tags')?.value || '').split(',').map((t) => t.trim()).filter(Boolean),
    cuisine: document.getElementById('edit-recipe-cuisine')?.value || '',
    mealType: document.getElementById('edit-recipe-meal-type')?.value || '',
  };

  const updated = updateRecipe(recipe.id, updates);
  if (updated) {
    showToast('Recipe updated');
    hideEditForm();
    renderRecipeDetail(updated);
    document.getElementById('page-title').textContent = updated.title;
    document.title = `${updated.title} — Savor`;
  }
}

function renderEditIngredients() {
  const container = document.getElementById('edit-ingredients-editor');
  if (!container) return;

  container.innerHTML = editIngredients
    .map((ing, i) => {
      if (ing.heading) {
        return `<div class="ingredient-heading">${escapeHTML(ing.text)}</div>`;
      }
      return `
      <div class="import-ingredient-row">
        <input type="text" class="glass-input" value="${escapeHTML(typeof ing === 'string' ? ing : ing.text || '')}"
          data-edit-ingredient-index="${i}" placeholder="e.g. 2 cups flour">
        <button class="btn btn-icon-only btn-small" data-edit-remove-ingredient="${i}" aria-label="Remove ingredient">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`;
    })
    .join('');
}

function renderEditInstructions() {
  const container = document.getElementById('edit-instructions-editor');
  if (!container) return;

  container.innerHTML = editInstructions
    .map((step, i) => `
      <div class="import-ingredient-row">
        <textarea class="glass-textarea" data-edit-instruction-index="${i}"
          placeholder="Step ${i + 1}">${escapeHTML(step)}</textarea>
        <button class="btn btn-icon-only btn-small" data-edit-remove-instruction="${i}" aria-label="Remove step">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`)
    .join('');

  container.querySelectorAll('textarea').forEach(autoSizeTextarea);
}

function bindEditEditorEvents() {
  const addIngredientBtn = document.getElementById('btn-edit-add-ingredient');
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => {
      editIngredients.push({ text: '' });
      renderEditIngredients();
      rebindEditIngredientEvents();
    });
  }

  const addInstructionBtn = document.getElementById('btn-edit-add-instruction');
  if (addInstructionBtn) {
    addInstructionBtn.addEventListener('click', () => {
      editInstructions.push('');
      renderEditInstructions();
      rebindEditInstructionEvents();
    });
  }

  rebindEditIngredientEvents();
  rebindEditInstructionEvents();
}

function rebindEditIngredientEvents() {
  const container = document.getElementById('edit-ingredients-editor');
  if (!container) return;

  container.querySelectorAll('[data-edit-ingredient-index]').forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.editIngredientIndex);
      editIngredients[idx] = { text: e.target.value };
    });
  });

  container.querySelectorAll('[data-edit-remove-ingredient]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.editRemoveIngredient);
      editIngredients.splice(idx, 1);
      if (editIngredients.length === 0) editIngredients = [{ text: '' }];
      renderEditIngredients();
      rebindEditIngredientEvents();
    });
  });
}

function rebindEditInstructionEvents() {
  const container = document.getElementById('edit-instructions-editor');
  if (!container) return;

  container.querySelectorAll('[data-edit-instruction-index]').forEach((textarea) => {
    textarea.addEventListener('input', (e) => {
      autoSizeTextarea(e.target);
      const idx = parseInt(e.target.dataset.editInstructionIndex);
      editInstructions[idx] = e.target.value;
    });
  });

  container.querySelectorAll('[data-edit-remove-instruction]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.editRemoveInstruction);
      editInstructions.splice(idx, 1);
      if (editInstructions.length === 0) editInstructions = [''];
      renderEditInstructions();
      rebindEditInstructionEvents();
    });
  });
}