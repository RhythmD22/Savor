import { addRecipe } from './data.js';
import { extractRecipeLocally, fetchRecipeFromUrl } from './api.js';
import { showToast, escapeHTML, autoSizeTextarea } from './utils.js';

let previewRecipe = null;
let manualImageData = null;
let manualIngredients = [{ text: '' }];
let manualInstructions = [''];

export function initImport() {
  previewRecipe = null;
  manualIngredients = [{ text: '' }];
  manualInstructions = [''];

  switchTab('url');
  bindImportEvents();
  resetForms();
  refreshApiStatus();
}

function switchTab(tabId) {
  document.querySelectorAll('.import-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  document.querySelectorAll('.import-tab-content').forEach((content) => {
    content.classList.toggle('active', content.dataset.tab === tabId);
  });
}

function bindImportEvents() {
  document.querySelectorAll('.import-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  const urlBtn = document.getElementById('btn-extract-url');
  if (urlBtn) {
    urlBtn.addEventListener('click', handleUrlExtract);
  }

  const urlInput = document.getElementById('import-url-input');
  if (urlInput) {
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUrlExtract();
    });
  }

  const manualForm = document.getElementById('manual-recipe-form');
  if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleManualSave();
    });
  }

  ['edit-description', 'manual-description'].forEach((id) => {
    const ta = document.getElementById(id);
    if (ta) ta.addEventListener('input', (e) => autoSizeTextarea(e.target));
  });

  const addIngredientBtn = document.getElementById('btn-add-ingredient');
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', () => addIngredientRow());
  }

  const addInstructionBtn = document.getElementById('btn-add-instruction');
  if (addInstructionBtn) {
    addInstructionBtn.addEventListener('click', () => addInstructionRow());
  }

  const manualAddIngredientBtn = document.getElementById('btn-manual-add-ingredient');
  if (manualAddIngredientBtn) {
    manualAddIngredientBtn.addEventListener('click', () => addIngredientRow('manual-'));
  }

  const manualAddInstructionBtn = document.getElementById('btn-manual-add-instruction');
  if (manualAddInstructionBtn) {
    manualAddInstructionBtn.addEventListener('click', () => addInstructionRow('manual-'));
  }

  const manualImageInput = document.getElementById('manual-image');
  const manualImageArea = document.getElementById('manual-image-area');
  if (manualImageInput && manualImageArea) {
    manualImageArea.addEventListener('click', () => manualImageInput.click());
    manualImageInput.addEventListener('change', handleManualImageFile);
  }

  const saveBtn = document.getElementById('btn-save-imported');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveImported);
  }

  const cancelBtn = document.getElementById('btn-cancel-preview');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      previewRecipe = null;
      resetForms();
      hidePreview();
    });
  }
}

async function refreshApiStatus() {
  try {
    const response = await fetch('/api/food-search-status');
    if (!response.ok) return;
    const status = await response.json();
    updateBadge('usda-status', status.usda);
    updateBadge('spoonacular-status', status.spoonacular);
  } catch (err) {
    console.warn('API status check failed:', err);
  }
}

function updateBadge(id, isConfigured) {
  const badge = document.getElementById(id);
  if (!badge) return;
  if (isConfigured) {
    badge.textContent = 'Active';
    badge.classList.add('import-api-badge--active');
  } else {
    badge.textContent = 'Not configured';
    badge.classList.remove('import-api-badge--active');
  }
}

async function handleUrlExtract() {
  const input = document.getElementById('import-url-input');
  const statusEl = document.getElementById('import-status');
  const previewEl = document.getElementById('import-preview');

  if (!input || !input.value.trim()) {
    showStatus('Please enter a URL', 'error');
    return;
  }

  const url = input.value.trim();
  showStatus('Extracting recipe...', 'loading');

  let result;

  result = await fetchRecipeFromUrl(url);

  if (!result.success) {
    result = await extractRecipeLocally(url);
  }

  if (!result.success || !result.recipe) {
    showStatus(result.error || 'Could not extract recipe from this URL', 'error');
    return;
  }

  previewRecipe = result.recipe;
  showPreview(previewRecipe);
  showStatus('Recipe extracted! Review and edit below.', 'success');
}

