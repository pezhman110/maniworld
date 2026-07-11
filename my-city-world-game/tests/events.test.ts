import { CityEventRegistry } from '../src/modules/events';

describe('CityEventRegistry', () => {
  it('creates an event and counts uploaded photos without storing them', () => {
    const registry = new CityEventRegistry();
    const event = registry.create('city_1', 'birthday', { fa: 'تولد', ar: 'عيد ميلاد', en: 'Birthday' });
    registry.registerPhotoUpload(event.id);
    registry.registerPhotoUpload(event.id);
    expect(registry.getById(event.id).uploadedPhotoCount).toBe(2);
  });

  it('attaches a generated cartoon scene reference standing in for the photo', () => {
    const registry = new CityEventRegistry();
    const event = registry.create('city_1', 'outing', { fa: 'گردش', ar: 'نزهة', en: 'Outing' });
    registry.attachCartoonScene(event.id, 'cartoon_ref_1');
    expect(registry.getById(event.id).cartoonSceneRef).toBe('cartoon_ref_1');
  });

  it('lists events for a city sorted by occurrence time', () => {
    const registry = new CityEventRegistry();
    registry.create('city_1', 'party', { fa: 'مهمانی', ar: 'حفلة', en: 'Party' }, 200);
    registry.create('city_1', 'visit', { fa: 'دیدوبازدید', ar: 'زيارة', en: 'Visit' }, 100);
    const events = registry.forCity('city_1');
    expect(events[0].occurredAt).toBe(100);
    expect(events[1].occurredAt).toBe(200);
  });
});
