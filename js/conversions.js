export function initConversions() {
  bindOvenToAirFryer();
  bindVolumeConverter();
  bindWeightConverter();
  bindTemperatureConverter();
}

const ROUND = (n, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

function parseFraction(val) {
  if (!val) return NaN;
  const s = val.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (m) {
    const whole = m[1] ? parseInt(m[1]) : 0;
    const num = parseInt(m[2]);
    const den = parseInt(m[3]);
    if (den === 0) return NaN;
    return whole >= 0 ? whole + num / den : whole - num / den;
  }
  return NaN;
}

/* ── Oven ↔ Air Fryer ──────────────────────────────────── */

function bindOvenToAirFryer() {
  const ovenTemp = document.getElementById('conv-oven-temp');
  const ovenTime = document.getElementById('conv-oven-time');
  const afTemp = document.getElementById('conv-af-temp');
  const afTime = document.getElementById('conv-af-time');
  const note = document.getElementById('conv-af-note');

  if (!ovenTemp || !ovenTime || !afTemp || !afTime) return;

  ovenTemp.addEventListener('input', () => {
    const v = parseFloat(ovenTemp.value);
    afTemp.value = (!isNaN(v) && v > 0) ? Math.round(v - 25) : '';
    updateNote();
  });

  afTemp.addEventListener('input', () => {
    const v = parseFloat(afTemp.value);
    ovenTemp.value = (!isNaN(v) && v > 0) ? Math.round(v + 25) : '';
    updateNote();
  });

  ovenTime.addEventListener('input', () => {
    const v = parseFloat(ovenTime.value);
    afTime.value = (!isNaN(v) && v > 0) ? Math.round(v * 0.8) : '';
  });

  afTime.addEventListener('input', () => {
    const v = parseFloat(afTime.value);
    ovenTime.value = (!isNaN(v) && v > 0) ? Math.round(v / 0.8) : '';
  });

  function updateNote() {
    const ovenVal = parseFloat(ovenTemp.value);
    const afVal = parseFloat(afTemp.value);
    note.hidden = (isNaN(ovenVal) || ovenVal <= 0) && (isNaN(afVal) || afVal <= 0);
  }
}

/* ── Volume Converter ──────────────────────────────────── */

const VOLUME_UNITS = {
  cup: { name: 'Cups', ml: 236.588 },
  tbsp: { name: 'Tbsp', ml: 14.787 },
  tsp: { name: 'Tsp', ml: 4.929 },
  'fl-oz': { name: 'Fl oz', ml: 29.574 },
  ml: { name: 'ml', ml: 1 },
  liter: { name: 'Liters', ml: 1000 },
};

function bindVolumeConverter() {
  const input = document.getElementById('conv-vol-input');
  const unitSelect = document.getElementById('conv-vol-unit');
  const resultEl = document.getElementById('conv-vol-result');

  if (!input || !unitSelect || !resultEl) return;

  const update = () => {
    const value = parseFraction(input.value);
    const unit = unitSelect.value;
    if (isNaN(value) || value <= 0) {
      resultEl.innerHTML = '';
      return;
    }
    const ml = value * VOLUME_UNITS[unit].ml;
    const rows = Object.entries(VOLUME_UNITS)
      .filter(([key]) => key !== unit)
      .map(([, u]) => {
        const converted = ROUND(ml / u.ml, u.ml < 10 ? 1 : u.ml < 100 ? 2 : 3);
        return `<div class="converter-result-row"><span>${u.name}</span><span class="converter-result-value">${converted}</span></div>`;
      });
    resultEl.innerHTML = rows.join('');
  };

  input.addEventListener('input', update);
  unitSelect.addEventListener('change', update);
}

/* ── Weight Converter ──────────────────────────────────── */

const WEIGHT_UNITS = {
  lb: { name: 'Pounds (lbs)', g: 453.592 },
  oz: { name: 'Ounces (oz)', g: 28.35 },
  g: { name: 'Grams (g)', g: 1 },
  kg: { name: 'Kilograms', g: 1000 },
};

function bindWeightConverter() {
  const input = document.getElementById('conv-wt-input');
  const unitSelect = document.getElementById('conv-wt-unit');
  const resultEl = document.getElementById('conv-wt-result');

  if (!input || !unitSelect || !resultEl) return;

  const update = () => {
    const value = parseFraction(input.value);
    const unit = unitSelect.value;
    if (isNaN(value) || value <= 0) {
      resultEl.innerHTML = '';
      return;
    }
    const grams = value * WEIGHT_UNITS[unit].g;
    const rows = Object.entries(WEIGHT_UNITS)
      .filter(([key]) => key !== unit)
      .map(([, u]) => {
        const converted = ROUND(grams / u.g, u.g < 10 ? 1 : u.g < 100 ? 2 : 3);
        return `<div class="converter-result-row"><span>${u.name}</span><span class="converter-result-value">${converted}</span></div>`;
      });
    resultEl.innerHTML = rows.join('');
  };

  input.addEventListener('input', update);
  unitSelect.addEventListener('change', update);
}

/* ── Temperature Converter ──────────────────────────────── */

function bindTemperatureConverter() {
  const input = document.getElementById('conv-temp-input');
  const unitSelect = document.getElementById('conv-temp-unit');
  const resultEl = document.getElementById('conv-temp-result');

  if (!input || !unitSelect || !resultEl) return;

  const update = () => {
    const value = parseFraction(input.value);
    if (isNaN(value)) {
      resultEl.innerHTML = '';
      return;
    }
    const unit = unitSelect.value;
    let converted, label;
    if (unit === 'F') {
      converted = ROUND((value - 32) * 5 / 9);
      label = '\u00B0C (Celsius)';
    } else {
      converted = ROUND(value * 9 / 5 + 32);
      label = '\u00B0F (Fahrenheit)';
    }
    resultEl.innerHTML = `<div class="converter-result-row"><span>${label}</span><span class="converter-result-value">${converted}</span></div>`;
  };

  input.addEventListener('input', update);
  unitSelect.addEventListener('change', update);
}