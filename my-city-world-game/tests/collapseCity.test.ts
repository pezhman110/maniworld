import { CityLifecycleRegistry } from '../src/modules/collapseCity';

describe('CityLifecycleRegistry', () => {
  it('defaults a city to active', () => {
    const registry = new CityLifecycleRegistry();
    expect(registry.isCollapsed('city_1')).toBe(false);
  });

  it('collapses and reopens a city without deleting it', () => {
    const registry = new CityLifecycleRegistry();
    registry.collapse('city_1');
    expect(registry.isCollapsed('city_1')).toBe(true);
    registry.reopen('city_1');
    expect(registry.isCollapsed('city_1')).toBe(false);
  });

  it('rejects collapsing an already-collapsed city', () => {
    const registry = new CityLifecycleRegistry();
    registry.collapse('city_1');
    expect(() => registry.collapse('city_1')).toThrow();
  });

  it('rejects reopening an already-active city', () => {
    const registry = new CityLifecycleRegistry();
    expect(() => registry.reopen('city_1')).toThrow();
  });
});
