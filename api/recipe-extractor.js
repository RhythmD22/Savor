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
    return res.status(422).json({ error: 'Could not extract recipe from this URL' });
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
        'User-Agent': 'Mozilla/5.0 (compatible; SavorRecipeBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
    servings: 0,
    prepTime: 0,
    cookTime: 0,
    totalTime: 0,
    ingredients: extractIngredientsFromHtml(html),
    instructions: extractInstructionsFromHtml(html),
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    tags: [],
    cuisine: '',
    mealType: '',
  };
}

function extractTitle(html) {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return decodeHtmlEntities(h1Match[1].trim());

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const t = decodeHtmlEntities(titleMatch[1].trim());
    return t.replace(/\s*[-|–—].*$/, '').trim();
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
    } catch { }
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
    rawInstructions.forEach((step) => {
      if (typeof step === 'string') instructions.push(step.trim());
      else if (step.text) instructions.push(getText(step.text));
      else if (step['@type'] === 'HowToStep') {
        instructions.push(getText(step.text));
      }
    });
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
    instructions: instructions.filter(Boolean),
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
  const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = listItemRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (!text || text.length < 5 || text.length > 400) continue;

    const ingredientPatterns = [
      /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon|pinch|dash|clove|slice|piece|whole|bunch|head|can|jar)/i,
      /(\d+\/?\d*\s*)(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
      /^[\d.]+\s/,
    ];

    if (ingredientPatterns.some((p) => p.test(text))) {
      ingredients.push({ text });
      if (ingredients.length >= 30) break;
    }
  }

  return ingredients;
}

function extractInstructionsFromHtml(html) {
  const instructions = [];

  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  let olMatch;

  while ((olMatch = olRegex.exec(html)) !== null) {
    const items = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;

    while ((liMatch = liRegex.exec(olMatch[1])) !== null) {
      const text = stripHtml(liMatch[1]).trim();
      if (text.length > 10) items.push(text);
    }

    if (items.length >= 3) {
      instructions.push(...items);
      break;
    }
  }

  return instructions.slice(0, 25);
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