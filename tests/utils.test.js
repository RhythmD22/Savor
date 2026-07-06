import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  createElement() {
    let stored = '';
    return {
      set textContent(v) { stored = String(v); },
      get innerHTML() {
        return stored.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      },
    };
  },
};

import { formatNumber, formatDecimal, formatTime, escapeHTML, MS_PER_DAY, TOAST_DURATION, DEBOUNCE_DELAY } from '../js/utils.js';

describe('formatNumber', () => {
  it('formats numbers with locale', () => {
    const result = formatNumber(1234);
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.includes('1'));
  });

  it('returns dash for null/undefined', () => {
    assert.strictEqual(formatNumber(null), '\u2014');
    assert.strictEqual(formatNumber(undefined), '\u2014');
  });
});

describe('formatDecimal', () => {
  it('formats to 1 decimal by default', () => {
    assert.strictEqual(formatDecimal(3.14159), '3.1');
  });

  it('formats to specified decimals', () => {
    assert.strictEqual(formatDecimal(3.14159, 2), '3.14');
  });

  it('returns dash for null/undefined', () => {
    assert.strictEqual(formatDecimal(null), '\u2014');
    assert.strictEqual(formatDecimal(undefined), '\u2014');
  });
});

describe('formatTime', () => {
  it('returns dash for zero or negative', () => {
    assert.strictEqual(formatTime(0), '\u2014');
    assert.strictEqual(formatTime(-5), '\u2014');
    assert.strictEqual(formatTime(null), '\u2014');
  });

  it('returns minutes for < 60', () => {
    assert.strictEqual(formatTime(30), '30m');
    assert.strictEqual(formatTime(5), '5m');
  });

  it('returns hours for exact hours', () => {
    assert.strictEqual(formatTime(60), '1h');
    assert.strictEqual(formatTime(120), '2h');
  });

  it('returns hours+minutes for mixed', () => {
    assert.strictEqual(formatTime(90), '1h 30m');
    assert.strictEqual(formatTime(150), '2h 30m');
  });
});

describe('escapeHTML', () => {
  it('escapes angle brackets', () => {
    const result = escapeHTML('<script>');
    assert.ok(result.includes('&lt;'));
    assert.ok(result.includes('&gt;'));
  });

  it('handles normal strings', () => {
    assert.strictEqual(escapeHTML('hello'), 'hello');
  });
});

describe('constants', () => {
  it('MS_PER_DAY is correct', () => {
    assert.strictEqual(MS_PER_DAY, 86400000);
  });

  it('TOAST_DURATION is positive', () => {
    assert.ok(TOAST_DURATION > 0);
  });

  it('DEBOUNCE_DELAY is positive', () => {
    assert.ok(DEBOUNCE_DELAY > 0);
  });
});