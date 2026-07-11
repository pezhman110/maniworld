import { BirthdayEventRegistry, SeasonalEventRegistry } from '../src/modules/specialEvents';

describe('BirthdayEventRegistry', () => {
  it('celebrates a birthday and attaches an artifact', () => {
    const registry = new BirthdayEventRegistry();
    const event = registry.celebrate('c1', 'city1');
    registry.attachArtifact(event.id, 'artifact1');
    expect(registry.eventsForChild('c1')[0].artifactId).toBe('artifact1');
  });
});

describe('SeasonalEventRegistry', () => {
  it('returns only the events configured for a region', () => {
    const registry = new SeasonalEventRegistry();
    const irEvents = registry.rulesForRegion('IR').map((rule) => rule.id);
    expect(irEvents).toEqual(expect.arrayContaining(['nowruz', 'yalda', 'ramadan-eid']));
    expect(irEvents).not.toContain('uae-national-day');
  });

  it('detects whether an event is active for a given date', () => {
    const registry = new SeasonalEventRegistry();
    expect(registry.isActive('AE', 'uae-national-day', 12, 2)).toBe(true);
    expect(registry.isActive('AE', 'uae-national-day', 6, 15)).toBe(false);
  });

  it('returns false for an event not configured for the region', () => {
    const registry = new SeasonalEventRegistry();
    expect(registry.isActive('IR', 'uae-national-day', 12, 2)).toBe(false);
  });
});
