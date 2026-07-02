function getPreferredTheme() {
  const saved = localStorage.getItem('savor_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('savor_theme', theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#FFFBF8' : '#1C1714');
  }

  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }
}

export function initTheme() {
  applyTheme(getPreferredTheme());

  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('savor_theme')) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });
}
