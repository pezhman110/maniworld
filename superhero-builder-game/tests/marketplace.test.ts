import { MarketplaceRegistry, ListingNotActiveError } from '../src/modules/marketplace';
import { MarketplacePriceTiers } from '../src/types/domain';

const prices: MarketplacePriceTiers = {
  digitalPrice: 100,
  printedCardWithLogoPrice: 250,
  physicalShippingPrice: 400,
  personalized3dStatuePrice: 800,
};

describe('MarketplaceRegistry', () => {
  it('lists a character with independent price tiers', () => {
    const registry = new MarketplaceRegistry();
    const listing = registry.list('character_1', 'creator_1', prices);
    expect(listing.active).toBe(true);
    expect(listing.prices).toEqual(prices);
  });

  it('pays coins to the original creator on purchase, not the buyer or platform', () => {
    const registry = new MarketplaceRegistry();
    const listing = registry.list('character_1', 'creator_1', prices);

    const { purchase } = registry.purchase(listing.id, 'buyer_1', 'digital', false);
    expect(purchase.coinsPaidToCreator).toBe(100);
    expect(registry.coinsEarnedByCreator('creator_1')).toBe(100);
  });

  it('charges different amounts per tier', () => {
    const registry = new MarketplaceRegistry();
    const listing = registry.list('character_1', 'creator_1', prices);

    const digital = registry.purchase(listing.id, 'buyer_1', 'digital', false);
    const card = registry.purchase(listing.id, 'buyer_2', 'printed-card-with-logo', false);
    const shipped = registry.purchase(listing.id, 'buyer_3', 'physical-shipping', false);

    expect(digital.purchase.coinsPaidToCreator).toBe(100);
    expect(card.purchase.coinsPaidToCreator).toBe(250);
    expect(shipped.purchase.coinsPaidToCreator).toBe(400);
  });

  it('creates a 3D statue order and adds its price when the buyer wants their own name on it', () => {
    const registry = new MarketplaceRegistry();
    const listing = registry.list('character_1', 'creator_1', prices);

    const { purchase, statueOrder } = registry.purchase(listing.id, 'buyer_1', 'digital', true);
    expect(purchase.coinsPaidToCreator).toBe(100 + 800);
    expect(statueOrder).toBeDefined();
    expect(statueOrder?.characterId).toBe('character_1');
    expect(registry.statueOrdersForBuyer('buyer_1')).toHaveLength(1);
  });

  it('does not create a statue order when the buyer does not want their own name', () => {
    const registry = new MarketplaceRegistry();
    const listing = registry.list('character_1', 'creator_1', prices);

    const { statueOrder } = registry.purchase(listing.id, 'buyer_1', 'digital', false);
    expect(statueOrder).toBeUndefined();
  });

  it('rejects purchasing an unlisted/inactive listing', () => {
    const registry = new MarketplaceRegistry();
    const listing = registry.list('character_1', 'creator_1', prices);
    registry.unlist(listing.id);

    expect(() => registry.purchase(listing.id, 'buyer_1', 'digital', false)).toThrow(ListingNotActiveError);
  });

  it('aggregates coins earned across multiple listings for the same creator', () => {
    const registry = new MarketplaceRegistry();
    const listingA = registry.list('character_1', 'creator_1', prices);
    const listingB = registry.list('character_2', 'creator_1', prices);

    registry.purchase(listingA.id, 'buyer_1', 'digital', false);
    registry.purchase(listingB.id, 'buyer_2', 'digital', false);

    expect(registry.coinsEarnedByCreator('creator_1')).toBe(200);
  });
});
