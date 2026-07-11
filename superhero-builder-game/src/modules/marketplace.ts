import {
  MarketplaceListing,
  MarketplacePriceTiers,
  MarketplacePurchase,
  PurchaseTier,
  Statue3DOrder,
} from '../types/domain';

/**
 * Marketplace module (economy).
 *
 * A finished character (plus its approved tools/habitat) can be listed for
 * sale. Each listing carries several independent price tiers: a plain
 * digital purchase, a printed card with the buyer's own logo/emblem, and
 * physical shipping — each priced separately since they cost different
 * amounts to fulfill. When someone buys a listing, coins are paid out to
 * the original creator (never the platform). If the buyer wants the
 * character personalized under their own name, a 3D-statue print order is
 * created alongside the purchase.
 */
export class UnknownListingError extends Error {
  constructor(listingId: string) {
    super(`Unknown marketplace listing id: ${listingId}`);
    this.name = 'UnknownListingError';
  }
}

export class ListingNotActiveError extends Error {
  constructor(listingId: string) {
    super(`Marketplace listing ${listingId} is not active.`);
    this.name = 'ListingNotActiveError';
  }
}

export class MarketplaceRegistry {
  private listings = new Map<string, MarketplaceListing>();
  private purchases = new Map<string, MarketplacePurchase>();
  private statueOrders = new Map<string, Statue3DOrder>();
  private sequence = 0;

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }

  list(characterId: string, creatorId: string, prices: MarketplacePriceTiers, listedAt: number = Date.now()): MarketplaceListing {
    const listing: MarketplaceListing = {
      id: this.nextId('listing'),
      characterId,
      creatorId,
      prices,
      listedAt,
      active: true,
    };
    this.listings.set(listing.id, listing);
    return listing;
  }

  unlist(listingId: string): MarketplaceListing {
    const listing = this.getListing(listingId);
    listing.active = false;
    return listing;
  }

  private priceForTier(prices: MarketplacePriceTiers, tier: PurchaseTier): number {
    switch (tier) {
      case 'digital':
        return prices.digitalPrice;
      case 'printed-card-with-logo':
        return prices.printedCardWithLogoPrice;
      case 'physical-shipping':
        return prices.physicalShippingPrice;
      default:
        throw new Error(`Unknown purchase tier: ${tier}`);
    }
  }

  /**
   * Buys a listing at the given price tier. Coins always go to the
   * `creatorId` recorded on the listing. When `wantsOwnName` is true, a 3D
   * statue print order is created for the buyer in addition to the purchase.
   */
  purchase(listingId: string, buyerId: string, tier: PurchaseTier, wantsOwnName: boolean, purchasedAt: number = Date.now()): {
    purchase: MarketplacePurchase;
    statueOrder?: Statue3DOrder;
  } {
    const listing = this.getListing(listingId);
    if (!listing.active) {
      throw new ListingNotActiveError(listingId);
    }
    let coinsPaidToCreator = this.priceForTier(listing.prices, tier);
    if (wantsOwnName) {
      coinsPaidToCreator += listing.prices.personalized3dStatuePrice;
    }
    const purchase: MarketplacePurchase = {
      id: this.nextId('purchase'),
      listingId,
      buyerId,
      tier,
      wantsOwnName,
      coinsPaidToCreator,
      purchasedAt,
    };
    this.purchases.set(purchase.id, purchase);

    let statueOrder: Statue3DOrder | undefined;
    if (wantsOwnName) {
      statueOrder = {
        id: this.nextId('statue'),
        purchaseId: purchase.id,
        buyerId,
        characterId: listing.characterId,
        buyerDisplayName: buyerId,
        createdAt: purchasedAt,
      };
      this.statueOrders.set(statueOrder.id, statueOrder);
    }

    return { purchase, statueOrder };
  }

  /** Total coins earned by a creator across all their listings' purchases. */
  coinsEarnedByCreator(creatorId: string): number {
    const creatorListingIds = new Set(
      [...this.listings.values()].filter((listing) => listing.creatorId === creatorId).map((listing) => listing.id)
    );
    return [...this.purchases.values()]
      .filter((purchase) => creatorListingIds.has(purchase.listingId))
      .reduce((sum, purchase) => sum + purchase.coinsPaidToCreator, 0);
  }

  getListing(listingId: string): MarketplaceListing {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new UnknownListingError(listingId);
    }
    return listing;
  }

  listingsForCreator(creatorId: string): MarketplaceListing[] {
    return [...this.listings.values()].filter((listing) => listing.creatorId === creatorId);
  }

  purchasesForBuyer(buyerId: string): MarketplacePurchase[] {
    return [...this.purchases.values()].filter((purchase) => purchase.buyerId === buyerId);
  }

  statueOrdersForBuyer(buyerId: string): Statue3DOrder[] {
    return [...this.statueOrders.values()].filter((order) => order.buyerId === buyerId);
  }
}