function showPreview(recipe) {
  const previewEl = document.getElementById('import-preview');
  if (!previewEl) return;

  document.getElementById('import-preview-title').textContent = recipe.title || 'Untitled';
  document.getElementById('import-preview-meta').textContent = [
    recipe.servings ? `${recipe.servings} servings` : '',
    recipe.prepTime ? `Prep: ${recipe.prepTime}m` : '',
    recipe.cookTime ? `Cook: ${recipe.cookTime}m` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const imgEl = document.getElementById('import-preview-image');
  if (imgEl) {
    if (recipe.image) {
      imgEl.innerHTML = `<img class="import-preview-image" src="${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.title)}">`;
    } else {
      imgEl.innerHTML = `<div class="import-preview-image-placeholder">${(recipe.title || 'R').charAt(0).toUpperCase()}</div>`;
    }
  }

  document.getElementById('edit-title').value = recipe.title || '';
  document.getElementById('edit-description').value = recipe.description || '';
  document.getElementById('edit-servings').value = recipe.servings || '';
  document.getElementById('edit-prep-time').value = recipe.prepTime || '';
  document.getElementById('edit-cook-time').value = recipe.cookTime || '';

  document.getElementById('edit-calories').value = recipe.nutrition?.calories || '';
  document.getElementById('edit-protein').value = recipe.nutrition?.protein || '';
  document.getElementById('edit-carbs').value = recipe.nutrition?.carbs || '';
  document.getElementById('edit-fat').value = recipe.nutrition?.fat || '';
  document.getElementById('edit-fiber').value = recipe.nutrition?.fiber || '';
  document.getElementById('edit-sugar').value = recipe.nutrition?.sugar || '';
  document.getElementById('edit-sodium').value = recipe.nutrition?.sodium || '';
  document.getElementById('edit-tags').value = (recipe.tags || []).join(', ');
  document.getElementById('edit-cuisine').value = recipe.cuisine || '';
  document.getElementById('edit-meal-type').value = recipe.mealType || '';

  manualIngredients = (recipe.ingredients || []).length > 0
    ? recipe.ingredients
    : [{ text: '' }];

  manualInstructions = (recipe.instructions || []).length > 0
    ? recipe.instructions
    : [''];

  renderIngredientsEditor();
  renderInstructionsEditor();

  previewEl.removeAttribute('hidden');

  autoSizeTextarea(document.getElementById('edit-description'));
  const instructionsEditor = document.getElementById('instructions-editor');
  if (instructionsEditor) {
    instructionsEditor.querySelectorAll('textarea').forEach(autoSizeTextarea);
  }
}

function hidePreview() {
  const previewEl = document.getElementById('import-preview');
  if (previewEl) previewEl.setAttribute('hidden', '');
  const statusEl = document.getElementById('import-status');
  if (statusEl) statusEl.innerHTML = '';
}

function handleManualImageFile() {
  const input = document.getElementById('manual-image');
  const preview = document.getElementById('manual-image-preview');
  const placeholder = document.getElementById('manual-image-placeholder');
  if (!input || !preview || !placeholder) return;

  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    manualImageData = reader.result;
    placeholder.setAttribute('hidden', '');
    preview.innerHTML = `<img class="import-preview-image" src="${escapeHTML(reader.result)}" alt="Recipe image preview">`;
    preview.removeAttribute('hidden');
  };
  reader.readAsDataURL(file);
}

