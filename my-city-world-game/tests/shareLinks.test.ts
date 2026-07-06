import { ShareRegistry } from '../src/modules/shareLinks';

describe('ShareRegistry', () => {
  it('creates a /mycity/share/:id link with locale-complete meta', () => {
    const registry = new ShareRegistry();
    const record = registry.createShareLink(
      'city_1',
      { fa: 'شهر من', ar: 'مدينتي', en: 'My City' },
      { fa: 'یک شهر زیبا', ar: 'مدينة جميلة', en: 'A beautiful city' },
      'thumb_ref_1'
    );
    expect(record.slugPath).toBe(`/mycity/share/${record.id}`);
  });

  it('produces Web Share API-ready data for a given locale', () => {
    const registry = new ShareRegistry();
    const record = registry.createShareLink(
      'city_1',
      { fa: 'شهر من', ar: 'مدينتي', en: 'My City' },
      { fa: 'یک شهر زیبا', ar: 'مدينة جميلة', en: 'A beautiful city' },
      'thumb_ref_1'
    );
    const shareData = registry.toWebShareData(record.id, 'en');
    expect(shareData).toEqual({ title: 'My City', text: 'A beautiful city', url: record.slugPath });
  });

  it('lists share records for a given city', () => {
    const registry = new ShareRegistry();
    registry.createShareLink('city_1', { fa: 'a', ar: 'a', en: 'a' }, { fa: 'b', ar: 'b', en: 'b' }, 'thumb');
    expect(registry.forCity('city_1')).toHaveLength(1);
  });
});
