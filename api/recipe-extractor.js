export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  try {
    const html = await fetchPage(url);
    const recipe = extractRecipe(html, url);
    return res.status(200).json(recipe);
  } catch (err) {
    return res.status(422).json({ error: err.message || 'Could not extract recipe from this URL' });
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractRecipe(html, sourceUrl) {
  const title = extractTitle(html);
  const jsonLd = extractJsonLd(html);

  if (jsonLd) {
    const recipe = parseJsonLdRecipe(jsonLd, sourceUrl);
    if (recipe && recipe.title) return recipe;
  }

  const microdata = extractMicrodata(html);
  if (microdata) return microdata;

  return {
    title,
    description: extractMetaContent(html, 'description'),
    image: extractMetaContent(html, 'og:image'),
    sourceUrl,
    sourceName: new URL(sourceUrl).hostname.replace('www.', ''),
    servings: extractServingsFromHtml(html),
    prepTime: extractTimeFromHtml(html, 'prep'),
    cookTime: extractTimeFromHtml(html, 'cook'),
    totalTime: extractTimeFromHtml(html, 'total'),
    ingredients: extractIngredientsFromHtml(html),
    instructions: extractInstructionsFromHtml(html),
    nutrition: extractNutritionFromHtml(html),
    tags: [],
    cuisine: '',
    mealType: '',
  };
}

function extractTitle(html) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) return decodeHtmlEntities(stripHtml(h1Match[1]).trim());

  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2Match) {
    const text = decodeHtmlEntities(stripHtml(h2Match[1]).trim());
    if (text.length > 2) return text;
  }

  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle && ogTitle.length > 2) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const t = decodeHtmlEntities(titleMatch[1].trim());
    return t.replace(/\s+[-|–—]\s+.*$/, '').replace(/\s*\|\s+.*$/, '').trim();
  }

  return '';
}

function extractMetaContent(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return '';
}

function extractJsonLd(html) {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(regex)];

  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      const recipe = findRecipeNode(data);
      if (recipe) return recipe;
    } catch {
      console.warn('JSON-LD parse error');
    }
  }

  return null;
}

function findRecipeNode(data) {
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (!item) continue;

    if (item['@type'] === 'Recipe') return item;
    if (Array.isArray(item['@graph'])) {
      for (const node of item['@graph']) {
        if (node['@type'] === 'Recipe') return node;
      }
    }

    if (item.recipe && item.recipe['@type'] === 'Recipe') {
      return item.recipe;
    }
  }

  return null;
}

function parseJsonLdRecipe(r, sourceUrl) {
  const getText = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return v.map(getText).filter(Boolean).join('\n');
    return '';
  };

  const getNumber = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const num = parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const ingredients = (r.recipeIngredient || [])
    .map(getText)
    .filter(Boolean)
    .map((text) => ({ text }));

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
          instructions.push(getText(step.text));
        } else if (step['@type'] === 'HowToSection' || step.itemListElement) {
          const items = Array.isArray(step.itemListElement) ? step.itemListElement : [step.itemListElement];
          collectSteps(items);
        }
      });
    };
    collectSteps(rawInstructions);
  }

  const nutrition = r.nutrition || {};

  return {
    title: r.name || '',
    description: r.description || '',
    image: extractImageUrl(r.image),
    sourceUrl: r.url || sourceUrl || '',
    sourceName: r.author?.name || r.publisher?.name || '',
    servings: parseInt(String(r.recipeYield).match(/\d+/)?.[0]) || 0,
    prepTime: parseDuration(r.prepTime),
    cookTime: parseDuration(r.cookTime),
    totalTime: parseDuration(r.totalTime),
    ingredients,
    instructions: instructions.filter(Boolean).map(capitalizeFirst),
    nutrition: {
      calories: getNumber(nutrition.calories),
      protein: getNumber(nutrition.proteinContent),
      carbs: getNumber(nutrition.carbohydrateContent),
      fat: getNumber(nutrition.fatContent),
      fiber: getNumber(nutrition.fiberContent),
      sugar: getNumber(nutrition.sugarContent),
      sodium: getNumber(nutrition.sodiumContent),
    },
    tags: Array.isArray(r.recipeCategory) ? r.recipeCategory : r.recipeCategory ? [r.recipeCategory] : [],
    cuisine: r.recipeCuisine || '',
    mealType: r.recipeCategory || '',
  };
}

