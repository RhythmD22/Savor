function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`.trimEnd();
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 2800);
}

function showDialog({ title, content, actions } = {}) {
  const existing = document.querySelector('.dialog-overlay');
  if (existing) existing.remove();
  const previousFocus = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title || 'Dialog');

  let actionsHTML = '';
  if (actions && actions.length) {
    actionsHTML = `
      <div class="dialog-actions">
        ${actions
        .map(
          (a) =>
            `<button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}"
                data-action="${a.id || ''}">${a.label}</button>`
        )
        .join('')}
      </div>`;
  }

  overlay.innerHTML = `
    <div class="dialog-sheet">
      <div class="dialog-handle"></div>
      <button class="icon-btn dialog-close-btn" aria-label="Close dialog" style="position:absolute;top:var(--space-md);right:var(--space-md)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      ${title ? `<h2 class="dialog-title">${title}</h2>` : ''}
      ${content ? `<div class="dialog-content">${content}</div>` : ''}
      ${actionsHTML}
    </div>`;

  const closeDialog = () => {
    overlay.remove();
    document.body.style.overflow = '';
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });

  const closeBtn = overlay.querySelector('.dialog-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeDialog);

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeDialog();
    }
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const firstBtn = overlay.querySelector('button');
  if (firstBtn) firstBtn.focus();

  if (actions && actions.length) {
    actions.forEach((a) => {
      const btn = overlay.querySelector(`[data-action="${a.id}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (a.callback) a.callback();
          closeDialog();
        });
      }
    });
  }

  return { close: closeDialog };
}

function showConfirm(message, onConfirm) {
  return showDialog({
    title: message,
    actions: [
      { id: 'cancel', label: 'Cancel' },
      { id: 'confirm', label: 'Confirm', primary: true, callback: onConfirm },
    ],
  });
}

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Math.round(n).toLocaleString();
}

function formatDecimal(n, decimals = 1) {
  if (n === null || n === undefined) return '—';
  return parseFloat(n).toFixed(decimals);
}

function getRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatTime(minutes) {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getMealTypeEmoji(type) {
  const map = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
  };
  return map[type] || '🍽️';
}

function getMacroColor(type) {
  const map = {
    protein: 'var(--macro-protein)',
    carbs: 'var(--macro-carbs)',
    fat: 'var(--macro-fat)',
  };
  return map[type] || 'var(--text-secondary)';
}

export {
  showToast,
  showDialog,
  showConfirm,
  formatNumber,
  formatDecimal,
  getRelativeDate,
  debounce,
  formatTime,
  getMealTypeEmoji,
  getMacroColor,
};