function showStatus(message, type) {
  const statusEl = document.getElementById('import-status');
  if (!statusEl) return;

  const icons = {
    loading: `<span class="spinner spinner-brand"></span>`,
    success: `<svg class="import-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg class="import-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };

  statusEl.className = `import-status ${type}`;
  statusEl.innerHTML = `${icons[type] || ''} ${message}`;
}

function addIngredientRow(prefix = '') {
  manualIngredients.push({ text: '' });
  renderIngredientsEditor(prefix);
}

function addInstructionRow(prefix = '') {
  manualInstructions.push('');
  renderInstructionsEditor(prefix);
}

function renderIngredientsEditor(prefix = '') {
  const containerId = prefix ? `${prefix}ingredients-editor` : 'ingredients-editor';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = manualIngredients
    .map(
      (ing, i) => {
        if (ing.heading) {
          return `<div class="ingredient-heading">${escapeHTML(ing.text)}</div>`;
        }
        return `
      <div class="import-ingredient-row">
        <input type="text" class="glass-input" value="${escapeHTML(typeof ing === 'string' ? ing : ing.text || '')}"
          data-${prefix}ingredient-index="${i}" placeholder="e.g. 2 cups flour">
        <button class="btn btn-icon-only btn-small" data-${prefix}remove-ingredient="${i}" aria-label="Remove ingredient">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`
      }
    )
    .join('');

  container.querySelectorAll(`[data-${prefix}ingredient-index]`).forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute(`data-${prefix}ingredient-index`));
      manualIngredients[idx] = { text: e.target.value };
    });
  });

  container.querySelectorAll(`[data-${prefix}remove-ingredient]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute(`data-${prefix}remove-ingredient`));
      manualIngredients.splice(idx, 1);
      renderIngredientsEditor(prefix);
    });
  });
}

