import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  capitalizeFirst,
  parseNumber,
  parseDuration,
  extractImageUrl,
  isIngredient,
  looksLikeInstructionList,
  extractServingsFromText,
  extractTimeFromText,
  extractNutritionFromText,
  findRecipeInJsonLd,
  parseJsonLdRecipe,
  COOKING_VERBS,
  EXCLUDE_KEYWORDS,
  INGREDIENT_PATTERNS,
} from '../js/recipe-parsers.js';

describe('capitalizeFirst', () => {
  it('capitalizes the first letter of a string', () => {
    assert.strictEqual(capitalizeFirst('hello'), 'Hello');
    assert.strictEqual(capitalizeFirst('Hello'), 'Hello');
  });

  it('returns empty for falsy values', () => {
    assert.strictEqual(capitalizeFirst(''), '');
    assert.strictEqual(capitalizeFirst(null), '');
    assert.strictEqual(capitalizeFirst(undefined), '');
  });
});

describe('parseNumber', () => {
  it('parses numeric strings', () => {
    assert.strictEqual(parseNumber('42'), 42);
    assert.strictEqual(parseNumber('3.14'), 3.14);
  });

  it('parses strings with units', () => {
    assert.strictEqual(parseNumber('100g'), 100);
    assert.strictEqual(parseNumber('250 kcal'), 250);
    assert.strictEqual(parseNumber('12.5 oz'), 12.5);
  });

  it('returns 0 for falsy or non-numeric', () => {
    assert.strictEqual(parseNumber(''), 0);
    assert.strictEqual(parseNumber(null), 0);
    assert.strictEqual(parseNumber(undefined), 0);
    assert.strictEqual(parseNumber('abc'), 0);
  });

  it('returns number if already a number', () => {
    assert.strictEqual(parseNumber(99), 99);
  });
});

describe('parseDuration', () => {
  it('handles ISO 8601 format', () => {
    assert.strictEqual(parseDuration('PT1H30M'), 90);
    assert.strictEqual(parseDuration('PT45M'), 45);
    assert.strictEqual(parseDuration('PT2H'), 120);
    assert.strictEqual(parseDuration('PT0H15M'), 15);
  });

  it('handles numeric minutes', () => {
    assert.strictEqual(parseDuration('30'), 30);
    assert.strictEqual(parseDuration('30 min'), 30);
    assert.strictEqual(parseDuration('1 hour'), 1);
  });

  it('returns 0 for falsy', () => {
    assert.strictEqual(parseDuration(''), 0);
    assert.strictEqual(parseDuration(null), 0);
    assert.strictEqual(parseDuration(undefined), 0);
  });

  it('returns number if already a number', () => {
    assert.strictEqual(parseDuration(60), 60);
  });
});

describe('extractImageUrl', () => {
  it('returns string image directly', () => {
    assert.strictEqual(extractImageUrl('https://example.com/img.jpg'), 'https://example.com/img.jpg');
  });

  it('returns first item from array', () => {
    assert.strictEqual(
      extractImageUrl(['https://example.com/a.jpg', 'https://example.com/b.jpg']),
      'https://example.com/a.jpg'
    );
  });

  it('returns url from object', () => {
    assert.strictEqual(extractImageUrl({ url: 'https://example.com/img.jpg' }), 'https://example.com/img.jpg');
  });

  it('returns @id from object', () => {
    assert.strictEqual(extractImageUrl({ '@id': 'https://example.com/img.jpg' }), 'https://example.com/img.jpg');
  });

  it('returns empty for falsy', () => {
    assert.strictEqual(extractImageUrl(''), '');
    assert.strictEqual(extractImageUrl(null), '');
    assert.strictEqual(extractImageUrl(undefined), '');
  });

  it('returns empty for empty array', () => {
    assert.strictEqual(extractImageUrl([]), '');
  });
});

describe('isIngredient', () => {
  it('identifies real ingredients', () => {
    assert.ok(isIngredient('1 cup flour'));
    assert.ok(isIngredient('2 tbsp olive oil'));
    assert.ok(isIngredient('200g chicken breast'));
    assert.ok(isIngredient('1/2 tsp salt'));
  });

  it('rejects nutrition info', () => {
    assert.strictEqual(isIngredient('calories 250'), false);
    assert.strictEqual(isIngredient('protein 10g'), false);
    assert.strictEqual(isIngredient('fat 5g'), false);
    assert.strictEqual(isIngredient('carbohydrate 30g'), false);
  });

  it('rejects non-ingredient text', () => {
    assert.strictEqual(isIngredient('heat the oven'), false);
    assert.strictEqual(isIngredient('preparation time 15 minutes'), false);
  });
});

