export const INGREDIENT_PATTERNS = [
  /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon|pinch|dash|clove|slice|piece|whole|bunch|head|can|jar|package|box|bag|bottle)/i,
  /(\d+\/?\d*\s*)(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
];

export const EXCLUDE_KEYWORDS = /\b(calories|kcal|protein|carbs|carbohydrate|fat|fiber|fibre|sugar|sodium|cholesterol|saturated|trans fat|serving|yield|min|mins|minute|minutes|hour|hours|cook time|prep time|preparation time|total time|ingredients|grain)\b/i;

export const COOKING_VERBS = /\b(heat|bake|mix|add|stir|cook|beat|pour|combine|preheat|melt|chop|dice|slice|grate|drain|boil|simmer|fry|grill|roast|blend|whisk|fold|roll|cut|place|transfer|remove|cool|let|bring|spread|sprinkle|top|drizzle|season|serve|garnish|drop|scrape|line|scoop|freeze|refrigerate|chill|toast|mash|dissolve|grease|flour|whip|cream|knead|shape|cover|steep|strain|marinate|broil|poach|steam|reduce|caramelize|deglaze|braise|saute|plunge|temper|separate|sift|toss|crush)\b/i;

export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseNumber(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function parseDuration(val) {
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

export function extractImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (Array.isArray(image) && image.length > 0) return extractImageUrl(image[0]);
  if (image.url) return image.url;
  if (image['@id']) return image['@id'];
  return '';
}

export function isIngredient(text) {
  if (EXCLUDE_KEYWORDS.test(text)) return false;
  return INGREDIENT_PATTERNS.some((p) => p.test(text));
}

export function looksLikeInstructionList(items) {
  const ingredientPattern = /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|pound|ounce|gram|teaspoon|tablespoon)/i;
  const viable = items.filter((t) => t.length > 10 && !ingredientPattern.test(t));
  if (viable.length < 3) return false;
  const verbCount = viable.filter((t) => COOKING_VERBS.test(t.slice(0, 30))).length;
  return verbCount >= Math.ceil(viable.length * 0.4);
}

export function extractServingsFromText(text) {
  const match = text.match(/(\d+)\s+(serving|servings|serves|yield|makes|bars|cookies|pieces)\b/i);
  return match ? parseInt(match[1]) : 0;
}

export function extractTimeFromText(text, type) {
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

export function extractNutritionFromText(text) {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
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

export function findRecipeInJsonLd(data) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (!item) continue;
    if (item['@type'] === 'Recipe') return item;
    if (item['@graph']) {
      for (const node of item['@graph']) {
        if (node['@type'] === 'Recipe') return node;
      }
    }
    if (item.recipe) {
      const found = findRecipeInJsonLd(item.recipe);
      if (found) return found;
    }
  }
  return null;
}

export function parseJsonLdRecipe(recipeNode, sourceUrl = '') {
  const getText = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return v.map(getText).filter(Boolean).join('\n');
    return '';
  };

  const ingredients = (recipeNode.recipeIngredient || [])
    .map(getText)
    .filter(Boolean)
    .map((text) => ({ text }));

  const instructions = [];
  const rawInstructions = recipeNode.recipeInstructions || [];
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

  const nutrition = recipeNode.nutrition || {};

  return {
    title: recipeNode.name || '',
    description: recipeNode.description || '',
    image: extractImageUrl(recipeNode.image),
    sourceUrl: recipeNode.url || sourceUrl || '',
    sourceName: recipeNode.author?.name || recipeNode.publisher?.name || '',
    servings: parseInt(String(recipeNode.recipeYield).match(/\d+/)?.[0]) || 0,
    prepTime: parseDuration(recipeNode.prepTime),
    cookTime: parseDuration(recipeNode.cookTime),
    totalTime: parseDuration(recipeNode.totalTime),
    ingredients,
    instructions: instructions.filter(Boolean).map(capitalizeFirst),
    nutrition: {
      calories: parseNumber(nutrition.calories),
      protein: parseNumber(nutrition.proteinContent),
      carbs: parseNumber(nutrition.carbohydrateContent),
      fat: parseNumber(nutrition.fatContent),
      fiber: parseNumber(nutrition.fiberContent),
      sugar: parseNumber(nutrition.sugarContent),
      sodium: parseNumber(nutrition.sodiumContent),
    },
    tags: Array.isArray(recipeNode.recipeCategory) ? recipeNode.recipeCategory : recipeNode.recipeCategory ? [recipeNode.recipeCategory] : [],
    cuisine: recipeNode.recipeCuisine || '',
    mealType: recipeNode.recipeCategory || '',
  };
}