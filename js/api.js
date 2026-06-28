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

export { fetchRecipeFromUrl, extractRecipeLocally, searchFood, getApiKeys, saveApiKey };