describe('looksLikeInstructionList', () => {
  it('returns true for list with cooking verbs', () => {
    assert.ok(looksLikeInstructionList([
      'Preheat the oven to 350F',
      'Mix flour and sugar in a bowl',
      'Add eggs one at a time',
      'Bake for 30 minutes',
    ]));
  });

  it('returns false for ingredients list', () => {
    assert.strictEqual(looksLikeInstructionList([
      '2 cups flour',
      '1 cup sugar',
      '3 large eggs',
      '1/2 cup butter',
    ]), false);
  });

  it('returns false for short items', () => {
    assert.strictEqual(looksLikeInstructionList([
      'hot',
      'cold',
      'warm',
    ]), false);
  });
});

describe('extractServingsFromText', () => {
  it('finds serving counts', () => {
    assert.strictEqual(extractServingsFromText('4 servings'), 4);
    assert.strictEqual(extractServingsFromText('Makes 12 cookies'), 12);
    assert.strictEqual(extractServingsFromText('12 bars'), 12);
    assert.strictEqual(extractServingsFromText('yields 6 servings'), 6);
  });

  it('returns 0 if no match', () => {
    assert.strictEqual(extractServingsFromText('some random text'), 0);
  });
});

describe('extractTimeFromText', () => {
  it('extracts prep time', () => {
    assert.strictEqual(extractTimeFromText('prep time 15 minutes', 'prep'), 15);
    assert.strictEqual(extractTimeFromText('preparation 30 mins', 'prep'), 30);
  });

  it('extracts cook time', () => {
    assert.strictEqual(extractTimeFromText('cook time 45 minutes', 'cook'), 45);
    assert.strictEqual(extractTimeFromText('cooking 1 hour', 'cook'), 60);
  });

  it('extracts total time', () => {
    assert.strictEqual(extractTimeFromText('total time 60 min', 'total'), 60);
    assert.strictEqual(extractTimeFromText('ready in 20 minutes', 'total'), 20);
  });

  it('returns 0 for no match', () => {
    assert.strictEqual(extractTimeFromText('no time info here', 'prep'), 0);
  });
});

describe('extractNutritionFromText', () => {
  it('extracts nutrition facts', () => {
    const result = extractNutritionFromText('calories 350 protein 25g carbohydrate 40g fat 12g fiber 5g sugar 8g sodium 500mg');
    assert.strictEqual(result.calories, 350);
    assert.strictEqual(result.protein, 25);
    assert.strictEqual(result.carbs, 40);
    assert.strictEqual(result.fat, 12);
    assert.strictEqual(result.fiber, 5);
    assert.strictEqual(result.sugar, 8);
    assert.strictEqual(result.sodium, 500);
  });

  it('returns zeros for unknown text', () => {
    const result = extractNutritionFromText('no nutrition data here');
    assert.strictEqual(result.calories, 0);
    assert.strictEqual(result.protein, 0);
  });
});

