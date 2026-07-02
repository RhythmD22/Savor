export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { query } = body;
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    res.status(400).json({ error: 'Query must be at least 2 characters' });
    return;
  }

  const usdaKey = process.env.USDA_API_KEY;
  const spoonKey = process.env.SPOONACULAR_API_KEY;
  const results = [];

  const usdaPromise = (async () => {
    if (!usdaKey) return [];
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=${usdaKey}`;
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
    } catch (err) {
      console.warn('USDA search failed:', err);
      return [];
    }
  })();

  const spoonPromise = (async () => {
    if (!spoonKey) return [];
    try {
      const url = `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(query)}&number=8&apiKey=${spoonKey}`;
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
    } catch (err) {
      console.warn('USDA search failed:', err);
      return [];
    }
  })();

  const openFoodFactsPromise = (async () => {
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=6&fields=product_name,brands,nutriments,code`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.products || []).map((p, i) => {
        const n = p.nutriments || {};
        const cals = n['energy-kcal_100g'] || n['energy-kcal'] || 0;
        if (!p.product_name || cals <= 0) return null;
        return {
          id: 'off-' + (p.code || i),
          name: p.product_name,
          source: p.brands || 'Open Food Facts',
          calories: Math.round(cals),
          protein: Math.round(n.proteins_100g || n.proteins || 0),
          carbs: Math.round(n.carbohydrates_100g || n.carbohydrates || 0),
          fat: Math.round(n.fat_100g || n.fat || 0),
          servingSize: 1,
          per100g: true,
        };
      }).filter(Boolean);
    } catch (err) {
      console.warn('USDA search failed:', err);
      return [];
    }
  })();

  const [usdaResults, spoonResults, offResults] = await Promise.allSettled([
    usdaPromise,
    spoonPromise,
    openFoodFactsPromise,
  ]);

  if (usdaResults.status === 'fulfilled') results.push(...usdaResults.value);
  if (spoonResults.status === 'fulfilled') results.push(...spoonResults.value);
  if (offResults.status === 'fulfilled') results.push(...offResults.value);

  res.status(200).json({
    results: results.slice(0, 20),
    sources: {
      usda: !!usdaKey,
      spoonacular: !!spoonKey,
      openFoodFacts: true,
    },
  });
}