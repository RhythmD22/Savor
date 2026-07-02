import {
  getProfile,
  updateProfile,
  getWeightLog,
  addWeightEntry,
  deleteWeightEntry,
  calculateTDEE,
  getWeightTrend,
  getDailyTotals,
} from './data.js';
import { formatNumber, formatDecimal, showToast } from './utils.js';

const LBS_PER_KG = 2.20462;

function toLbs(kg) {
  return Math.round(kg * LBS_PER_KG * 10) / 10;
}

function toKg(lbs) {
  return lbs / LBS_PER_KG;
}

function inFromCm(cm) {
  return Math.round(cm / 2.54 * 10) / 10;
}

function cmFromIn(inches) {
  return inches * 2.54;
}

let weightChart = null;

function initHealth() {
  renderHealthProfile();
  renderWeightLog();
  bindEvents();
}

function renderHealthProfile() {
  const profile = getProfile();
  const tdee = calculateTDEE();
  const bmiRaw = calcBMI(profile);
  const bmiCategory = bmiRaw !== null ? getBMICategory(bmiRaw) : null;

  const elements = {
    'health-current-weight': profile.weight ? `${formatDecimal(toLbs(profile.weight))} lbs` : '—',
    'health-height': profile.height ? `${formatDecimal(inFromCm(profile.height))} in` : '—',
    'health-age': profile.age ? `${profile.age} yrs` : '—',
    'health-bmi': bmiRaw !== null ? formatDecimal(bmiRaw) : '—',
  };

  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const bmiCatEl = document.getElementById('health-bmi-category');
  if (bmiCatEl) {
    if (bmiCategory) {
      bmiCatEl.textContent = bmiCategory.label;
      bmiCatEl.className = `health-metric-category ${bmiCategory.class}`;
    } else {
      bmiCatEl.textContent = '';
      bmiCatEl.className = 'health-metric-category';
    }
  }

  const tdeeValue = document.getElementById('health-tdee');
  if (tdeeValue) {
    if (tdee) {
      tdeeValue.textContent = `${formatNumber(tdee)} cal/day`;
    } else {
      tdeeValue.textContent = 'Set profile to calculate';
    }
  }

  const trend = getWeightTrend();
  const trendEl = document.getElementById('health-weight-trend');
  if (trendEl) {
    if (trend) {
      const sign = trend.totalChange > 0 ? '+' : '';
      trendEl.textContent = `${sign}${formatDecimal(toLbs(trend.totalChange))} lbs over ${trend.daysDiff} days`;
      trendEl.className = 'health-metric-change';
      if (Math.abs(trend.totalChange) < 0.5) trendEl.classList.add('neutral');
      else if (trend.totalChange < 0) trendEl.classList.add('positive');
      else trendEl.classList.add('negative');
    } else {
      trendEl.textContent = 'Not enough data';
      trendEl.className = 'health-metric-change neutral';
    }
  }

  document.getElementById('profile-height')?.setAttribute('value', profile.height ? formatDecimal(inFromCm(profile.height)) : '');
  document.getElementById('profile-weight')?.setAttribute('value', profile.weight ? formatDecimal(toLbs(profile.weight)) : '');
  document.getElementById('profile-age')?.setAttribute('value', profile.age || '');

  const genderSelect = document.getElementById('profile-gender');
  if (genderSelect) genderSelect.value = profile.gender || '';

  const activitySelect = document.getElementById('profile-activity');
  if (activitySelect) activitySelect.value = profile.activityLevel || 'moderate';

  const calGoal = document.getElementById('profile-calorie-goal');
  if (calGoal) calGoal.setAttribute('value', profile.calorieGoal || 2000);

  document.getElementById('profile-protein-goal')?.setAttribute('value', profile.proteinGoal || 150);
  document.getElementById('profile-carbs-goal')?.setAttribute('value', profile.carbsGoal || 200);
  document.getElementById('profile-fat-goal')?.setAttribute('value', profile.fatGoal || 65);
}

function calcBMI(profile) {
  if (!profile.weight || !profile.height) return null;
  const heightM = profile.height / 100;
  return profile.weight / (heightM * heightM);
}

function calculateBMI(profile) {
  const bmi = calcBMI(profile);
  return bmi !== null ? formatDecimal(bmi) : '\u2014';
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', class: 'neutral' };
  if (bmi < 25) return { label: 'Normal', class: 'positive' };
  if (bmi < 30) return { label: 'Overweight', class: 'negative' };
  return { label: 'Obese', class: 'negative' };
}

