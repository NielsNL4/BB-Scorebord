const themeKey = 'rondje.theme';
const preference = matchMedia('(prefers-color-scheme: dark)');
let chosen = null;
try { chosen = localStorage.getItem(themeKey); } catch { /* System preference still works without storage. */ }
if (!['light', 'dark'].includes(chosen)) chosen = null;

function applyTheme() {
  const theme = chosen ?? (preference.matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#141e1b' : '#214f43';
  const button = document.querySelector('#theme-button');
  if (button) {
    button.textContent = theme === 'dark' ? '☀' : '☾';
    button.setAttribute('aria-label', theme === 'dark' ? 'Lichte modus inschakelen' : 'Donkere modus inschakelen');
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }
}
applyTheme();
preference.addEventListener('change', applyTheme);
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  document.querySelector('#theme-button').addEventListener('click', () => {
    chosen = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { localStorage.setItem(themeKey, chosen); } catch {
      document.querySelector('#save-status').textContent = 'Thema aangepast; voorkeur bewaren lukt niet.';
    }
  });
});
