import { WebsiteIntegrationRegistry } from '../src/modules/integrations';

describe('integrations', () => {
  it('stores and retrieves a website/pricing config for a market', () => {
    const registry = new WebsiteIntegrationRegistry();
    registry.set({
      market: 'salon-women',
      websiteUrl: 'https://maniworld.com/salon',
      priceListUrl: 'https://maniworld.com/salon/prices',
      syncPricesAutomatically: true,
    });

    expect(registry.get('salon-women')?.priceListUrl).toBe('https://maniworld.com/salon/prices');
    expect(registry.all()).toHaveLength(1);
    expect(registry.remove('salon-women')).toBe(true);
    expect(registry.get('salon-women')).toBeUndefined();
  });

  it('rejects a non-URL websiteUrl or priceListUrl', () => {
    const registry = new WebsiteIntegrationRegistry();
    expect(() =>
      registry.set({ market: 'salon-women', websiteUrl: 'not-a-url', syncPricesAutomatically: false })
    ).toThrow();
    expect(() =>
      registry.set({
        market: 'salon-women',
        websiteUrl: 'https://maniworld.com',
        priceListUrl: 'not-a-url',
        syncPricesAutomatically: false,
      })
    ).toThrow();
  });
});
