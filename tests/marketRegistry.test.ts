import { DuplicateMarketError, MarketRegistry } from '../src/modules/marketRegistry';
import { computeMarketPacing } from '../src/modules/marketTargets';

describe('MarketRegistry', () => {
  it('lets a manager add a brand-new market with its own working hours and target rules', async () => {
    const registry = new MarketRegistry();

    const market = await registry.addMarket({
      id: 'franchise-expansion',
      label: 'Franchise Expansion',
      workingHours: { startHour: 9, endHour: 18 },
      targetRules: [{ metric: 'online-session', minPerDay: 20, maxPerDay: 30 }],
    });

    expect(market.active).toBe(true);
    expect(await registry.listMarkets()).toHaveLength(1);
  });

  it('rejects a custom market id that collides with a built-in market', async () => {
    const registry = new MarketRegistry();
    await expect(
      registry.addMarket({
        id: 'salon-women',
        label: 'x',
        workingHours: { startHour: 9, endHour: 18 },
        targetRules: [{ metric: 'confirmed-booking', minPerDay: 10 }],
      })
    ).rejects.toThrow();
  });

  it('rejects a duplicate custom market id', async () => {
    const registry = new MarketRegistry();
    const params = {
      id: 'franchise-expansion',
      label: 'x',
      workingHours: { startHour: 9, endHour: 18 },
      targetRules: [{ metric: 'online-session' as const, minPerDay: 10 }],
    };
    await registry.addMarket(params);
    await expect(registry.addMarket(params)).rejects.toThrow(DuplicateMarketError);
  });

  it('merges custom target rules with the built-in DEFAULT_MARKET_TARGETS via getEffectiveTargetRules()', async () => {
    const registry = new MarketRegistry();
    await registry.addMarket({
      id: 'franchise-expansion',
      label: 'Franchise Expansion',
      workingHours: { startHour: 9, endHour: 18 },
      targetRules: [{ metric: 'online-session', minPerDay: 20, maxPerDay: 30 }],
    });

    const rules = await registry.getEffectiveTargetRules();
    expect(rules.some((r) => r.market === 'salon-women')).toBe(true);
    expect(rules.some((r) => (r.market as string) === 'franchise-expansion')).toBe(true);
  });

  it('resolves working hours for both built-in and custom markets', async () => {
    const registry = new MarketRegistry();
    await registry.addMarket({
      id: 'franchise-expansion',
      label: 'Franchise Expansion',
      workingHours: { startHour: 9, endHour: 18 },
      targetRules: [{ metric: 'online-session', minPerDay: 20 }],
    });

    expect(await registry.getEffectiveWorkingHours('salon-women')).toEqual({ startHour: 10, endHour: 22 });
    expect(await registry.getEffectiveWorkingHours('franchise-expansion')).toEqual({
      startHour: 9,
      endHour: 18,
    });
    expect(await registry.getEffectiveWorkingHours('unknown-market')).toBeUndefined();
  });

  it('a custom market can be plugged straight into computeMarketPacing()', async () => {
    const registry = new MarketRegistry();
    await registry.addMarket({
      id: 'franchise-expansion',
      label: 'Franchise Expansion',
      workingHours: { startHour: 9, endHour: 18 },
      targetRules: [{ metric: 'online-session', minPerDay: 20, maxPerDay: 30 }],
    });

    const rules = await registry.getEffectiveTargetRules();
    const workingHours = await registry.getEffectiveWorkingHours('franchise-expansion');

    const report = computeMarketPacing({
      market: 'franchise-expansion' as never,
      metric: 'online-session',
      achievedSoFar: 5,
      currentHour: 12,
      workingHours,
      rules,
    });

    expect(report.minPerDay).toBe(20);
    expect(report.maxPerDay).toBe(30);
  });

  it('updateMarket() and removeMarket() work as expected', async () => {
    const registry = new MarketRegistry();
    await registry.addMarket({
      id: 'franchise-expansion',
      label: 'Franchise Expansion',
      workingHours: { startHour: 9, endHour: 18 },
      targetRules: [{ metric: 'online-session', minPerDay: 20 }],
    });

    const updated = await registry.updateMarket('franchise-expansion', { active: false });
    expect(updated.active).toBe(false);
    expect(await registry.listMarkets()).toHaveLength(0);
    expect(await registry.listMarkets(false)).toHaveLength(1);

    expect(await registry.removeMarket('franchise-expansion')).toBe(true);
    expect(await registry.getMarket('franchise-expansion')).toBeUndefined();
  });
});
