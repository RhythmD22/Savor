import { getRecipe, updateRecipe, toggleFavorite, deleteRecipe, addMealEntry } from './data.js';
import { formatNumber, formatTime, formatDecimal, showToast, showConfirm, escapeHTML, autoSizeTextarea } from './utils.js';

let currentRecipeId = null;
let editIngredients = [];
let editInstructions = [];
let editImageData = null;

export function initRecipeDetail(data) {
  if (!data?.id) {
    window.navigateTo('recipes');
    return;
  }

  _viewDragBound = false;
  _editDragBound = false;
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
          <div class="instruction-step" data-step-index="${i}">
            <div class="step-drag-handle" draggable="true" tabindex="0" role="button"
              aria-label="Drag to reorder step ${i + 1}" title="Drag to reorder (Arrow keys to move)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
              </svg>
            </div>
            <div class="step-number">${i + 1}</div>
            <p class="step-text">${escapeHTML(step)}</p>
          </div>`
        )
        .join('');

      bindInstructionsDrag();
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

  const imageArea = document.getElementById('edit-recipe-image-area');
  const imageFile = document.getElementById('edit-recipe-image-file');
  if (imageArea && imageFile) {
    imageArea.addEventListener('click', () => imageFile.click());
    imageFile.addEventListener('change', handleEditImageFile);
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

let _viewDragBound = false;
let _viewDragSrc = null;
let _viewDropIdx = null;
let _editDragBound = false;
let _editDragSrc = null;
let _editDropIdx = null;

function bindInstructionsDrag() {
  const list = document.getElementById('instructions-list');
  if (!list) return;

  function getInsertIndex(clientY) {
    const steps = [...list.querySelectorAll('.instruction-step')];
    if (steps.length === 0) return 0;
    for (let i = 0; i < steps.length; i++) {
      const rect = steps[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return steps.length;
  }

  function showIndicator(insertIdx) {
    const steps = list.querySelectorAll('.instruction-step');
    steps.forEach((s) => {
      s.classList.remove('step-drag-over', 'step-drag-over-end');
    });
    if (insertIdx < steps.length) {
      steps[insertIdx].classList.add('step-drag-over');
    } else if (steps.length > 0) {
      steps[steps.length - 1].classList.add('step-drag-over-end');
    }
  }

  function clearIndicators() {
    list.querySelectorAll('.instruction-step').forEach((s) => {
      s.classList.remove('step-drag-over', 'step-drag-over-end');
    });
  }

  function cleanupView() {
    clearIndicators();
    const step = list.querySelector('.instruction-step.step-dragging');
    if (step) step.classList.remove('step-dragging');
    _viewDragSrc = null;
    _viewDropIdx = null;
  }

  // ── Container listeners (bind once) ──

  if (!_viewDragBound) {
    _viewDragBound = true;

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (_viewDragSrc === null) return;
      _viewDropIdx = getInsertIndex(e.clientY);
      showIndicator(_viewDropIdx);
    });

    list.addEventListener('dragleave', (e) => {
      if (!list.contains(e.relatedTarget)) {
        clearIndicators();
      }
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      if (_viewDragSrc === null || _viewDropIdx === null) { cleanupView(); return; }
      const adjusted = _viewDragSrc < _viewDropIdx ? _viewDropIdx - 1 : _viewDropIdx;
      if (_viewDragSrc !== adjusted) {
        performViewReorder(list, _viewDragSrc, adjusted);
      }
      cleanupView();
    });
  }

  // ── Handle listeners (rebound each render) ──

  list.querySelectorAll('.step-drag-handle').forEach((handle) => {
    const step = handle.closest('.instruction-step');

    handle.addEventListener('dragstart', (e) => {
      _viewDragSrc = parseInt(step.dataset.stepIndex);
      step.classList.add('step-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });

    handle.addEventListener('dragend', () => {
      cleanupView();
    });

    handle.addEventListener('keydown', (e) => {
      const idx = parseInt(step.dataset.stepIndex);
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        moveInstructionStep(list, idx, idx - 1);
      } else if (e.key === 'ArrowDown' && idx < list.querySelectorAll('.instruction-step').length - 1) {
        e.preventDefault();
        moveInstructionStep(list, idx, idx + 1);
      }
    });

    // ── Touch support ──
    let touchClone = null;
    let touchOffsetY = 0;

    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      _viewDragSrc = parseInt(step.dataset.stepIndex);
      step.classList.add('step-dragging');
      touchOffsetY = touch.clientY - step.getBoundingClientRect().top;

      touchClone = step.cloneNode(true);
      touchClone.style.position = 'fixed';
      touchClone.style.zIndex = '9999';
      touchClone.style.width = step.offsetWidth + 'px';
      touchClone.style.opacity = '0.9';
      touchClone.style.pointerEvents = 'none';
      touchClone.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
      touchClone.style.background = 'var(--glass-bg-solid, #fff)';
      touchClone.style.borderRadius = 'var(--radius-sm, 8px)';
      touchClone.style.left = step.getBoundingClientRect().left + 'px';
      touchClone.style.top = touch.clientY - touchOffsetY + 'px';
      document.body.appendChild(touchClone);

      e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchmove', (e) => {
      if (!touchClone || _viewDragSrc === null) return;
      const touch = e.touches[0];
      touchClone.style.top = touch.clientY - touchOffsetY + 'px';
      _viewDropIdx = getInsertIndex(touch.clientY);
      showIndicator(_viewDropIdx);
      e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchend', () => {
      if (touchClone) {
        document.body.removeChild(touchClone);
        touchClone = null;
      }
      if (_viewDragSrc !== null && _viewDropIdx !== null) {
        const adjusted = _viewDragSrc < _viewDropIdx ? _viewDropIdx - 1 : _viewDropIdx;
        if (_viewDragSrc !== adjusted) {
          performViewReorder(list, _viewDragSrc, adjusted);
        }
      }
      cleanupView();
    });

    handle.addEventListener('touchcancel', () => {
      if (touchClone) {
        document.body.removeChild(touchClone);
        touchClone = null;
      }
      cleanupView();
    });
  });
}

function performViewReorder(list, fromIndex, toIndex) {
  const currentRecipe = getRecipe(currentRecipeId);
  if (!currentRecipe) return;

  const instructions = [...currentRecipe.instructions];
  const [moved] = instructions.splice(fromIndex, 1);
  instructions.splice(toIndex, 0, moved);

  const updated = updateRecipe(currentRecipe.id, { instructions });
  if (updated) {
    const steps = [...list.querySelectorAll('.instruction-step')];
    const movedStep = steps[fromIndex];
    if (fromIndex < toIndex) {
      const ref = toIndex + 1 < steps.length ? steps[toIndex + 1] : null;
      list.insertBefore(movedStep, ref);
    } else {
      list.insertBefore(movedStep, steps[toIndex]);
    }
    renumberSteps(list);
    list.querySelectorAll('.instruction-step').forEach((s, i) => {
      s.dataset.stepIndex = i;
    });
    updateDragLabels(list);
  }
}

function moveInstructionStep(list, fromIndex, toIndex) {
  performViewReorder(list, fromIndex, toIndex);
  const handles = list.querySelectorAll('.step-drag-handle');
  const movedHandle = handles[toIndex];
  if (movedHandle) movedHandle.focus();
}

function updateDragLabels(list) {
  list.querySelectorAll('.step-drag-handle').forEach((handle, i) => {
    handle.setAttribute('aria-label', `Drag to reorder step ${i + 1}`);
  });
}

function renumberSteps(list) {
  list.querySelectorAll('.step-number').forEach((num, i) => {
    num.textContent = i + 1;
  });
}

function bindEditInstructionsDrag() {
  const container = document.getElementById('edit-instructions-editor');
  if (!container) return;

  function getInsertIndex(clientY) {
    const rows = [...container.querySelectorAll('.edit-instruction-row')];
    if (rows.length === 0) return 0;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return rows.length;
  }

  function showIndicator(insertIdx) {
    const rows = container.querySelectorAll('.edit-instruction-row');
    rows.forEach((r) => r.classList.remove('step-drag-over', 'step-drag-over-end'));
    if (insertIdx < rows.length) {
      rows[insertIdx].classList.add('step-drag-over');
    } else if (rows.length > 0) {
      rows[rows.length - 1].classList.add('step-drag-over-end');
    }
  }

  function cleanupEdit() {
    container.querySelectorAll('.edit-instruction-row').forEach((r) => {
      r.classList.remove('step-dragging', 'step-drag-over', 'step-drag-over-end');
    });
    _editDragSrc = null;
    _editDropIdx = null;
  }

  // ── Container listeners (bind once) ──

  if (!_editDragBound) {
    _editDragBound = true;

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (_editDragSrc === null) return;
      _editDropIdx = getInsertIndex(e.clientY);
      showIndicator(_editDropIdx);
    });

    container.addEventListener('dragleave', (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.querySelectorAll('.edit-instruction-row').forEach((r) => {
          r.classList.remove('step-drag-over', 'step-drag-over-end');
        });
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (_editDragSrc === null || _editDropIdx === null) { cleanupEdit(); return; }
      const adjusted = _editDragSrc < _editDropIdx ? _editDropIdx - 1 : _editDropIdx;
      if (_editDragSrc !== adjusted) {
        moveEditInstructionStep(_editDragSrc, adjusted);
      }
      cleanupEdit();
    });
  }

  // ── Handle listeners (rebound each render) ──

  container.querySelectorAll('.step-drag-handle').forEach((handle) => {
    const row = handle.closest('.edit-instruction-row');

    handle.addEventListener('dragstart', (e) => {
      _editDragSrc = parseInt(row.dataset.editInstructionDrag);
      row.classList.add('step-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });

    handle.addEventListener('dragend', () => {
      cleanupEdit();
    });

    handle.addEventListener('keydown', (e) => {
      const idx = parseInt(row.dataset.editInstructionDrag);
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        moveEditInstructionStep(idx, idx - 1);
      } else if (e.key === 'ArrowDown' && idx < editInstructions.length - 1) {
        e.preventDefault();
        moveEditInstructionStep(idx, idx + 1);
      }
    });

    // ── Touch support ──
    let touchClone = null;
    let touchOffsetY = 0;

    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      _editDragSrc = parseInt(row.dataset.editInstructionDrag);
      row.classList.add('step-dragging');
      touchOffsetY = touch.clientY - row.getBoundingClientRect().top;

      touchClone = row.cloneNode(true);
      touchClone.style.position = 'fixed';
      touchClone.style.zIndex = '9999';
      touchClone.style.width = row.offsetWidth + 'px';
      touchClone.style.opacity = '0.9';
      touchClone.style.pointerEvents = 'none';
      touchClone.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
      touchClone.style.background = 'var(--glass-bg-solid, #fff)';
      touchClone.style.borderRadius = 'var(--radius-sm, 8px)';
      touchClone.style.left = row.getBoundingClientRect().left + 'px';
      touchClone.style.top = touch.clientY - touchOffsetY + 'px';
      document.body.appendChild(touchClone);

      e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchmove', (e) => {
      if (!touchClone || _editDragSrc === null) return;
      const touch = e.touches[0];
      touchClone.style.top = touch.clientY - touchOffsetY + 'px';
      _editDropIdx = getInsertIndex(touch.clientY);
      showIndicator(_editDropIdx);
      e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchend', () => {
      if (touchClone) {
        document.body.removeChild(touchClone);
        touchClone = null;
      }
      if (_editDragSrc !== null && _editDropIdx !== null) {
        const adjusted = _editDragSrc < _editDropIdx ? _editDropIdx - 1 : _editDropIdx;
        if (_editDragSrc !== adjusted) {
          moveEditInstructionStep(_editDragSrc, adjusted);
        }
      }
      cleanupEdit();
    });

    handle.addEventListener('touchcancel', () => {
      if (touchClone) {
        document.body.removeChild(touchClone);
        touchClone = null;
      }
      cleanupEdit();
    });
  });
}

function moveEditInstructionStep(fromIndex, toIndex) {
  const [moved] = editInstructions.splice(fromIndex, 1);
  editInstructions.splice(toIndex, 0, moved);
  renderEditInstructions();
  rebindEditInstructionEvents();

  const container = document.getElementById('edit-instructions-editor');
  if (container) {
    const handles = container.querySelectorAll('.step-drag-handle');
    const movedHandle = handles[toIndex];
    if (movedHandle) movedHandle.focus();
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

  editImageData = recipe.image || null;
  updateEditImagePreview(recipe.title);

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

  setTimeout(() => document.getElementById('edit-recipe-title')?.focus(), 50);
}

function hideEditForm() {
  document.getElementById('recipe-edit-form').setAttribute('hidden', '');
  document.getElementById('recipe-view-content').removeAttribute('hidden');
  editImageData = null;
  document.getElementById('btn-edit-recipe')?.focus({ preventScroll: true });
}

function updateEditImagePreview(recipeTitle) {
  const preview = document.getElementById('edit-recipe-image-preview');
  const placeholder = document.getElementById('edit-recipe-image-placeholder');
  if (!preview || !placeholder) return;

  if (editImageData) {
    placeholder.setAttribute('hidden', '');
    preview.innerHTML = `<img class="import-preview-image" src="${escapeHTML(editImageData)}" alt="Photo for ${escapeHTML(recipeTitle || 'recipe')}">`;
    preview.removeAttribute('hidden');
  } else {
    preview.setAttribute('hidden', '');
    placeholder.removeAttribute('hidden');
  }
}

function handleEditImageFile() {
  const input = document.getElementById('edit-recipe-image-file');
  if (!input || !input.files[0]) return;

  const reader = new FileReader();
  reader.onload = () => {
    editImageData = reader.result;
    const title = document.getElementById('edit-recipe-title')?.value?.trim() || 'recipe';
    updateEditImagePreview(title);
  };
  reader.readAsDataURL(input.files[0]);
  input.value = '';
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
    image: editImageData || undefined,
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
        return `<div class="ingredient-heading" role="heading" aria-level="4">${escapeHTML(ing.text)}</div>`;
      }
      return `
      <div class="import-ingredient-row">
        <input type="text" class="glass-input" value="${escapeHTML(typeof ing === 'string' ? ing : ing.text || '')}"
          data-edit-ingredient-index="${i}" placeholder="e.g. 2 cups flour" aria-label="Ingredient ${i + 1}">
        <button class="btn btn-icon-only btn-small" data-edit-remove-ingredient="${i}" aria-label="Remove ingredient">
          <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      <div class="import-ingredient-row edit-instruction-row" data-edit-instruction-drag="${i}">
        <div class="step-drag-handle" draggable="true" tabindex="0" role="button"
          aria-label="Drag to reorder step ${i + 1}" title="Drag to reorder (Arrow keys to move)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
          </svg>
        </div>
        <textarea class="glass-textarea" data-edit-instruction-index="${i}"
          placeholder="Step ${i + 1}" aria-label="Instruction step ${i + 1}">${escapeHTML(step)}</textarea>
        <button class="btn btn-icon-only btn-small" data-edit-remove-instruction="${i}" aria-label="Remove step">
          <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`)
    .join('');

  container.querySelectorAll('textarea').forEach(autoSizeTextarea);

  bindEditInstructionsDrag();
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
      bindEditInstructionsDrag();
    });
  });

  bindEditInstructionsDrag();
}