describe('findRecipeInJsonLd', () => {
  it('finds Recipe type directly', () => {
    const node = { '@type': 'Recipe', name: 'Test' };
    assert.strictEqual(findRecipeInJsonLd(node), node);
  });

  it('finds Recipe inside @graph', () => {
    const data = { '@type': 'WebPage', '@graph': [{ '@type': 'Recipe', name: 'Test' }] };
    assert.notStrictEqual(findRecipeInJsonLd(data), null);
    assert.strictEqual(findRecipeInJsonLd(data).name, 'Test');
  });

  it('finds Recipe inside array', () => {
    const data = [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Test' }];
    assert.notStrictEqual(findRecipeInJsonLd(data), null);
    assert.strictEqual(findRecipeInJsonLd(data).name, 'Test');
  });

  it('finds Recipe via nested recipe property', () => {
    const data = { '@type': 'WebPage', recipe: { '@type': 'Recipe', name: 'Nested Test' } };
    assert.notStrictEqual(findRecipeInJsonLd(data), null);
    assert.strictEqual(findRecipeInJsonLd(data).name, 'Nested Test');
  });

  it('returns null when no Recipe found', () => {
    assert.strictEqual(findRecipeInJsonLd({ '@type': 'WebPage' }), null);
    assert.strictEqual(findRecipeInJsonLd([]), null);
  });
});

describe('parseJsonLdRecipe', () => {
  it('parses a complete Recipe node', () => {
    const node = {
      '@type': 'Recipe',
      name: 'Chocolate Cake',
      description: 'A rich chocolate cake',
      image: 'https://example.com/cake.jpg',
      url: 'https://example.com/recipe',
      author: { '@type': 'Person', name: 'Chef' },
      recipeYield: '8',
      prepTime: 'PT15M',
      cookTime: 'PT45M',
      totalTime: 'PT60M',
      recipeIngredient: ['2 cups flour', '1 cup sugar'],
      recipeInstructions: ['Preheat oven', 'Mix ingredients', 'Bake for 45 minutes'],
      nutrition: { calories: '350', proteinContent: '5g' },
      recipeCategory: ['Dessert'],
      recipeCuisine: 'American',
    };

    const result = parseJsonLdRecipe(node);
    assert.strictEqual(result.title, 'Chocolate Cake');
    assert.strictEqual(result.description, 'A rich chocolate cake');
    assert.strictEqual(result.image, 'https://example.com/cake.jpg');
    assert.strictEqual(result.sourceUrl, 'https://example.com/recipe');
    assert.strictEqual(result.sourceName, 'Chef');
    assert.strictEqual(result.servings, 8);
    assert.strictEqual(result.prepTime, 15);
    assert.strictEqual(result.cookTime, 45);
    assert.strictEqual(result.totalTime, 60);
    assert.deepStrictEqual(result.ingredients, [{ text: '2 cups flour' }, { text: '1 cup sugar' }]);
    assert.deepStrictEqual(result.instructions, ['Preheat oven', 'Mix ingredients', 'Bake for 45 minutes']);
    assert.strictEqual(result.nutrition.calories, 350);
    assert.strictEqual(result.nutrition.protein, 5);
    assert.deepStrictEqual(result.tags, ['Dessert']);
    assert.strictEqual(result.cuisine, 'American');
  });

  it('uses sourceUrl param as fallback', () => {
    const node = {
      '@type': 'Recipe',
      name: 'Test',
    };
    const result = parseJsonLdRecipe(node, 'https://fallback.com');
    assert.strictEqual(result.sourceUrl, 'https://fallback.com');
  });

  it('handles minimal recipe node', () => {
    const result = parseJsonLdRecipe({ '@type': 'Recipe' });
    assert.strictEqual(result.title, '');
    assert.strictEqual(result.servings, 0);
    assert.deepStrictEqual(result.ingredients, []);
    assert.deepStrictEqual(result.instructions, []);
  });

  it('handles HowToSection instructions', () => {
    const node = {
      '@type': 'Recipe',
      name: 'Multi-part Recipe',
      recipeInstructions: [
        {
          '@type': 'HowToSection', name: 'Part 1', itemListElement: [
            { '@type': 'HowToStep', text: 'Do step 1' },
            { '@type': 'HowToStep', text: 'Do step 2' },
          ]
        },
        'Final step',
      ],
    };
    const result = parseJsonLdRecipe(node);
    assert.ok(result.instructions.includes('Do step 1'));
    assert.ok(result.instructions.includes('Do step 2'));
    assert.ok(result.instructions.includes('Final step'));
  });
});

describe('COOKING_VERBS regex', () => {
  it('matches common cooking verbs', () => {
    assert.ok(COOKING_VERBS.test('preheat the oven'));
    assert.ok(COOKING_VERBS.test('mix all ingredients'));
    assert.ok(COOKING_VERBS.test('bake for 30 minutes'));
    assert.ok(COOKING_VERBS.test('chop the onions'));
  });

  it('does not match non-cooking words', () => {
    assert.strictEqual(COOKING_VERBS.test('the recipe requires'), false);
    assert.strictEqual(COOKING_VERBS.test('please enjoy'), false);
    assert.strictEqual(COOKING_VERBS.test('100 grams of sugar'), false);
  });
});

describe('EXCLUDE_KEYWORDS regex', () => {
  it('matches nutrition keywords', () => {
    assert.ok(EXCLUDE_KEYWORDS.test('calories per serving'));
    assert.ok(EXCLUDE_KEYWORDS.test('protein content'));
    assert.ok(EXCLUDE_KEYWORDS.test('prep time 15 minutes'));
    assert.ok(EXCLUDE_KEYWORDS.test('ingredients'));
  });

  it('does not match ingredient text', () => {
    assert.strictEqual(EXCLUDE_KEYWORDS.test('1 cup flour'), false);
    assert.strictEqual(EXCLUDE_KEYWORDS.test('2 tbsp olive oil'), false);
  });
});

describe('INGREDIENT_PATTERNS', () => {
  it('each pattern matches ingredient-like text', () => {
    assert.ok(INGREDIENT_PATTERNS[0].test('1 cup flour'));
    assert.ok(INGREDIENT_PATTERNS[0].test('2 tbsp olive oil'));
    assert.ok(INGREDIENT_PATTERNS[1].test('1/2 cup sugar'));
  });
});