function renderWeightLog() {
  const log = getWeightLog();
  const container = document.getElementById('weight-entries');
  if (!container) return;

  if (log.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-text">No weight entries yet. Log your first weight above.</p>
      </div>`;
  } else {
    const latest = log[log.length - 1];
    const entries = [...log].reverse().slice(0, 10);

    container.innerHTML = entries
      .map((entry) => {
        const date = new Date(entry.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const diff = latest && entry !== latest ? toLbs(entry.weight) - toLbs(latest.weight) : 0;
        const sign = diff > 0 ? '+' : '';
        const changeStr = entry === latest
          ? '<span class="health-metric-change neutral">latest</span>'
          : `<span class="health-metric-change ${diff < 0 ? 'positive' : diff > 0 ? 'negative' : 'neutral'}">${sign}${formatDecimal(diff)}</span>`;

        return `
          <div class="weight-entry">
            <span class="weight-entry-date">${date}</span>
            <span class="weight-entry-value">${formatDecimal(toLbs(entry.weight))} lbs</span>
            ${changeStr}
            <button class="weight-entry-delete" data-delete-weight="${entry.id}" aria-label="Delete entry">&times;</button>
          </div>`;
      })
      .join('');
  }

  renderWeightChart(log);
}

function renderWeightChart(log) {
  const chartContainer = document.getElementById('weight-chart');
  if (!chartContainer) return;

  const isLight = document.documentElement.dataset.theme === 'light';
  const tickColor = isLight ? '#7A6C60' : '#9A8E82';
  const gridColor = isLight ? 'rgba(184, 69, 13, 0.10)' : 'rgba(184, 69, 13, 0.12)';

  if (log.length < 2) {
    chartContainer.innerHTML = `
      <div class="chart-placeholder">
        <span>Log at least 2 weight entries to see a chart</span>
      </div>`;
    return;
  }

  chartContainer.innerHTML = '<canvas id="weightCanvas"></canvas>';

  if (typeof Chart === 'undefined') {
    setTimeout(() => {
      const canvas = document.getElementById('weightCanvas');
      if (canvas) {
        renderSimpleChart(canvas, log, tickColor);
      }
    }, 500);
  } else {
    const ctx = document.getElementById('weightCanvas')?.getContext('2d');
    if (!ctx) return;

    if (weightChart) weightChart.destroy();

    const labels = log.map((e) =>
      new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const weights = log.map((e) => toLbs(e.weight));

    weightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Weight (lbs)',
            data: weights,
            borderColor: '#D35A1C',
            backgroundColor: 'rgba(211, 90, 28, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#D35A1C',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
        },
      },
    });
  }
}

function renderSimpleChart(canvas, log, tickColor) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.offsetWidth || 300;
  const height = canvas.offsetHeight || 200;

  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(2, 2);

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const lbsLog = log.map((e) => toLbs(e.weight));
  const minWeight = Math.min(...lbsLog) - 1;
  const maxWeight = Math.max(...lbsLog) + 1;

  ctx.strokeStyle = 'rgba(184, 69, 13, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = tickColor;
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = maxWeight - ((maxWeight - minWeight) / 4) * i;
    const y = padding.top + (chartH / 4) * i + 3;
    ctx.fillText(val.toFixed(1), padding.left - 8, y);
  }

  const points = lbsLog.map((weight, i) => ({
    x: padding.left + (chartW / (log.length - 1 || 1)) * i,
    y: padding.top + chartH - ((weight - minWeight) / (maxWeight - minWeight)) * chartH,
  }));

  ctx.strokeStyle = '#D35A1C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
    ctx.bezierCurveTo(cp1x, points[i - 1].y, points[i].x - (points[i].x - points[i - 1].x) / 3, points[i].y, points[i].x, points[i].y);
  }

  ctx.stroke();

  ctx.fillStyle = 'rgba(211, 90, 28, 0.08)';
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.lineTo(points[0].x, padding.top + chartH);
  ctx.closePath();
  ctx.fill();

  points.forEach((p) => {
    ctx.fillStyle = '#D35A1C';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function bindEvents() {
  const profileForm = document.getElementById('health-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const weightLbs = parseFloat(document.getElementById('profile-weight')?.value);
      const heightIn = parseFloat(document.getElementById('profile-height')?.value);
      const updates = {
        height: heightIn ? cmFromIn(heightIn) : null,
        weight: weightLbs ? toKg(weightLbs) : null,
        age: parseInt(document.getElementById('profile-age')?.value) || null,
        gender: document.getElementById('profile-gender')?.value || null,
        activityLevel: document.getElementById('profile-activity')?.value || 'moderate',
        calorieGoal: parseInt(document.getElementById('profile-calorie-goal')?.value) || null,
        proteinGoal: parseInt(document.getElementById('profile-protein-goal')?.value) || null,
        carbsGoal: parseInt(document.getElementById('profile-carbs-goal')?.value) || null,
        fatGoal: parseInt(document.getElementById('profile-fat-goal')?.value) || null,
      };

      updateProfile(updates);
      showToast('Profile updated');
      renderHealthProfile();

      const tdee = calculateTDEE();
      if (tdee && !document.getElementById('profile-calorie-goal')?.value) {
        const calGoalEl = document.getElementById('profile-calorie-goal');
        if (calGoalEl) calGoalEl.setAttribute('value', tdee);
      }
    });
  }

  const weightForm = document.getElementById('add-weight-form');
  if (weightForm) {
    weightForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('new-weight-input');
      if (!input || !input.value) return;

      const weightLbs = parseFloat(input.value);
      if (isNaN(weightLbs) || weightLbs <= 0) {
        showToast('Enter a valid weight', 'error');
        return;
      }

      const weightKg = toKg(weightLbs);
      addWeightEntry(weightKg);
      updateProfile({ weight: weightKg });
      input.value = '';
      showToast('Weight logged');
      renderHealthProfile();
      renderWeightLog();
    });
  }

  const weightEntries = document.getElementById('weight-entries');
  if (weightEntries) {
    weightEntries.addEventListener('click', (e) => {
      const btn = e.target.closest('.weight-entry-delete');
      if (!btn) return;
      const id = btn.dataset.deleteWeight;
      if (!id) return;
      deleteWeightEntry(id);
      showToast('Entry deleted');
      renderHealthProfile();
      renderWeightLog();
    });
  }
}

export { initHealth };