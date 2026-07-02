async function fetchRecipeFromUrl(url) {
  try {
    const response = await fetch('/api/recipe-extractor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server responded with ${response.status}`);
    }

    return { success: true, recipe: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function extractRecipeLocally(url) {
  const proxies = [
    (fetchUrl) => fetch(fetchUrl),
    (fetchUrl) => fetch(`https://proxy.cors.sh/${fetchUrl}`),
    (fetchUrl) => fetch(`https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(fetchUrl)}`),
    (fetchUrl) => fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fetchUrl)}`),
    (fetchUrl) => fetch(`https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`),
  ];

  let html;

  for (const fetcher of proxies) {
    try {
      const response = await fetcher(url);
      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 500 && looksLikeRecipePage(text)) {
          html = text;
          break;
        }
      }
    } catch { }
  }

  if (!html) {
    return { success: false, error: 'Could not reach the website. Check the URL and try again.' };
  }

  try {
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
        servings: extractServings(doc),
        prepTime: extractTime(doc, 'prep'),
        cookTime: extractTime(doc, 'cook'),
        ingredients: extractIngredients(doc),
        instructions: extractInstructions(doc),
        nutrition: extractNutrition(doc),
      },
    };
  } catch (err) {
    return { success: false, error: 'Could not parse recipe from this page.' };
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
    const collectSteps = (arr) => {
      arr.forEach((step) => {
        if (typeof step === 'string') instructions.push(step.trim());
        else if (step.text) instructions.push(getText(step.text));
        else if (step['@type'] === 'HowToStep') {
          const name = step.name ? getText(step.name) + ': ' : '';
          instructions.push(name + getText(step.text));
        } else if (step['@type'] === 'HowToSection' || step.itemListElement) {
          const items = Array.isArray(step.itemListElement) ? step.itemListElement : [step.itemListElement];
          collectSteps(items);
        }
      });
    };
    collectSteps(rawInstructions);
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
    instructions: instructions.map(capitalizeFirst),
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
  const excludeKeywords = /\b(calories|kcal|protein|carbs|carbohydrate|fat|fiber|fibre|sugar|sodium|cholesterol|saturated|trans fat|serving|yield|min|mins|minute|minutes|hour|hours|cook time|prep time|preparation time|total time|ingredients|grain)\b/i;

  const isIngredient = (text) => {
    if (excludeKeywords.test(text)) return false;
    const patterns = [
      /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon|pinch|dash|clove|slice|piece|whole|bunch|head|can|jar|package|box|bag|bottle)/i,
      /(\d+\/?\d*\s*)(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
    ];
    return patterns.some((p) => p.test(text));
  };

  // Try <li> elements first
  const lists = doc.querySelectorAll('ul li, ol li');
  lists.forEach((li) => {
    const text = li.textContent?.trim();
    if (!text || text.length < 5 || text.length > 500) return;
    if (isIngredient(text)) {
      ingredients.push({ text });
    }
  });

  // Fallback: scan <p> tags for ingredient patterns
  if (ingredients.length === 0) {
    const paragraphs = doc.querySelectorAll('p');
    let skipped = 0;
    let pendingHeading = null;
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (!text || text.length < 2 || text.length > 400) continue;

      const isHeading = text === text.toUpperCase() && text.length >= 5 && text.length <= 50
        && !/\b(ingredients|instructions|method|notes|tips|nutrition)\b/i.test(text);

      if (isIngredient(text)) {
        if (pendingHeading) {
          ingredients.push(pendingHeading);
          pendingHeading = null;
        }
        ingredients.push({ text });
        skipped = 0;
        if (ingredients.length >= 30) break;
      } else if (isHeading) {
        if (ingredients.length > 0) {
          ingredients.push({ text, heading: true });
          skipped = 0;
        } else {
          pendingHeading = { text, heading: true };
        }
      } else if (ingredients.length > 0) {
        skipped++;
        if (skipped >= 3) break;
      }
    }
  }

  return ingredients.slice(0, 30);
}

function extractInstructions(doc) {
  const instructions = [];
  const ingredientPattern = /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon)/i;
  const cookingVerbs = /\b(heat|bake|mix|add|stir|cook|beat|pour|combine|preheat|melt|chop|dice|slice|grate|drain|boil|simmer|fry|grill|roast|blend|whisk|fold|roll|cut|place|transfer|remove|cool|let|bring|spread|sprinkle|top|drizzle|season|serve|garnish|drop|scrape|line|scoop|freeze|refrigerate|chill|toast|mash|dissolve|grease|flour|whip|cream|knead|shape|cover|steep|strain|marinate|broil|poach|steam|reduce|caramelize|deglaze|braise|saute|plunge|temper|separate|sift|toss|crush)\b/i;

  const looksLikeInstructionList = (items) => {
    const viable = items.filter((t) => t.length > 10 && !ingredientPattern.test(t));
    if (viable.length < 3) return false;
    const verbCount = viable.filter((t) => cookingVerbs.test(t.slice(0, 30))).length;
    return verbCount >= Math.ceil(viable.length * 0.4);
  };

  const isNavElement = (el) => {
    const classId = (el.className || '') + ' ' + (el.id || '');
    return /\b(nav|menu|dropdown|footer)\b/i.test(classId) || el.closest('nav, footer, header');
  };

  // Try ordered lists first
  const orderedLists = doc.querySelectorAll('ol');
  for (const ol of orderedLists) {
    const items = Array.from(ol.querySelectorAll('li'))
      .map((li) => li.textContent?.trim())
      .filter(Boolean);
    if (items.length >= 3) {
      instructions.push(...items);
      break;
    }
  }

  // Try unordered lists that look like instructions (not nav, not ingredients)
  if (instructions.length === 0) {
    const lists = doc.querySelectorAll('ul');
    for (const ul of lists) {
      if (isNavElement(ul)) continue;
      const items = Array.from(ul.querySelectorAll('li'))
        .map((li) => li.textContent?.trim())
        .filter(Boolean);
      if (looksLikeInstructionList(items)) {
        instructions.push(...items.filter((t) => !ingredientPattern.test(t)));
        break;
      }
    }
  }

  return instructions.slice(0, 25).map(capitalizeFirst);
}

function extractServings(doc) {
  const text = doc.body.textContent;
  const match = text.match(/(\d+)\s*(serving|servings|serves|yield|makes|bars|cookies|pieces)/i);
  return match ? parseInt(match[1]) : 0;
}

function extractTime(doc, type) {
  const text = doc.body.textContent.replace(/\s+/g, ' ');
  const keywords = type === 'prep' ? '\\bprep\\b|\\bpreparation\\b'
    : type === 'cook' ? '\\bcook\\b|\\bcooking\\b'
      : '\\btotal\\b|\\bready in\\b';
  const pattern = new RegExp(
    `(?:${keywords})[^\\d]{0,40}?(\\d+)\\s*(?:min|mins|minute|minutes|h|hour|hours)\\b`,
    'i'
  );
  const match = text.match(pattern);
  if (match) {
    const num = parseInt(match[1]);
    if (match[0].match(/\b(hour|hours|h)\b/i) && !match[0].match(/\bmin\b/i)) return num * 60;
    return num;
  }
  const revPattern = new RegExp(
    `(\\d+)\\s*(?:min|mins|minute|minutes)[^\\d]{0,40}?(?:${keywords})\\b`,
    'i'
  );
  const revMatch = text.match(revPattern);
  return revMatch ? parseInt(revMatch[1]) : 0;
}

function extractNutrition(doc) {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

  // Find nutrition section via heading
  const headings = doc.querySelectorAll('h2, h3, h4, strong, b, .nutrition, [id*="nutrition"], [class*="nutrition"]');
  let sectionEl = null;
  for (const h of headings) {
    if (/nutrition\s*(info|facts|information)/i.test(h.textContent)) {
      sectionEl = h.closest('div, section') || h.parentElement;
      break;
    }
  }
  if (!sectionEl) sectionEl = doc.body;

  // Try <strong>/<b> values from a table/list layout
  const strongs = sectionEl.querySelectorAll('strong, b');
  const values = [];
  for (const s of strongs) {
    const num = parseInt(s.textContent);
    if (num > 0) values.push(num);
  }

  if (values.length >= 9) {
    result.calories = values[0];
    result.fat = values[1];
    result.sodium = values[4];
    result.carbs = values[5];
    result.fiber = values[6];
    result.sugar = values[7];
    result.protein = values[8];
    return result;
  }

  // Generic fallback
  const text = sectionEl.textContent.replace(/\s+/g, ' ');
  const extract = (label) => {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(esc + '[^\\d]*?(\\d+)', 'i'));
    return m ? parseInt(m[1]) : 0;
  };

  result.calories = extract('calories');
  result.protein = extract('protein');
  result.carbs = extract('carbohydrate') || extract('carbs');
  result.fiber = extract('fiber') || extract('fibre');
  result.sugar = extract('sugar') || extract('sugars');
  result.sodium = extract('sodium');
  result.fat = extract('total fat') || extract('fat');

  return result;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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

async function searchRemoteFood(query) {
  try {
    const response = await fetch('/api/food-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

function looksLikeRecipePage(html) {
  const lower = html.toLowerCase();
  return (
    (lower.includes('<html') || lower.includes('<body') || lower.includes('<!doctype')) &&
    !lower.includes('<title>just a moment') &&
    !lower.includes('challenge-platform') &&
    !lower.includes('cf-browser-verification')
  );
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
    const remote = await searchRemoteFood(query);
    results.push(...remote);
  } catch { }

  return results.slice(0, 20);
}

export { fetchRecipeFromUrl, extractRecipeLocally, searchFood };