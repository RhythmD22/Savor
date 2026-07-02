import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem(key) { return store[key] || null; },
  setItem(key, val) { store[key] = val; },
  removeItem(key) { delete store[key]; },
};

let data;

beforeEach(async () => {
  for (const key of Object.keys(store)) delete store[key];
  if (data) {
    data.resetAll();
  } else {
    data = await import('../js/data.js');
  }
});

describe('Recipes', () => {
  it('starts with empty recipes', () => {
    assert.ok(Array.isArray(data.getRecipes()));
    assert.strictEqual(data.getRecipes().length, 0);
  });

  it('adds a recipe', () => {
    const recipe = data.addRecipe({
      title: 'Test Recipe',
      description: 'A recipe for testing',
      ingredients: [
        { text: '1 cup flour' },
        { text: '2 eggs' },
      ],
      instructions: ['Mix ingredients', 'Cook'],
      servings: 4,
      prepTime: 10,
      cookTime: 20,
    });

    assert.ok(recipe.id);
    assert.strictEqual(recipe.title, 'Test Recipe');
    assert.strictEqual(recipe.description, 'A recipe for testing');
    assert.strictEqual(recipe.servings, 4);
    assert.strictEqual(recipe.prepTime, 10);
    assert.strictEqual(recipe.cookTime, 20);
    assert.deepStrictEqual(recipe.ingredients, [{ text: '1 cup flour' }, { text: '2 eggs' }]);
    assert.deepStrictEqual(recipe.instructions, ['Mix ingredients', 'Cook']);
    assert.strictEqual(recipe.isFavorite, false);
  });

  it('sets defaults for missing fields', () => {
    const recipe = data.addRecipe({ title: 'Minimal' });
    assert.strictEqual(recipe.description, '');
    assert.strictEqual(recipe.servings, 4);
    assert.deepStrictEqual(recipe.ingredients, []);
    assert.deepStrictEqual(recipe.instructions, []);
    assert.strictEqual(recipe.cuisine, '');
    assert.strictEqual(recipe.nutrition.calories, 0);
  });

  it('retrieves a recipe by id', () => {
    const created = data.addRecipe({ title: 'Find Me' });
    const found = data.getRecipe(created.id);
    assert.ok(found);
    assert.strictEqual(found.title, 'Find Me');
  });

  it('returns null for missing recipe', () => {
    assert.strictEqual(data.getRecipe('nonexistent'), null);
  });

  it('lists all recipes', () => {
    data.addRecipe({ title: 'A' });
    data.addRecipe({ title: 'B' });
    data.addRecipe({ title: 'C' });
    const recipes = data.getRecipes();
    assert.strictEqual(recipes.length, 3);
  });

  it('updates a recipe', () => {
    const recipe = data.addRecipe({ title: 'Original' });
    const updated = data.updateRecipe(recipe.id, { title: 'Updated', servings: 6 });
    assert.strictEqual(updated.title, 'Updated');
    assert.strictEqual(updated.servings, 6);
    assert.strictEqual(data.getRecipe(recipe.id).title, 'Updated');
  });

  it('returns null when updating nonexistent recipe', () => {
    assert.strictEqual(data.updateRecipe('nope', { title: 'X' }), null);
  });

  it('deletes a recipe', () => {
    const recipe = data.addRecipe({ title: 'To Delete' });
    assert.strictEqual(data.getRecipes().length, 1);
    data.deleteRecipe(recipe.id);
    assert.strictEqual(data.getRecipes().length, 0);
    assert.strictEqual(data.getRecipe(recipe.id), null);
  });

  it('toggles favorite', () => {
    const recipe = data.addRecipe({ title: 'Fav Test' });
    assert.strictEqual(recipe.isFavorite, false);
    data.toggleFavorite(recipe.id);
    assert.strictEqual(data.getRecipe(recipe.id).isFavorite, true);
    data.toggleFavorite(recipe.id);
    assert.strictEqual(data.getRecipe(recipe.id).isFavorite, false);
  });

  it('deleteRecipe also removes associated meal entries', () => {
    const recipe = data.addRecipe({ title: 'Meal Recipe' });
    data.addMealEntry(new Date(), {
      recipeId: recipe.id,
      foodName: 'Test Meal',
      calories: 300,
      mealType: 'lunch',
    });
    assert.strictEqual(data.getMealLog(new Date()).length, 1);
    data.deleteRecipe(recipe.id);
    assert.strictEqual(data.getMealLog(new Date()).length, 0);
  });
});

