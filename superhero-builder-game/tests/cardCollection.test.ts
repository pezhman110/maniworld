import { CardCollectionRegistry } from '../src/modules/cardCollection';
import { MAX_CARDS_FOR_CUSTOM_GAME } from '../src/types/domain';

describe('CardCollectionRegistry', () => {
  it('tracks cards collected per owner', () => {
    const registry = new CardCollectionRegistry();
    registry.addCard('owner_1', 'character_1');
    registry.addCard('owner_1', 'character_2');
    expect(registry.cardsForOwner('owner_1')).toHaveLength(2);
    expect(registry.cardsRemainingForCustomGame('owner_1')).toBe(MAX_CARDS_FOR_CUSTOM_GAME - 2);
  });

  it('does not generate a custom game before reaching the 52-card cap', () => {
    const registry = new CardCollectionRegistry();
    for (let i = 0; i < 51; i += 1) {
      registry.addCard('owner_1', `character_${i}`);
    }
    const game = registry.maybeGenerateCustomGame('owner_1', "Owner 1's Game");
    expect(game).toBeUndefined();
  });

  it('auto-generates a custom game listed in the marketplace once 52 cards are collected', () => {
    const registry = new CardCollectionRegistry();
    for (let i = 0; i < MAX_CARDS_FOR_CUSTOM_GAME; i += 1) {
      registry.addCard('owner_1', `character_${i}`);
    }
    const game = registry.maybeGenerateCustomGame('owner_1', "Owner 1's Game");
    expect(game).toBeDefined();
    expect(game?.listedInMarketplace).toBe(true);
    expect(game?.cardIds).toHaveLength(MAX_CARDS_FOR_CUSTOM_GAME);
  });

  it('is idempotent: generating twice returns the same custom game', () => {
    const registry = new CardCollectionRegistry();
    for (let i = 0; i < MAX_CARDS_FOR_CUSTOM_GAME; i += 1) {
      registry.addCard('owner_1', `character_${i}`);
    }
    const first = registry.maybeGenerateCustomGame('owner_1', "Owner 1's Game");
    const second = registry.maybeGenerateCustomGame('owner_1', "Owner 1's Game");
    expect(second?.id).toBe(first?.id);
  });

  it('supports requesting own-logo print and physical shipping for a custom game', () => {
    const registry = new CardCollectionRegistry();
    for (let i = 0; i < MAX_CARDS_FOR_CUSTOM_GAME; i += 1) {
      registry.addCard('owner_1', `character_${i}`);
    }
    const game = registry.maybeGenerateCustomGame('owner_1', "Owner 1's Game")!;

    registry.requestOwnLogoPrint(game.id);
    registry.requestPhysicalShipping(game.id);

    const updated = registry.getCustomGame(game.id);
    expect(updated.hasOwnLogoPrint).toBe(true);
    expect(updated.physicalShippingRequested).toBe(true);
  });
});
