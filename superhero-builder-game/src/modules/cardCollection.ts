import { Card, CustomGame, MAX_CARDS_FOR_CUSTOM_GAME } from '../types/domain';

/**
 * Card collection module.
 *
 * Every finished character can be turned into a collectible card. Once a
 * creator collects 52 cards, a custom game is auto-generated from their
 * collection and listed in the marketplace under their own name. From
 * there the creator can optionally print it with their own
 * logo/emblem and request physical shipping (each a separate paid option,
 * mirroring the marketplace's tiered pricing).
 */
export class UnknownCardError extends Error {
  constructor(cardId: string) {
    super(`Unknown card id: ${cardId}`);
    this.name = 'UnknownCardError';
  }
}

export class UnknownCustomGameError extends Error {
  constructor(gameId: string) {
    super(`Unknown custom game id: ${gameId}`);
    this.name = 'UnknownCustomGameError';
  }
}

export class CardCollectionRegistry {
  private cards = new Map<string, Card>();
  private customGames = new Map<string, CustomGame>();
  private sequence = 0;

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }

  addCard(ownerId: string, characterId: string, createdAt: number = Date.now()): Card {
    const card: Card = { id: this.nextId('card'), ownerId, characterId, createdAt };
    this.cards.set(card.id, card);
    return card;
  }

  cardsForOwner(ownerId: string): Card[] {
    return [...this.cards.values()].filter((card) => card.ownerId === ownerId);
  }

  /** How many more cards this owner needs before a custom game is generated. */
  cardsRemainingForCustomGame(ownerId: string): number {
    return Math.max(0, MAX_CARDS_FOR_CUSTOM_GAME - this.cardsForOwner(ownerId).length);
  }

  /**
   * Once an owner reaches 52 cards, auto-generates (and idempotently
   * returns) their custom game, listed in the marketplace under their name.
   */
  maybeGenerateCustomGame(ownerId: string, title: string, generatedAt: number = Date.now()): CustomGame | undefined {
    const existing = this.customGamesForOwner(ownerId)[0];
    if (existing) {
      return existing;
    }
    const ownedCards = this.cardsForOwner(ownerId);
    if (ownedCards.length < MAX_CARDS_FOR_CUSTOM_GAME) {
      return undefined;
    }
    const game: CustomGame = {
      id: this.nextId('game'),
      ownerId,
      title,
      cardIds: ownedCards.map((card) => card.id),
      createdAt: generatedAt,
      listedInMarketplace: true,
      hasOwnLogoPrint: false,
      physicalShippingRequested: false,
    };
    this.customGames.set(game.id, game);
    return game;
  }

  requestOwnLogoPrint(gameId: string): CustomGame {
    const game = this.getCustomGame(gameId);
    game.hasOwnLogoPrint = true;
    return game;
  }

  requestPhysicalShipping(gameId: string): CustomGame {
    const game = this.getCustomGame(gameId);
    game.physicalShippingRequested = true;
    return game;
  }

  getCard(cardId: string): Card {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new UnknownCardError(cardId);
    }
    return card;
  }

  getCustomGame(gameId: string): CustomGame {
    const game = this.customGames.get(gameId);
    if (!game) {
      throw new UnknownCustomGameError(gameId);
    }
    return game;
  }

  customGamesForOwner(ownerId: string): CustomGame[] {
    return [...this.customGames.values()].filter((game) => game.ownerId === ownerId);
  }
}
