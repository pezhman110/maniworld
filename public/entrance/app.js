const RTL_LOCALES = new Set(['fa', 'ar']);
const LOCALE_STORAGE_KEY = 'mw_locale';
const HANDOFF_KEY = 'mw_handoff_api_key';

let translations = null;

function currentLocale() {
  return localStorage.getItem(LOCALE_STORAGE_KEY) || 'en';
}

function applyDirection(locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

function applyTranslations(locale) {
  if (!translations) return;
  const dict = translations[locale] || translations.en || {};
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
}

function setLocale(locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  applyDirection(locale);
  applyTranslations(locale);
  document.querySelectorAll('#langToggle button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === locale);
  });
}

async function loadTranslations() {
  try {
    const res = await fetch('/api/i18n');
    const body = await res.json();
    translations = body.translations || {};
  } catch (err) {
    translations = {};
  }
}

function setupLangToggle() {
  document.querySelectorAll('#langToggle button').forEach((btn) => {
    btn.addEventListener('click', () => setLocale(btn.dataset.lang));
  });
}

function setStatus(message, kind) {
  const status = document.getElementById('entranceStatus');
  status.textContent = message;
  status.className = 'status-msg' + (kind ? ' ' + kind : '');
}

function statusText(key, fallback) {
  const locale = currentLocale();
  const dict = (translations && (translations[locale] || translations.en)) || {};
  return dict[key] || fallback;
}

function setupEntranceForm() {
  document.getElementById('entranceForm').addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const apiKey = document.getElementById('entranceApiKey').value;
    setStatus(statusText('entrance.checking', 'Checking…'));
    try {
      const headers = {};
      if (apiKey) headers['x-api-key'] = apiKey;
      const res = await fetch('/api/markets', { headers });
      if (!res.ok && res.status === 401) {
        setStatus(statusText('entrance.invalid', 'Invalid API key. Please try again.'), 'error');
        return;
      }
      setStatus(statusText('entrance.success', 'Signed in — redirecting…'), 'success');
      // Hand the key off to the dashboard for this single navigation only;
      // the dashboard reads and immediately deletes it (never persisted).
      if (apiKey) sessionStorage.setItem(HANDOFF_KEY, apiKey);
      window.location.href = '/dashboard/';
    } catch (err) {
      setStatus(statusText('entrance.invalid', 'Invalid API key. Please try again.'), 'error');
    }
  });
}

(async function init() {
  setLocale(currentLocale());
  await loadTranslations();
  applyTranslations(currentLocale());
  setupLangToggle();
  setupEntranceForm();
})();