function extractMicrodata(html) {
  if (!html.includes('itemtype="') || !html.includes('schema.org/Recipe')) return null;

  const itemprop = (prop) => {
    const regex = new RegExp(`itemprop=["']${prop}["'][^>]*>(?:<[^>]+>)*([^<]*)`, 'i');
    const match = html.match(regex);
    if (match) return match[1]?.trim() || '';
    return '';
  };

  const ingredients = [];
  const ingRegex = /itemprop=["']recipeIngredient["'][^>]*>(?:<[^>]+>)*([^<]*)/gi;
  let ingMatch;
  while ((ingMatch = ingRegex.exec(html)) !== null) {
    const text = ingMatch[1]?.trim();
    if (text) ingredients.push({ text });
  }

  return {
    title: itemprop('name'),
    description: itemprop('description'),
    image: '',
    sourceUrl: '',
    servings: parseInt(itemprop('recipeYield')?.match(/\d+/)?.[0]) || 0,
    prepTime: parseDuration(itemprop('prepTime')),
    cookTime: parseDuration(itemprop('cookTime')),
    totalTime: 0,
    ingredients,
    instructions: [],
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  };
}

function extractIngredientsFromHtml(html) {
  const ingredients = [];
  const ingredientPatterns = [
    /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon|pinch|dash|clove|slice|piece|whole|bunch|head|can|jar)/i,
    /(\d+\/?\d*\s*)(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
  ];
  const excludeKeywords = /\b(calories|kcal|protein|carbs|carbohydrate|fat|fiber|fibre|sugar|sodium|cholesterol|saturated|trans fat|serving|yield|min|mins|minute|minutes|hour|hours|cook time|prep time|preparation time|total time|ingredients|grain)\b/i;

  const isIngredient = (text) => {
    if (excludeKeywords.test(text)) return false;
    return ingredientPatterns.some((p) => p.test(text));
  };

  // Try <li> elements first
  const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = listItemRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (!text || text.length < 5 || text.length > 400) continue;
    if (isIngredient(text)) {
      ingredients.push({ text });
      if (ingredients.length >= 30) return ingredients;
    }
  }

  // Fallback: scan <p> tags for ingredient patterns
  if (ingredients.length === 0) {
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let skipped = 0;
    let pendingHeading = null;
    while ((match = pRegex.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
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

  return ingredients;
}

function extractInstructionsFromHtml(html) {
  const instructions = [];
  const ingredientPattern = /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon)/i;
  const cookingVerbs = /\b(heat|bake|mix|add|stir|cook|beat|pour|combine|preheat|melt|chop|dice|slice|grate|drain|boil|simmer|fry|grill|roast|blend|whisk|fold|roll|cut|place|transfer|remove|cool|let|bring|spread|sprinkle|top|drizzle|season|serve|garnish|drop|scrape|line|scoop|freeze|refrigerate|chill|toast|mash|dissolve|grease|flour|whip|cream|knead|shape|cover|steep|strain|marinate|broil|poach|steam|reduce|caramelize|deglaze|braise|saute|plunge|temper|separate|sift|toss|crush)\b/i;

  const looksNav = (tag) => /\b(nav|menu|dropdown|footer)\b/i.test(tag);

  const looksLikeInstructionList = (items) => {
    const viable = items.filter((t) => t.length > 10 && !ingredientPattern.test(t));
    if (viable.length < 3) return false;
    const verbCount = viable.filter((t) => cookingVerbs.test(t.slice(0, 30))).length;
    return verbCount >= Math.ceil(viable.length * 0.4);
  };

  const extractListItems = (listHtml) => {
    const items = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(listHtml)) !== null) {
      const text = stripHtml(liMatch[1]).trim();
      if (text.length > 10) items.push(text);
    }
    return items;
  };

  // Try <ol><li> ordered lists first
  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  let olMatch;
  while ((olMatch = olRegex.exec(html)) !== null) {
    const items = extractListItems(olMatch[1]);
    if (items.length >= 3) {
      instructions.push(...items);
      break;
    }
  }

  // Try <ul> lists that look like instructions
  if (instructions.length === 0) {
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let ulMatch;
    while ((ulMatch = ulRegex.exec(html)) !== null) {
      if (looksNav(ulMatch[0])) continue;
      const items = extractListItems(ulMatch[1]);
      if (looksLikeInstructionList(items)) {
        instructions.push(...items.filter((t) => !ingredientPattern.test(t)));
        break;
      }
    }
  }

  // Fallback: look for <p> tags that start with numbers (e.g., "1. ", "2. ")
  if (instructions.length === 0) {
    const stepRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let stepMatch;
    let foundSteps = false;
    while ((stepMatch = stepRegex.exec(html)) !== null) {
      const text = stripHtml(stepMatch[1]).trim();
      if (/^\d+[.)]\s/.test(text) && text.length > 10) {
        instructions.push(text);
        foundSteps = true;
      } else if (foundSteps && instructions.length >= 2) {
        break;
      }
    }
  }

  return instructions.slice(0, 25).map(capitalizeFirst);
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseDuration(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val);

  const isoMatch = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    return (parseInt(isoMatch[1]) || 0) * 60 + (parseInt(isoMatch[2]) || 0);
  }

  const num = parseInt(str.match(/\d+/)?.[0]);
  return isNaN(num) ? 0 : num;
}

function extractImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (Array.isArray(image) && image.length > 0) return extractImageUrl(image[0]);
  if (image.url) return image.url;
  if (image['@id']) return image['@id'];
  return '';
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractServingsFromHtml(html) {
  const text = stripHtml(html).replace(/\s+/g, ' ');
  const pattern = /(\d+)\s+(serving|servings|serves|yield|makes|bars|cookies|pieces)\b/i;
  const match = text.match(pattern);
  return match ? parseInt(match[1]) : 0;
}

function extractTimeFromHtml(html, type) {
  const text = stripHtml(html).replace(/\s+/g, ' ');
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

function extractNutritionFromHtml(html) {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

  // Find the LAST "Nutrition Info/Facts" heading (skip tab/nav links)
  const headingMatches = [...html.matchAll(/nutrition\s*(?:info|facts|information)/gi)];
  if (!headingMatches.length) return result;

  const headingMatch = headingMatches[headingMatches.length - 1];
  const sectionStart = headingMatch.index;
  const section = html.slice(sectionStart, sectionStart + 5000);

  // Extract all strong/bold numeric values in order
  const valueRegex = /<strong[^>]*>\s*(\d+)[^<]*<\/strong>/gi;
  const values = [];
  let vm;
  while ((vm = valueRegex.exec(section)) !== null) {
    values.push(parseInt(vm[1]));
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
  const text = stripHtml(section).replace(/\s+/g, ' ');
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