function renderInstructionsEditor(prefix = '') {
  const containerId = prefix ? `${prefix}instructions-editor` : 'instructions-editor';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = manualInstructions
    .map(
      (step, i) => `
      <div class="import-ingredient-row">
        <textarea class="glass-textarea" data-${prefix}instruction-index="${i}"
          placeholder="Step ${i + 1}">${escapeHTML(step)}</textarea>
        <button class="btn btn-icon-only btn-small" data-${prefix}remove-instruction="${i}" aria-label="Remove step">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`
    )
    .join('');

  container.querySelectorAll(`[data-${prefix}instruction-index]`).forEach((textarea) => {
    autoSizeTextarea(textarea);
    textarea.addEventListener('input', (e) => {
      autoSizeTextarea(e.target);
      const idx = parseInt(e.target.getAttribute(`data-${prefix}instruction-index`));
      manualInstructions[idx] = e.target.value;
    });
  });

  container.querySelectorAll(`[data-${prefix}remove-instruction]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute(`data-${prefix}remove-instruction`));
      manualInstructions.splice(idx, 1);
      renderInstructionsEditor(prefix);
    });
  });
}

function handleSaveImported() {
  if (!previewRecipe) return;

  const recipe = {
    title: document.getElementById('edit-title')?.value || previewRecipe.title,
    description: document.getElementById('edit-description')?.value || previewRecipe.description,
    image: previewRecipe.image || '',
    sourceUrl: document.getElementById('import-url-input')?.value || previewRecipe.sourceUrl,
    sourceName: previewRecipe.sourceName || '',
    servings: parseInt(document.getElementById('edit-servings')?.value) || previewRecipe.servings || 4,
    prepTime: parseInt(document.getElementById('edit-prep-time')?.value) || previewRecipe.prepTime || 0,
    cookTime: parseInt(document.getElementById('edit-cook-time')?.value) || previewRecipe.cookTime || 0,
    totalTime: (parseInt(document.getElementById('edit-prep-time')?.value) || previewRecipe.prepTime || 0) +
      (parseInt(document.getElementById('edit-cook-time')?.value) || previewRecipe.cookTime || 0),
    ingredients: manualIngredients.filter((i) => i.text?.trim()),
    instructions: manualInstructions.filter((s) => s?.trim()),
    nutrition: {
      calories: parseFloat(document.getElementById('edit-calories')?.value) || previewRecipe.nutrition?.calories || 0,
      protein: parseFloat(document.getElementById('edit-protein')?.value) || previewRecipe.nutrition?.protein || 0,
      carbs: parseFloat(document.getElementById('edit-carbs')?.value) || previewRecipe.nutrition?.carbs || 0,
      fat: parseFloat(document.getElementById('edit-fat')?.value) || previewRecipe.nutrition?.fat || 0,
      fiber: parseFloat(document.getElementById('edit-fiber')?.value) || previewRecipe.nutrition?.fiber || 0,
      sugar: parseFloat(document.getElementById('edit-sugar')?.value) || previewRecipe.nutrition?.sugar || 0,
      sodium: parseFloat(document.getElementById('edit-sodium')?.value) || previewRecipe.nutrition?.sodium || 0,
    },
    tags: (document.getElementById('edit-tags')?.value || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    cuisine: document.getElementById('edit-cuisine')?.value || previewRecipe.cuisine || '',
    mealType: document.getElementById('edit-meal-type')?.value || previewRecipe.mealType || '',
  };

  if (!recipe.title.trim()) {
    showStatus('Please enter a recipe title', 'error');
    return;
  }

  const saved = addRecipe(recipe);
  showToast('Recipe saved!');
  previewRecipe = null;
  resetForms();
  hidePreview();

  window.navigateTo('recipe-detail', { id: saved.id });
}

function handleManualSave() {
  const title = document.getElementById('manual-title')?.value?.trim();
  if (!title) {
    showToast('Please enter a recipe title', 'error');
    return;
  }

  const recipe = {
    title,
    description: document.getElementById('manual-description')?.value || '',
    image: manualImageData || '',
    servings: parseInt(document.getElementById('manual-servings')?.value) || 4,
    prepTime: parseInt(document.getElementById('manual-prep-time')?.value) || 0,
    cookTime: parseInt(document.getElementById('manual-cook-time')?.value) || 0,
    totalTime: (parseInt(document.getElementById('manual-prep-time')?.value) || 0) +
      (parseInt(document.getElementById('manual-cook-time')?.value) || 0),
    ingredients: manualIngredients.filter((i) => i.text?.trim()),
    instructions: manualInstructions.filter((s) => s?.trim()),
    nutrition: {
      calories: parseFloat(document.getElementById('manual-calories')?.value) || 0,
      protein: parseFloat(document.getElementById('manual-protein')?.value) || 0,
      carbs: parseFloat(document.getElementById('manual-carbs')?.value) || 0,
      fat: parseFloat(document.getElementById('manual-fat')?.value) || 0,
      fiber: parseFloat(document.getElementById('manual-fiber')?.value) || 0,
      sugar: parseFloat(document.getElementById('manual-sugar')?.value) || 0,
      sodium: parseFloat(document.getElementById('manual-sodium')?.value) || 0,
    },
    tags: (document.getElementById('manual-tags')?.value || '').split(',').map((t) => t.trim()).filter(Boolean),
    cuisine: document.getElementById('manual-cuisine')?.value || '',
    mealType: document.getElementById('manual-meal-type')?.value || '',
  };

  const saved = addRecipe(recipe);
  showToast('Recipe created!');
  window.navigateTo('recipe-detail', { id: saved.id });
}

function resetForms() {
  const urlInput = document.getElementById('import-url-input');
  if (urlInput) urlInput.value = '';

  const manualForm = document.getElementById('manual-recipe-form');
  if (manualForm) manualForm.reset();

  const manualImageInput = document.getElementById('manual-image');
  if (manualImageInput) manualImageInput.value = '';
  manualImageData = null;

  const manualImagePreview = document.getElementById('manual-image-preview');
  const manualImagePlaceholder = document.getElementById('manual-image-placeholder');
  if (manualImagePreview && manualImagePlaceholder) {
    manualImagePreview.setAttribute('hidden', '');
    manualImagePreview.innerHTML = '';
    manualImagePlaceholder.removeAttribute('hidden');
  }

  manualIngredients = [{ text: '' }];
  manualInstructions = [''];
  renderIngredientsEditor();
  renderInstructionsEditor();
  renderIngredientsEditor('manual-');
  renderInstructionsEditor('manual-');
  hidePreview();
}