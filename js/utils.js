export const MS_PER_DAY = 86400000;
export const TOAST_DURATION = 2800;
export const DEBOUNCE_DELAY = 300;

export function showToast(message, type = '') {
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
  }, TOAST_DURATION);
}

export function showDialog({ title, content, actions } = {}) {
  const existing = document.querySelector('.dialog-overlay');
  if (existing) existing.remove();
  const previousFocus = document.activeElement;
  const scrollY = window.scrollY;

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
      <button class="icon-btn dialog-close-btn" aria-label="Close dialog">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      ${title ? `<h2 class="dialog-title">${title}</h2>` : ''}
      ${content ? `<div class="dialog-content">${content}</div>` : ''}
      ${actionsHTML}
    </div>`;

  const closeDialog = () => {
    overlay.remove();
    document.body.style.overflow = '';
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus({ preventScroll: true });
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
      return;
    }
    if (e.key === 'Tab') {
      const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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

export function showConfirm(message, onConfirm) {
  return showDialog({
    title: message,
    actions: [
      { id: 'cancel', label: 'Cancel' },
      { id: 'confirm', label: 'Confirm', primary: true, callback: onConfirm },
    ],
  });
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Math.round(n).toLocaleString();
}

export function formatDecimal(n, decimals = 1) {
  if (n === null || n === undefined) return '—';
  return parseFloat(n).toFixed(decimals);
}

export function debounce(fn, delay = DEBOUNCE_DELAY) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatTime(minutes) {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}