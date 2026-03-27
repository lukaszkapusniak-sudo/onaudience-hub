/* ═══════════════════════════════════════════════════════════════
   theme.js — Theme toggle (light/dark)
   ═══════════════════════════════════════════════════════════════ */

let theme = localStorage.getItem('oaTheme') || 'light';
document.documentElement.setAttribute('data-theme', theme);

export function getTheme() { return theme; }

export function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('oaTheme', theme);
  updateBtn();
}

function updateBtn() {
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* initial icon */
updateBtn();
