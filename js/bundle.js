(() => {
  'use strict';

  // ============================================================
  // theme.js
  // ============================================================

  function getPreferredTheme() {
    const saved = localStorage.getItem('savor_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('savor_theme', theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#FFFBF8' : '#1C1714');
    }

    const btn = document.getElementById('btn-theme');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
  }

  function initTheme() {
    applyTheme(getPreferredTheme());

    const btn = document.getElementById('btn-theme');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        applyTheme(current === 'light' ? 'dark' : 'light');
      });
    }

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('savor_theme')) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }

  // ============================================================
  // utils.js
  // ============================================================

  function showToast(message, type = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`.trimEnd();
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2800);
  }

  function showDialog({ title, content, actions } = {}) {
    const existing = document.querySelector('.dialog-overlay');
    if (existing) existing.remove();
    const previousFocus = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title || 'Dialog');

    let actionsHTML = '';
    if (actions && actions.length) {
      actionsHTML = `
        <div class="dialog-actions">
          ${actions
          .map(
            (a) =>
              `<button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}"
                  data-action="${a.id || ''}">${a.label}</button>`
          )
          .join('')}
        </div>`;
    }

    overlay.innerHTML = `
      <div class="dialog-sheet">
        <div class="dialog-handle"></div>
        <button class="icon-btn dialog-close-btn" aria-label="Close dialog" style="position:absolute;top:var(--space-md);right:var(--space-md)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        ${title ? `<h2 class="dialog-title">${title}</h2>` : ''}
        ${content ? `<div class="dialog-content">${content}</div>` : ''}
        ${actionsHTML}
      </div>`;

    const closeDialog = () => {
      overlay.remove();
      document.body.style.overflow = '';
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });

    const closeBtn = overlay.querySelector('.dialog-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeDialog);

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDialog();
      }
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const firstBtn = overlay.querySelector('button');
    if (firstBtn) firstBtn.focus();

    if (actions && actions.length) {
      actions.forEach((a) => {
        const btn = overlay.querySelector(`[data-action="${a.id}"]`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (a.callback) a.callback();
            closeDialog();
          });
        }
      });
    }

    return { close: closeDialog };
  }

  function showConfirm(message, onConfirm) {
    return showDialog({
      title: message,
      actions: [
        { id: 'cancel', label: 'Cancel' },
        { id: 'confirm', label: 'Confirm', primary: true, callback: onConfirm },
      ],
    });
  }

  function formatNumber(n) {
    if (n === null || n === undefined) return '\u2014';
    return Math.round(n).toLocaleString();
  }

  function formatDecimal(n, decimals = 1) {
    if (n === null || n === undefined) return '\u2014';
    return parseFloat(n).toFixed(decimals);
  }

  function getRelativeDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function formatTime(minutes) {
    if (!minutes || minutes <= 0) return '\u2014';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function getMealTypeEmoji(type) {
    const map = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🍎',
    };
    return map[type] || '🍽️';
  }

  function getMacroColor(type) {
    const map = {
      protein: 'var(--macro-protein)',
      carbs: 'var(--macro-carbs)',
      fat: 'var(--macro-fat)',
    };
    return map[type] || 'var(--text-secondary)';
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // data.js
  // ============================================================

  const STORAGE_KEY = 'savor_data';

  const defaults = {
    recipes: [],
    mealLog: {},
    weightLog: [],
    profile: {
      height: null,
      weight: null,
      age: null,
      gender: null,
      activityLevel: 'moderate',
      calorieGoal: 2000,
      proteinGoal: 150,
      carbsGoal: 200,
      fatGoal: 65,
      weightGoal: null,
    },
    version: 1,
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaults);
      const data = JSON.parse(raw);
      if (!data.version) return structuredClone(defaults);
      return { ...structuredClone(defaults), ...data };
    } catch {
      return structuredClone(defaults);
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let _data = load();

  function getData() {
    return _data;
  }

  function saveData() {
    save(_data);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getRecipes() {
    return _data.recipes;
  }

  function getRecipe(id) {
    return _data.recipes.find((r) => r.id === id) || null;
  }

  function addRecipe(recipe) {
    const newRecipe = {
      id: generateId(),
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description || '',
      image: recipe.image || '',
      sourceUrl: recipe.sourceUrl || '',
      sourceName: recipe.sourceName || '',
      servings: recipe.servings || 4,
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      totalTime: recipe.totalTime || 0,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      nutrition: {
        calories: recipe.nutrition?.calories || 0,
        protein: recipe.nutrition?.protein || 0,
        carbs: recipe.nutrition?.carbs || 0,
        fat: recipe.nutrition?.fat || 0,
        fiber: recipe.nutrition?.fiber || 0,
        sugar: recipe.nutrition?.sugar || 0,
        sodium: recipe.nutrition?.sodium || 0,
      },
      tags: recipe.tags || [],
      cuisine: recipe.cuisine || '',
      mealType: recipe.mealType || '',
      difficulty: recipe.difficulty || '',
      isFavorite: recipe.isFavorite || false,
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };
    _data.recipes.unshift(newRecipe);
    saveData();
    return newRecipe;
  }

  function updateRecipe(id, updates) {
    const idx = _data.recipes.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    _data.recipes[idx] = {
      ..._data.recipes[idx],
      ...updates,
      dateModified: new Date().toISOString(),
    };
    saveData();
    return _data.recipes[idx];
  }

  function deleteRecipe(id) {
    _data.recipes = _data.recipes.filter((r) => r.id !== id);

    Object.keys(_data.mealLog).forEach((date) => {
      _data.mealLog[date] = _data.mealLog[date].filter((e) => e.recipeId !== id);
    });
    saveData();
  }

  function toggleFavorite(id) {
    const recipe = getRecipe(id);
    if (!recipe) return;
    updateRecipe(id, { isFavorite: !recipe.isFavorite });
  }

  function getRecipeStats() {
    const recipes = _data.recipes;
    return {
      total: recipes.length,
      favorites: recipes.filter((r) => r.isFavorite).length,
      cuisines: [...new Set(recipes.map((r) => r.cuisine).filter(Boolean))],
      tags: [...new Set(recipes.flatMap((r) => r.tags))],
    };
  }

  function formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  }

  function getMealLog(date) {
    const key = formatDate(date);
    return _data.mealLog[key] || [];
  }

  function addMealEntry(date, entry) {
    const key = formatDate(date);
    if (!_data.mealLog[key]) _data.mealLog[key] = [];
    _data.mealLog[key].push({
      id: generateId(),
      recipeId: entry.recipeId || null,
      foodName: entry.foodName || '',
      servingSize: entry.servingSize || 1,
      mealType: entry.mealType || 'snack',
      calories: entry.calories || 0,
      protein: entry.protein || 0,
      carbs: entry.carbs || 0,
      fat: entry.fat || 0,
      time: new Date().toISOString(),
    });
    saveData();
    return _data.mealLog[key];
  }

  function removeMealEntry(date, entryId) {
    const key = formatDate(date);
    if (!_data.mealLog[key]) return;
    _data.mealLog[key] = _data.mealLog[key].filter((e) => e.id !== entryId);
    saveData();
  }

  function getDailyTotals(date) {
    const entries = getMealLog(date);
    return {
      calories: entries.reduce((s, e) => s + e.calories, 0),
      protein: entries.reduce((s, e) => s + e.protein, 0),
      carbs: entries.reduce((s, e) => s + e.carbs, 0),
      fat: entries.reduce((s, e) => s + e.fat, 0),
      entryCount: entries.length,
    };
  }

  function getMealTypeTotals(date) {
    const entries = getMealLog(date);
    const types = { breakfast: [], lunch: [], dinner: [], snack: [] };
    entries.forEach((e) => {
      const t = e.mealType || 'snack';
      if (!types[t]) types[t] = [];
      types[t].push(e);
    });
    Object.keys(types).forEach((t) => {
      if (types[t].length === 0) delete types[t];
    });
    return types;
  }

  function getProfile() {
    return _data.profile;
  }

  function updateProfile(updates) {
    _data.profile = { ..._data.profile, ...updates };
    saveData();
  }

  function getWeightLog() {
    return [..._data.weightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function addWeightEntry(weight) {
    _data.weightLog.push({
      id: generateId(),
      date: new Date().toISOString(),
      weight: parseFloat(weight),
    });
    saveData();
  }

  function calculateTDEE() {
    const p = _data.profile;
    if (!p.weight || !p.height || !p.age || !p.gender) return null;

    let bmr;
    if (p.gender === 'male') {
      bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
    } else {
      bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
    }

    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    };

    return Math.round(bmr * (multipliers[p.activityLevel] || 1.55));
  }

  function getWeightTrend() {
    const log = getWeightLog();
    if (log.length < 2) return null;

    const first = log[0];
    const last = log[log.length - 1];
    const daysDiff = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
    const weightDiff = last.weight - first.weight;

    return {
      totalChange: Math.round(weightDiff * 100) / 100,
      daysDiff: Math.round(daysDiff),
      weeklyRate: daysDiff >= 7 ? Math.round((weightDiff / (daysDiff / 7)) * 100) / 100 : null,
    };
  }

  // ============================================================
  // api.js
  // ============================================================

  async function fetchRecipeFromUrl(url) {
    try {
      const response = await fetch('/api/recipe-extractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      return { success: true, recipe: data };
    } catch (err) {
      console.error('Recipe extraction failed:', err);
      return { success: false, error: err.message };
    }
  }

  async function extractRecipeLocally(url) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const parsed = JSON.parse(script.textContent);
          const recipe = findRecipeInJsonLd(parsed);
          if (recipe) return { success: true, recipe };
        } catch { }
      }

      const microdata = extractMicrodata(doc);
      if (microdata) return { success: true, recipe: microdata };

      return {
        success: true,
        recipe: {
          title: doc.querySelector('h1')?.textContent?.trim() || '',
          description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          image: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
          sourceUrl: url,
          sourceName: new URL(url).hostname.replace('www.', ''),
          ingredients: extractIngredients(doc),
          instructions: extractInstructions(doc),
        },
      };
    } catch (err) {
      return { success: false, error: 'Could not reach the website. Check the URL and try again.' };
    }
  }

  function findRecipeInJsonLd(data) {
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item) continue;
      if (item['@type'] === 'Recipe') return parseJsonLdRecipe(item);
      if (item['@graph']) {
        for (const node of item['@graph']) {
          if (node['@type'] === 'Recipe') return parseJsonLdRecipe(node);
        }
      }
      if (item.recipe) return parseJsonLdRecipe(item.recipe);
    }
    return null;
  }

  function parseJsonLdRecipe(r) {
    const getText = (v) => {
      if (!v) return '';
      if (typeof v === 'string') return v.trim();
      if (Array.isArray(v)) return v.map(getText).filter(Boolean).join('\n');
      return '';
    };

    const ingredients = (r.recipeIngredient || [])
      .map(getText)
      .filter(Boolean);

    const instructions = [];
    const rawInstructions = r.recipeInstructions || [];
    if (typeof rawInstructions === 'string') {
      instructions.push(rawInstructions.trim());
    } else if (Array.isArray(rawInstructions)) {
      rawInstructions.forEach((step) => {
        if (typeof step === 'string') instructions.push(step.trim());
        else if (step.text) instructions.push(getText(step.text));
        else if (step['@type'] === 'HowToStep') {
          const name = step.name ? getText(step.name) + ': ' : '';
          instructions.push(name + getText(step.text));
        }
      });
    }

    const nutrition = {};
    if (r.nutrition) {
      const nc = r.nutrition;
      nutrition.calories = parseNumber(nc.calories);
      nutrition.protein = parseNumber(nc.proteinContent);
      nutrition.carbs = parseNumber(nc.carbohydrateContent);
      nutrition.fat = parseNumber(nc.fatContent);
      nutrition.fiber = parseNumber(nc.fiberContent);
      nutrition.sugar = parseNumber(nc.sugarContent);
      nutrition.sodium = parseNumber(nc.sodiumContent);
    }

    return {
      title: r.name || '',
      description: r.description || '',
      image: extractImageUrl(r.image),
      sourceUrl: r.url || '',
      sourceName: r.author?.name || r.publisher?.name || '',
      servings: parseInt(r.recipeYield) || 0,
      prepTime: parseIsoDuration(r.prepTime),
      cookTime: parseIsoDuration(r.cookTime),
      totalTime: parseIsoDuration(r.totalTime),
      ingredients: ingredients.map((i) => ({ text: i })),
      instructions,
      nutrition,
      tags: (r.recipeCategory ? [].concat(r.recipeCategory) : []),
      cuisine: r.recipeCuisine || '',
      mealType: r.recipeCategory || '',
    };
  }

  function extractMicrodata(doc) {
    const recipeEl = doc.querySelector('[itemtype*="schema.org/Recipe"]');
    if (!recipeEl) return null;

    const prop = (sel, attr = 'content') => {
      const el = recipeEl.querySelector(`[itemprop="${sel}"]`);
      if (!el) return '';
      if (attr === 'content') return el.getAttribute('content') || el.textContent?.trim() || '';
      return el.getAttribute(attr) || '';
    };

    const ingredients = [];
    recipeEl.querySelectorAll('[itemprop="recipeIngredient"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (text) ingredients.push({ text });
    });

    const instructions = [];
    recipeEl.querySelectorAll('[itemprop="recipeInstructions"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (text) instructions.push(text);
    });

    return {
      title: prop('name'),
      description: prop('description', 'text'),
      image: prop('image', 'src') || prop('image'),
      sourceUrl: doc.querySelector('link[rel="canonical"]')?.href || '',
      servings: parseInt(prop('recipeYield')) || 0,
      prepTime: parseIsoDuration(prop('prepTime')),
      cookTime: parseIsoDuration(prop('cookTime')),
      ingredients,
      instructions,
      nutrition: {
        calories: parseNumber(prop('calories')),
        protein: parseNumber(prop('proteinContent')),
        carbs: parseNumber(prop('carbohydrateContent')),
        fat: parseNumber(prop('fatContent')),
      },
    };
  }

  function extractIngredients(doc) {
    const ingredients = [];
    const lists = doc.querySelectorAll('ul li, ol li');

    lists.forEach((li) => {
      const text = li.textContent?.trim();
      if (!text || text.length < 5 || text.length > 500) return;

      const ingredientPatterns = [
        /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon|pinch|dash|clove|slice|piece|whole|bunch|head|can|jar|package|box|bag|bottle)/i,
        /(\d+\/?\d*\s*)(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
        /^[\d]+\s/,
      ];

      const isIngredient = ingredientPatterns.some((p) => p.test(text));
      if (isIngredient) {
        ingredients.push({ text });
      }
    });

    return ingredients.slice(0, 30);
  }

  function extractInstructions(doc) {
    const instructions = [];
    const orderedLists = doc.querySelectorAll('ol');

    for (const ol of orderedLists) {
      const items = ol.querySelectorAll('li');
      if (items.length >= 3) {
        items.forEach((li) => {
          const text = li.textContent?.trim();
          if (text && text.length > 10) {
            instructions.push(text);
          }
        });
        if (instructions.length > 0) break;
      }
    }

    return instructions.slice(0, 25);
  }

  function parseNumber(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  function parseIsoDuration(duration) {
    if (!duration) return 0;
    if (typeof duration === 'number') return duration;

    const match = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    return (parseInt(match[1]) || 0) * 60 + (parseInt(match[2]) || 0);
  }

  function extractImageUrl(image) {
    if (!image) return '';
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0] || '';
    if (image.url) return image.url;
    if (image['@id']) return image['@id'];
    return '';
  }

  function getApiKeys() {
    try {
      return JSON.parse(localStorage.getItem('savor_api_keys')) || {};
    } catch {
      return {};
    }
  }

  function saveApiKey(source, key) {
    const keys = getApiKeys();
    keys[source] = key;
    localStorage.setItem('savor_api_keys', JSON.stringify(keys));
  }

  async function searchUsda(query) {
    const keys = getApiKeys();
    const apiKey = keys.usda || 'DEMO_KEY';
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.foods || []).map((f) => {
        const get = (name) => {
          const n = (f.foodNutrients || []).find((n) => n.nutrientName?.toLowerCase().includes(name));
          return n ? Math.round(n.value) : 0;
        };
        return {
          id: 'usda-' + f.fdcId,
          name: f.description,
          source: f.brandOwner || 'USDA',
          calories: get('energy'),
          protein: get('protein'),
          carbs: get('carbohydrate'),
          fat: get('total lipid'),
          servingSize: 1,
          per100g: true,
        };
      }).filter((r) => r.name && r.calories > 0);
    } catch {
      return [];
    }
  }

  async function searchSpoonacular(query) {
    const keys = getApiKeys();
    if (!keys.spoonacular) return [];
    try {
      const url = `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(query)}&number=8&apiKey=${keys.spoonacular}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results || []).map((r) => ({
        id: 'spoon-' + r.id,
        name: r.name,
        source: 'Spoonacular',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: 1,
        needsLookup: true,
      })).filter((r) => r.name);
    } catch {
      return [];
    }
  }

  async function searchFood(query) {
    if (!query || query.length < 2) return [];
    const lower = query.toLowerCase();
    const results = [];

    try {
      const data = JSON.parse(localStorage.getItem('savor_data'));
      if (data?.recipes) {
        data.recipes.forEach((r) => {
          if (r.title.toLowerCase().includes(lower)) {
            results.push({
              id: r.id,
              name: r.title,
              source: 'My Recipes',
              calories: r.nutrition?.calories || 0,
              protein: r.nutrition?.protein || 0,
              carbs: r.nutrition?.carbs || 0,
              fat: r.nutrition?.fat || 0,
              servingSize: 1,
            });
          }
        });
      }
    } catch { }

    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=6&fields=product_name,brands,nutriments,code`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.products) {
          data.products.forEach((p, i) => {
            const n = p.nutriments || {};
            const cals = n['energy-kcal_100g'] || n['energy-kcal'] || 0;
            if (p.product_name && cals > 0) {
              results.push({
                id: 'off-' + (p.code || i),
                name: p.product_name,
                source: p.brands || 'Open Food Facts',
                calories: Math.round(cals),
                protein: Math.round(n.proteins_100g || n.proteins || 0),
                carbs: Math.round(n.carbohydrates_100g || n.carbohydrates || 0),
                fat: Math.round(n.fat_100g || n.fat || 0),
                servingSize: 1,
                per100g: true,
              });
            }
          });
        }
      }
    } catch { }

    try {
      const usda = await searchUsda(query);
      results.push(...usda);
    } catch { }

    try {
      const spoon = await searchSpoonacular(query);
      results.push(...spoon);
    } catch { }

    return results.slice(0, 20);
  }

  // ============================================================
  // index.js
  // ============================================================

  function initHome() {
    const today = new Date();
    const totals = getDailyTotals(today);
    const profile = getProfile();
    const recipes = getRecipes();
    const mealTypes = getMealTypeTotals(today);

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
              <div class="meal-group-title">${type.charAt(0).toUpperCase() + type.slice(1)} \u00B7 ${formatNumber(typeCal)} cal</div>
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

  // ============================================================
  // recipes.js
  // ============================================================

  let currentFilter = 'all';
  let currentSort = 'newest';
  let searchQuery = '';

  function initRecipes() {
    renderRecipes();

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

    if (currentSort === 'newest') {
      recipes.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    } else if (currentSort === 'oldest') {
      recipes.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    } else if (currentSort === 'name') {
      recipes.sort((a, b) => a.title.localeCompare(b.title));
    }

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
          <div class="recipe-card-image-placeholder" aria-hidden="true">${r.title.charAt(0).toUpperCase()}</div>
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
              ${r.isFavorite ? '<span class="tag tag-warning">\u2605 Favorite</span>' : ''}
            </div>
          </div>
        </button>`
      )
      .join('');
  }

  // ============================================================
  // recipe-detail.js
  // ============================================================

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
    document.title = `${recipe.title} \u2014 Savor`;

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
    if (servingsEl) servingsEl.textContent = recipe.servings || '\u2014';
    if (caloriesEl) caloriesEl.textContent = recipe.nutrition?.calories ? formatNumber(recipe.nutrition.calories) : '\u2014';

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
      { label: 'Sodium', value: recipe.nutrition?.sodium ? `${formatNumber(recipe.nutrition.sodium)}mg` : '\u2014' },
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

  // ============================================================
  // import.js
  // ============================================================

  let previewRecipe = null;
  let manualIngredients = [{ text: '' }];
  let manualInstructions = [''];

  function initImport() {
    previewRecipe = null;
    manualIngredients = [{ text: '' }];
    manualInstructions = [''];

    switchTab('url');
    bindImportEvents();
    resetForms();
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

    const addIngredientBtn = document.getElementById('btn-add-ingredient');
    if (addIngredientBtn) {
      addIngredientBtn.addEventListener('click', addIngredientRow);
    }

    const addInstructionBtn = document.getElementById('btn-add-instruction');
    if (addInstructionBtn) {
      addInstructionBtn.addEventListener('click', addInstructionRow);
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

    const saveApiBtn = document.getElementById('btn-save-api-key');
    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', () => {
        const usdaKey = document.getElementById('api-key-usda')?.value.trim();
        const spoonKey = document.getElementById('api-key-spoonacular')?.value.trim();
        if (usdaKey) saveApiKey('usda', usdaKey);
        if (spoonKey) saveApiKey('spoonacular', spoonKey);
        if (usdaKey || spoonKey) showToast('API keys saved');
        document.getElementById('api-key-usda').value = '';
        document.getElementById('api-key-spoonacular').value = '';
      });
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
    if (url.includes('allrecipes.com') || url.includes('foodnetwork.com') || url.includes('epicurious.com')) {
      result = await fetchRecipeFromUrl(url);
    } else {
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
      .join(' \u00B7 ');

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
  }

  function hidePreview() {
    const previewEl = document.getElementById('import-preview');
    if (previewEl) previewEl.setAttribute('hidden', '');
    const statusEl = document.getElementById('import-status');
    if (statusEl) statusEl.innerHTML = '';
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

  function addIngredientRow() {
    manualIngredients.push({ text: '' });
    renderIngredientsEditor();
  }

  function addInstructionRow() {
    manualInstructions.push('');
    renderInstructionsEditor();
  }

  function renderIngredientsEditor() {
    const container = document.getElementById('ingredients-editor');
    if (!container) return;

    container.innerHTML = manualIngredients
      .map(
        (ing, i) => `
        <div class="import-ingredient-row">
          <input type="text" class="glass-input" value="${escapeHTML(typeof ing === 'string' ? ing : ing.text || '')}"
            data-ingredient-index="${i}" placeholder="e.g. 2 cups flour">
          <button class="btn btn-icon-only btn-small" data-remove-ingredient="${i}" aria-label="Remove ingredient">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>`
      )
      .join('');

    container.querySelectorAll('[data-ingredient-index]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.ingredientIndex);
        manualIngredients[idx] = { text: e.target.value };
      });
    });

    container.querySelectorAll('[data-remove-ingredient]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeIngredient);
        manualIngredients.splice(idx, 1);
        renderIngredientsEditor();
      });
    });
  }

  function renderInstructionsEditor() {
    const container = document.getElementById('instructions-editor');
    if (!container) return;

    container.innerHTML = manualInstructions
      .map(
        (step, i) => `
        <div class="import-ingredient-row">
          <textarea class="glass-textarea" data-instruction-index="${i}" rows="2"
            placeholder="Step ${i + 1}">${escapeHTML(step)}</textarea>
          <button class="btn btn-icon-only btn-small" data-remove-instruction="${i}" aria-label="Remove step">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>`
      )
      .join('');

    container.querySelectorAll('[data-instruction-index]').forEach((textarea) => {
      textarea.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.instructionIndex);
        manualInstructions[idx] = e.target.value;
      });
    });

    container.querySelectorAll('[data-remove-instruction]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeInstruction);
        manualInstructions.splice(idx, 1);
        renderInstructionsEditor();
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

    manualIngredients = [{ text: '' }];
    manualInstructions = [''];
    renderIngredientsEditor();
    renderInstructionsEditor();
    hidePreview();
  }

  // ============================================================
  // meal-log.js
  // ============================================================

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
      calBar.className = `progress-fill ${calPercent >= 100 ? 'progress-fill-warning' : 'progress-fill-brand'}`;
    }

    const proteinBar = document.getElementById('protein-bar-fill');
    const carbsBar = document.getElementById('carbs-bar-fill');
    const fatBar = document.getElementById('fat-bar-fill');

    if (proteinBar) {
      const pct = Math.min((totals.protein / (profile.proteinGoal || 150)) * 100, 100);
      proteinBar.style.width = `${pct}%`;
    }
    if (carbsBar) {
      const pct = Math.min((totals.carbs / (profile.carbsGoal || 200)) * 100, 100);
      carbsBar.style.width = `${pct}%`;
    }
    if (fatBar) {
      const pct = Math.min((totals.fat / (profile.fatGoal || 65)) * 100, 100);
      fatBar.style.width = `${pct}%`;
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
      if (el) el.textContent = value !== null ? value : '\u2014';
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
                    <span>${e.servingSize > 1 ? '\u00D7' + e.servingSize : ''}</span>
                  </div>
                </div>
                <span class="meal-log-entry-calories">${formatNumber(e.calories)} cal</span>
                <button class="meal-log-entry-actions btn-icon-only" data-remove-entry="${e.id}" aria-label="Remove entry">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        <input type="text" class="glass-input search-input-fixed" id="food-search-input" placeholder="Search recipes or foods..." autocomplete="off">
        <div class="food-search-results" id="food-search-results">
          <p class="text-tertiary text-sm text-center">Start typing to search your recipes</p>
        </div>
      </div>`;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const sheet = overlay.querySelector('.dialog-sheet');
    const handle = overlay.querySelector('.dialog-handle');
    const resultsEl = document.getElementById('food-search-results');

    let startY = 0;
    let currentTranslate = 0;
    let dragging = false;

    const removeOverlay = () => {
      overlay.remove();
      document.body.style.overflow = '';
    };

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

  // ============================================================
  // health.js
  // ============================================================

  let weightChart = null;

  function initHealth() {
    renderHealthProfile();
    renderWeightLog();
    bindHealthEvents();
  }

  function renderHealthProfile() {
    const profile = getProfile();
    const tdee = calculateTDEE();

    const elements = {
      'health-current-weight': profile.weight ? `${formatDecimal(profile.weight)} kg` : '\u2014',
      'health-height': profile.height ? `${formatNumber(profile.height)} cm` : '\u2014',
      'health-age': profile.age ? `${profile.age} yrs` : '\u2014',
      'health-bmi': calculateBMI(profile),
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    const tdeeValue = document.getElementById('health-tdee');
    if (tdeeValue) {
      if (tdee) {
        tdeeValue.textContent = `${formatNumber(tdee)} cal/day`;
      } else {
        tdeeValue.textContent = 'Set profile to calculate';
      }
    }

    const trend = getWeightTrend();
    const trendEl = document.getElementById('health-weight-trend');
    if (trendEl) {
      if (trend) {
        const sign = trend.totalChange > 0 ? '+' : '';
        trendEl.textContent = `${sign}${trend.totalChange} kg over ${trend.daysDiff} days`;
        trendEl.className = 'health-metric-change';
        if (Math.abs(trend.totalChange) < 0.5) trendEl.classList.add('neutral');
        else if (trend.totalChange < 0) trendEl.classList.add('positive');
        else trendEl.classList.add('negative');
      } else {
        trendEl.textContent = 'Not enough data';
        trendEl.className = 'health-metric-change neutral';
      }
    }

    document.getElementById('profile-height')?.setAttribute('value', profile.height || '');
    document.getElementById('profile-weight')?.setAttribute('value', profile.weight || '');
    document.getElementById('profile-age')?.setAttribute('value', profile.age || '');

    const genderSelect = document.getElementById('profile-gender');
    if (genderSelect) genderSelect.value = profile.gender || '';

    const activitySelect = document.getElementById('profile-activity');
    if (activitySelect) activitySelect.value = profile.activityLevel || 'moderate';

    const calGoal = document.getElementById('profile-calorie-goal');
    if (calGoal) calGoal.setAttribute('value', profile.calorieGoal || 2000);

    document.getElementById('profile-protein-goal')?.setAttribute('value', profile.proteinGoal || 150);
    document.getElementById('profile-carbs-goal')?.setAttribute('value', profile.carbsGoal || 200);
    document.getElementById('profile-fat-goal')?.setAttribute('value', profile.fatGoal || 65);
  }

  function calculateBMI(profile) {
    if (!profile.weight || !profile.height) return '\u2014';
    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    return formatDecimal(bmi);
  }

  function renderWeightLog() {
    const log = getWeightLog();
    const container = document.getElementById('weight-entries');
    if (!container) return;

    if (log.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-text">No weight entries yet. Log your first weight above.</p>
        </div>`;
    } else {
      const latest = log[log.length - 1];
      const entries = [...log].reverse().slice(0, 10);

      container.innerHTML = entries
        .map((entry) => {
          const date = new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const diff = latest && entry !== latest ? entry.weight - latest.weight : 0;
          const sign = diff > 0 ? '+' : '';
          const changeStr = entry === latest
            ? '<span class="health-metric-change neutral">latest</span>'
            : `<span class="health-metric-change ${diff < 0 ? 'positive' : diff > 0 ? 'negative' : 'neutral'}">${sign}${formatDecimal(diff)}</span>`;

          return `
            <div class="weight-entry">
              <span class="weight-entry-date">${date}</span>
              <span class="weight-entry-value">${formatDecimal(entry.weight)} kg</span>
              ${changeStr}
            </div>`;
        })
        .join('');
    }

    renderWeightChart(log);
  }

  function renderWeightChart(log) {
    const chartContainer = document.getElementById('weight-chart');
    if (!chartContainer) return;

    const isLight = document.documentElement.dataset.theme === 'light';
    const tickColor = isLight ? '#7A6C60' : '#9A8E82';
    const gridColor = isLight ? 'rgba(184, 69, 13, 0.10)' : 'rgba(184, 69, 13, 0.12)';

    if (log.length < 2) {
      chartContainer.innerHTML = `
        <div class="chart-placeholder">
          <span>Log at least 2 weight entries to see a chart</span>
        </div>`;
      return;
    }

    chartContainer.innerHTML = '<canvas id="weightCanvas"></canvas>';

    if (typeof Chart === 'undefined') {
      setTimeout(() => {
        const canvas = document.getElementById('weightCanvas');
        if (canvas) {
          renderSimpleChart(canvas, log, tickColor);
        }
      }, 500);
    } else {
      const ctx = document.getElementById('weightCanvas')?.getContext('2d');
      if (!ctx) return;

      if (weightChart) weightChart.destroy();

      const labels = log.map((e) =>
        new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      const weights = log.map((e) => e.weight);

      weightChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Weight (kg)',
              data: weights,
              borderColor: '#D35A1C',
              backgroundColor: 'rgba(211, 90, 28, 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#D35A1C',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
          },
        },
      });
    }
  }

  function renderSimpleChart(canvas, log, tickColor) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth || 300;
    const height = canvas.offsetHeight || 200;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(2, 2);

    const padding = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minWeight = Math.min(...log.map((e) => e.weight)) - 1;
    const maxWeight = Math.max(...log.map((e) => e.weight)) + 1;

    ctx.strokeStyle = 'rgba(184, 69, 13, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = tickColor;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = maxWeight - ((maxWeight - minWeight) / 4) * i;
      const y = padding.top + (chartH / 4) * i + 3;
      ctx.fillText(val.toFixed(1), padding.left - 8, y);
    }

    const points = log.map((e, i) => ({
      x: padding.left + (chartW / (log.length - 1 || 1)) * i,
      y: padding.top + chartH - ((e.weight - minWeight) / (maxWeight - minWeight)) * chartH,
    }));

    ctx.strokeStyle = '#D35A1C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
      ctx.bezierCurveTo(cp1x, points[i - 1].y, points[i].x - (points[i].x - points[i - 1].x) / 3, points[i].y, points[i].x, points[i].y);
    }

    ctx.stroke();

    ctx.fillStyle = 'rgba(211, 90, 28, 0.08)';
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.lineTo(points[0].x, padding.top + chartH);
    ctx.closePath();
    ctx.fill();

    points.forEach((p) => {
      ctx.fillStyle = '#D35A1C';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function bindHealthEvents() {
    const profileForm = document.getElementById('health-profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const updates = {
          height: parseFloat(document.getElementById('profile-height')?.value) || null,
          weight: parseFloat(document.getElementById('profile-weight')?.value) || null,
          age: parseInt(document.getElementById('profile-age')?.value) || null,
          gender: document.getElementById('profile-gender')?.value || null,
          activityLevel: document.getElementById('profile-activity')?.value || 'moderate',
          calorieGoal: parseInt(document.getElementById('profile-calorie-goal')?.value) || null,
          proteinGoal: parseInt(document.getElementById('profile-protein-goal')?.value) || null,
          carbsGoal: parseInt(document.getElementById('profile-carbs-goal')?.value) || null,
          fatGoal: parseInt(document.getElementById('profile-fat-goal')?.value) || null,
        };

        updateProfile(updates);
        showToast('Profile updated');
        renderHealthProfile();

        const tdee = calculateTDEE();
        if (tdee && !document.getElementById('profile-calorie-goal')?.value) {
          const calGoalEl = document.getElementById('profile-calorie-goal');
          if (calGoalEl) calGoalEl.setAttribute('value', tdee);
        }
      });
    }

    const weightForm = document.getElementById('add-weight-form');
    if (weightForm) {
      weightForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('new-weight-input');
        if (!input || !input.value) return;

        const weight = parseFloat(input.value);
        if (isNaN(weight) || weight <= 0) {
          showToast('Enter a valid weight', 'error');
          return;
        }

        addWeightEntry(weight);
        updateProfile({ weight });
        input.value = '';
        showToast('Weight logged');
        renderHealthProfile();
        renderWeightLog();
      });
    }
  }

  // ============================================================
  // app.js (Router)
  // ============================================================

  const routeMap = {
    home: { template: 'template-home', heading: 'Dashboard', title: 'Savor \u2014 Dashboard' },
    recipes: { template: 'template-recipes', heading: 'Recipes', title: 'Recipes \u2014 Savor' },
    'recipe-detail': { template: 'template-recipe-detail', heading: 'Recipe', title: 'Recipe \u2014 Savor' },
    import: { template: 'template-import', heading: 'Import Recipe', title: 'Import \u2014 Savor' },
    'meal-log': { template: 'template-meal-log', heading: 'Meal Log', title: 'Meal Log \u2014 Savor' },
    health: { template: 'template-health', heading: 'Health', title: 'Health \u2014 Savor' },
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

    const prevRoute = currentRoute;
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
  }

  function initKeyboardFix() {
    let savedScrollY = 0;

    document.addEventListener('focusin', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        savedScrollY = window.scrollY;
        document.documentElement.style.position = 'fixed';
        document.documentElement.style.top = `-${savedScrollY}px`;
        document.documentElement.style.width = '100%';
        document.documentElement.style.overflow = 'hidden';
      }
    });

    document.addEventListener('focusout', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        requestAnimationFrame(() => {
          if (document.querySelector('input:focus, textarea:focus, [contenteditable]:focus')) return;
          document.documentElement.style.position = '';
          document.documentElement.style.top = '';
          document.documentElement.style.width = '';
          document.documentElement.style.overflow = '';
          window.scrollTo(0, savedScrollY);
          savedScrollY = 0;
        });
      }
    });
  }

  function init() {
    try {
      initTheme();
      initKeyboardFix();

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
    } catch (e) {
      document.getElementById('app-root').innerHTML = '<div class="empty-state"><p class="empty-state-text">Something went wrong loading the app. Check the console for details.</p></div>';
    }
  }

  window.navigateTo = navigateTo;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/Savor/service-worker.js').catch(() => { });
  }
})();