describe('Meal Log', () => {
  it('returns empty array for date with no entries', () => {
    assert.deepStrictEqual(data.getMealLog(new Date()), []);
  });

  it('adds a meal entry', () => {
    const entries = data.addMealEntry(new Date(), {
      foodName: 'Chicken Salad',
      calories: 450,
      protein: 35,
      carbs: 12,
      fat: 28,
      mealType: 'lunch',
    });
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].foodName, 'Chicken Salad');
    assert.strictEqual(entries[0].calories, 450);
    assert.strictEqual(entries[0].mealType, 'lunch');
  });

  it('removes a meal entry', () => {
    const date = new Date();
    const entries = data.addMealEntry(date, { foodName: 'A', calories: 100 });
    const entryId = entries[0].id;
    data.removeMealEntry(date, entryId);
    assert.strictEqual(data.getMealLog(date).length, 0);
  });

  it('calculates daily totals', () => {
    const date = new Date();
    data.addMealEntry(date, { foodName: 'A', calories: 300, protein: 20, carbs: 30, fat: 10 });
    data.addMealEntry(date, { foodName: 'B', calories: 200, protein: 15, carbs: 25, fat: 8 });
    const totals = data.getDailyTotals(date);
    assert.strictEqual(totals.calories, 500);
    assert.strictEqual(totals.protein, 35);
    assert.strictEqual(totals.carbs, 55);
    assert.strictEqual(totals.fat, 18);
    assert.strictEqual(totals.entryCount, 2);
  });

  it('groups by meal type', () => {
    const date = new Date();
    data.addMealEntry(date, { foodName: 'Eggs', calories: 200, mealType: 'breakfast' });
    data.addMealEntry(date, { foodName: 'Salad', calories: 300, mealType: 'lunch' });
    data.addMealEntry(date, { foodName: 'Apple', calories: 100, mealType: 'snack' });
    const types = data.getMealTypeTotals(date);
    assert.ok(types.breakfast);
    assert.ok(types.lunch);
    assert.ok(types.snack);
    assert.strictEqual(Object.keys(types).length, 3);
  });
});

describe('Profile', () => {
  it('returns default profile', () => {
    const profile = data.getProfile();
    assert.strictEqual(profile.height, null);
    assert.strictEqual(profile.calorieGoal, 2000);
    assert.strictEqual(profile.activityLevel, 'moderate');
  });

  it('updates profile', () => {
    data.updateProfile({ height: 180, weight: 75, age: 30, gender: 'male' });
    const profile = data.getProfile();
    assert.strictEqual(profile.height, 180);
    assert.strictEqual(profile.weight, 75);
    assert.strictEqual(profile.age, 30);
    assert.strictEqual(profile.gender, 'male');
  });
});

describe('Weight Log', () => {
  it('returns empty log initially', () => {
    const log = data.getWeightLog();
    assert.strictEqual(log.length, 0);
  });

  it('adds weight entries', () => {
    data.addWeightEntry(80.5);
    data.addWeightEntry(79.3);
    data.addWeightEntry(78.8);
    const log = data.getWeightLog();
    assert.strictEqual(log.length, 3);
    assert.strictEqual(log[0].weight, 80.5);
    assert.strictEqual(log[2].weight, 78.8);
  });

  it('deletes a weight entry', () => {
    data.addWeightEntry(80);
    const log = data.getWeightLog();
    const id = log[0].id;
    data.deleteWeightEntry(id);
    assert.strictEqual(data.getWeightLog().length, 0);
  });
});

describe('formatDate', () => {
  it('formats dates as ISO date strings', () => {
    assert.strictEqual(data.formatDate(new Date('2024-01-15T12:00:00Z')), '2024-01-15');
    assert.strictEqual(data.formatDate('2024-06-20T08:30:00'), '2024-06-20');
  });
});

describe('calculateTDEE', () => {
  it('returns null when profile incomplete', () => {
    assert.strictEqual(data.calculateTDEE(), null);
  });

  it('calculates TDEE for male', () => {
    data.updateProfile({ weight: 80, height: 180, age: 30, gender: 'male', activityLevel: 'moderate' });
    const tdee = data.calculateTDEE();
    assert.ok(tdee > 2000);
    assert.ok(tdee < 3500);
  });

  it('calculates TDEE for female', () => {
    data.updateProfile({ weight: 65, height: 165, age: 25, gender: 'female', activityLevel: 'light' });
    const tdee = data.calculateTDEE();
    assert.ok(tdee > 1500);
    assert.ok(tdee < 2800);
  });
});

describe('Export / Import', () => {
  it('exports data as JSON', () => {
    data.addRecipe({ title: 'Export Test' });
    const json = data.exportData();
    assert.strictEqual(typeof json, 'string');
    const parsed = JSON.parse(json);
    assert.ok(Array.isArray(parsed.recipes));
    assert.strictEqual(parsed.recipes.length, 1);
  });

  it('imports valid data', () => {
    data.addRecipe({ title: 'Export Test' });
    const exported = data.exportData();
    data.resetAll();
    assert.strictEqual(data.getRecipes().length, 0);
    data.importData(exported);
    assert.strictEqual(data.getRecipes().length, 1);
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => data.importData('not json'), /Invalid JSON/);
  });

  it('throws on data without version', () => {
    assert.throws(() => data.importData('{}'), /Missing data version/);
  });
});

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = data.generateId();
    const id2 = data.generateId();
    assert.notStrictEqual(id1, id2);
    assert.strictEqual(typeof id1, 'string');
  });
});

describe('getWeightTrend', () => {
  it('returns null with fewer than 2 entries', () => {
    assert.strictEqual(data.getWeightTrend(), null);
    data.addWeightEntry(80);
    assert.strictEqual(data.getWeightTrend(), null);
  });

  it('calculates weight trend', () => {
    data.addWeightEntry(80);
    data.addWeightEntry(78);
    const trend = data.getWeightTrend();
    assert.ok(trend);
    assert.strictEqual(trend.totalChange, -2);
  });
});