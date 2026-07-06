import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROUND, parseFraction } from '../js/conversions.js';

describe('ROUND', () => {
  it('rounds to 1 decimal by default', () => {
    assert.strictEqual(ROUND(3.14159), 3.1);
    assert.strictEqual(ROUND(2.71828), 2.7);
  });

  it('rounds to specified decimals', () => {
    assert.strictEqual(ROUND(3.14159, 2), 3.14);
    assert.strictEqual(ROUND(3.14159, 3), 3.142);
    assert.strictEqual(ROUND(3.14159, 0), 3);
  });

  it('handles negative numbers', () => {
    assert.strictEqual(ROUND(-3.14159, 2), -3.14);
  });
});

describe('parseFraction', () => {
  it('parses whole numbers', () => {
    assert.strictEqual(parseFraction('42'), 42);
    assert.strictEqual(parseFraction('0'), 0);
  });

  it('parses decimals', () => {
    assert.strictEqual(parseFraction('3.14'), 3.14);
    assert.strictEqual(parseFraction('0.5'), 0.5);
  });

  it('parses fractions', () => {
    assert.strictEqual(parseFraction('1/2'), 0.5);
    assert.strictEqual(parseFraction('3/4'), 0.75);
    assert.strictEqual(parseFraction('1/3'), 1 / 3);
  });

  it('parses mixed numbers', () => {
    assert.strictEqual(parseFraction('1 1/2'), 1.5);
    assert.strictEqual(parseFraction('2 3/4'), 2.75);
  });

  it('parses negative numbers', () => {
    assert.strictEqual(parseFraction('-5'), -5);
    assert.strictEqual(parseFraction('-3.14'), -3.14);
  });

  it('returns NaN for invalid input', () => {
    assert.ok(isNaN(parseFraction('')));
    assert.ok(isNaN(parseFraction(null)));
    assert.ok(isNaN(parseFraction('abc')));
    assert.ok(isNaN(parseFraction('1/0')));
  });

  it('handles whitespace', () => {
    assert.strictEqual(parseFraction('  1/2  '), 0.5);
    assert.strictEqual(parseFraction(' 1  1/2 '), 1.5);
  });
});