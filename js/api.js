import { capitalizeFirst, parseNumber, parseDuration, isIngredient, looksLikeInstructionList, extractServingsFromText, extractTimeFromText, extractNutritionFromText, findRecipeInJsonLd, parseJsonLdRecipe } from './recipe-parsers.js';

export async function fetchRecipeFromUrl(url) {
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

export async function extractRecipeLocally(url) {
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
    } catch (err) {
      console.warn('CORS proxy failed:', err);
    }
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
        const recipeNode = findRecipeInJsonLd(parsed);
        if (recipeNode) return { success: true, recipe: parseJsonLdRecipe(recipeNode) };
      } catch (err) {
        console.warn('JSON-LD parse error:', err);
      }
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
  } catch {
    return { success: false, error: 'Could not parse recipe from this page.' };
  }
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
    prepTime: parseDuration(prop('prepTime')),
    cookTime: parseDuration(prop('cookTime')),
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
    if (isIngredient(text)) {
      ingredients.push({ text });
    }
  });

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

  const isNavElement = (el) => {
    const classId = (el.className || '') + ' ' + (el.id || '');
    return /\b(nav|menu|dropdown|footer)\b/i.test(classId) || el.closest('nav, footer, header');
  };

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
  return extractServingsFromText(doc.body.textContent);
}

function extractTime(doc, type) {
  return extractTimeFromText(doc.body.textContent.replace(/\s+/g, ' '), type);
}

function extractNutrition(doc) {
  const headings = doc.querySelectorAll('h2, h3, h4, strong, b, .nutrition, [id*="nutrition"], [class*="nutrition"]');
  let sectionEl = null;
  for (const h of headings) {
    if (/nutrition\s*(info|facts|information)/i.test(h.textContent)) {
      sectionEl = h.closest('div, section') || h.parentElement;
      break;
    }
  }
  if (!sectionEl) sectionEl = doc.body;

  const strongs = sectionEl.querySelectorAll('strong, b');
  const values = [];
  for (const s of strongs) {
    const num = parseInt(s.textContent);
    if (num > 0) values.push(num);
  }

  if (values.length >= 9) {
    return {
      calories: values[0],
      fat: values[1],
      sodium: values[4],
      carbs: values[5],
      fiber: values[6],
      sugar: values[7],
      protein: values[8],
    };
  }

  return extractNutritionFromText(sectionEl.textContent.replace(/\s+/g, ' '));
}

export async function searchRemoteFood(query) {
  try {
    const response = await fetch('/api/food-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.warn('Remote food search failed:', err);
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

export async function searchFood(query) {
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
  } catch (err) {
    console.warn('Local storage read failed:', err);
    return [];
  }

  try {
    const remote = await searchRemoteFood(query);
    results.push(...remote);
  } catch (err) {
    console.warn('Remote food search failed:', err);
  }

  return results.slice(0, 20);
}