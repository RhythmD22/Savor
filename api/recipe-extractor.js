import { capitalizeFirst, parseDuration, isIngredient, looksLikeInstructionList, extractServingsFromText, extractTimeFromText, extractNutritionFromText, findRecipeInJsonLd, parseJsonLdRecipe } from '../js/recipe-parsers.js';

export default async function handler(req, res) {
  const allowedOrigin = process.env.VERCEL_ENV
    ? 'https://savor-note.vercel.app'
    : 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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
      const recipe = findRecipeInJsonLd(data);
      if (recipe) return recipe;
    } catch {
      console.warn('JSON-LD parse error');
    }
  }

  return null;
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
    if (isIngredient(text)) {
      ingredients.push({ text });
      if (ingredients.length >= 30) return ingredients;
    }
  }

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

  const looksNav = (tag) => /\b(nav|menu|dropdown|footer)\b/i.test(tag);

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

  const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  let olMatch;
  while ((olMatch = olRegex.exec(html)) !== null) {
    const items = extractListItems(olMatch[1]);
    if (items.length >= 3) {
      instructions.push(...items);
      break;
    }
  }

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
  return extractServingsFromText(stripHtml(html).replace(/\s+/g, ' '));
}

function extractTimeFromHtml(html, type) {
  return extractTimeFromText(stripHtml(html).replace(/\s+/g, ' '), type);
}

function extractNutritionFromHtml(html) {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

  const headingMatches = [...html.matchAll(/nutrition\s*(?:info|facts|information)/gi)];
  if (!headingMatches.length) return result;

  const headingMatch = headingMatches[headingMatches.length - 1];
  const sectionStart = headingMatch.index;
  const section = html.slice(sectionStart, sectionStart + 5000);

  const valueRegex = /<strong[^>]*>\s*(\d+)[^<]*<\/strong>/gi;
  const values = [];
  let vm;
  while ((vm = valueRegex.exec(section)) !== null) {
    values.push(parseInt(vm[1]));
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

  return extractNutritionFromText(stripHtml(section).replace(/\s+/g, ' '));
}