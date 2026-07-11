import { t, TRANSLATIONS } from '../src/modules/i18n';

describe('i18n', () => {
  it('translates a known key into English and Farsi', () => {
    expect(t('dashboard.title', 'en')).toBe('Sales Pacing Dashboard');
    expect(t('dashboard.title', 'fa')).not.toBe('Sales Pacing Dashboard');
    expect(t('dashboard.title', 'fa')).toBe(TRANSLATIONS.fa['dashboard.title']);
  });

  it('translates a known key into Arabic', () => {
    expect(t('dashboard.title', 'ar')).not.toBe('Sales Pacing Dashboard');
    expect(t('dashboard.title', 'ar')).toBe(TRANSLATIONS.ar['dashboard.title']);
  });

  it('defaults to English when no locale is given', () => {
    expect(t('dashboard.market')).toBe(TRANSLATIONS.en['dashboard.market']);
  });

  it('falls back to the raw key for an unknown translation key', () => {
    expect(t('dashboard.doesNotExist')).toBe('dashboard.doesNotExist');
  });

  it('every English key has a matching Farsi translation', () => {
    const enKeys = Object.keys(TRANSLATIONS.en);
    const faKeys = new Set(Object.keys(TRANSLATIONS.fa));
    for (const key of enKeys) {
      expect(faKeys.has(key)).toBe(true);
    }
  });

  it('every English key has a matching Arabic translation', () => {
    const enKeys = Object.keys(TRANSLATIONS.en);
    const arKeys = new Set(Object.keys(TRANSLATIONS.ar));
    for (const key of enKeys) {
      expect(arKeys.has(key)).toBe(true);
    }
  });
});
