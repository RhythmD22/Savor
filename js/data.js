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

function deleteWeightEntry(id) {
  _data.weightLog = _data.weightLog.filter((e) => e.id !== id);
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

export {
  getData,
  saveData,
  generateId,
  getRecipes,
  getRecipe,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  toggleFavorite,
  getRecipeStats,
  getMealLog,
  addMealEntry,
  removeMealEntry,
  getDailyTotals,
  getMealTypeTotals,
  getProfile,
  updateProfile,
  getWeightLog,
  addWeightEntry,
  deleteWeightEntry,
  calculateTDEE,
  getWeightTrend,
  formatDate,
};