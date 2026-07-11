import { CityRegistry, InsufficientResourcesError } from '../src/modules/cityBuilder';

describe('CityRegistry', () => {
  it('creates a city with starting resources', () => {
    const registry = new CityRegistry();
    const city = registry.createCity({ childId: 'c1', name: 'Sunshine City' });
    expect(city.resources.wood).toBe(20);
    expect(city.buildings).toHaveLength(0);
  });

  it('builds a building and deducts resources', () => {
    const registry = new CityRegistry();
    const city = registry.createCity({ childId: 'c1', name: 'Sunshine City' });
    registry.build(city.id, 'house');
    expect(city.resources.wood).toBe(10);
    expect(city.buildings).toHaveLength(1);
    expect(city.greenPercentage).toBe(100);
  });

  it('throws when resources are insufficient', () => {
    const registry = new CityRegistry();
    const city = registry.createCity({ childId: 'c1', name: 'Sunshine City' });
    registry.addResources(city.id, { wood: -20 });
    expect(() => registry.build(city.id, 'house')).toThrow(InsufficientResourcesError);
  });

  it('withers buildings when resources run dry (city emotions)', () => {
    const registry = new CityRegistry();
    const city = registry.createCity({ childId: 'c1', name: 'Sunshine City' });
    registry.build(city.id, 'house');
    registry.addResources(city.id, { water: -20, energy: -20 });

    registry.applyEmotionTick(city.id);
    expect(city.buildings[0].health).toBe(90);
    expect(city.greenPercentage).toBe(90);
  });

  it('thrives buildings when resources are healthy', () => {
    const registry = new CityRegistry();
    const city = registry.createCity({ childId: 'c1', name: 'Sunshine City' });
    registry.build(city.id, 'house');
    city.buildings[0].health = 50;

    registry.applyEmotionTick(city.id);
    expect(city.buildings[0].health).toBe(55);
  });
});
