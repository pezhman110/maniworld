import { CharacterConceptRegistry } from './characterConcept';
import { CharacterTraitsRegistry } from './characterTraits';
import { ToolBuilderRegistry } from './toolBuilder';
import { HabitatRegistry } from './habitat';
import { MarketplaceRegistry } from './marketplace';
import { CardCollectionRegistry } from './cardCollection';
import { PromoVideoRegistry } from './promoVideoStudio';
import { CreatorDashboardSummary } from '../types/domain';

/**
 * Creator dashboard module.
 *
 * Rolls up every part of a creator's work (characters, concepts, tools,
 * habitats, card collection, custom games, active marketplace listings,
 * promo videos) into a single summary object. Designed to be embedded in
 * the same dashboard app used by the other Mani World products (see
 * `public/dashboard` for the pattern of a tab per product) rather than as a
 * bespoke UI of its own. The 3D-viewer flag is a simple boolean the host
 * dashboard can use to decide whether to render the (external) 3D
 * viewer/rotation widget for this creator's characters and tools.
 */
export class CreatorDashboardService {
  constructor(
    private readonly concepts: CharacterConceptRegistry,
    private readonly traits: CharacterTraitsRegistry,
    private readonly tools: ToolBuilderRegistry,
    private readonly habitats: HabitatRegistry,
    private readonly marketplace: MarketplaceRegistry,
    private readonly cards: CardCollectionRegistry,
    private readonly promoVideos?: PromoVideoRegistry
  ) {}

  buildSummary(creatorId: string, has3dViewerAccess: boolean, generatedAt: number = Date.now()): CreatorDashboardSummary {
    const characters = this.traits.charactersForCreator(creatorId);
    const characterIds = new Set(characters.map((character) => character.id));

    const allTools = characters.flatMap((character) => this.tools.toolsFor(character.id));
    const allHabitats = characters.flatMap((character) => this.habitats.habitatsForCharacter(character.id));
    const allPromoVideos = this.promoVideos
      ? characters.flatMap((character) => this.promoVideos!.videosForCharacter(character.id))
      : [];

    return {
      creatorId,
      generatedAt,
      characters,
      concepts: this.concepts.conceptsForCreator(creatorId),
      tools: allTools,
      habitats: allHabitats,
      cardsCollected: this.cards.cardsForOwner(creatorId).length,
      customGames: this.cards.customGamesForOwner(creatorId),
      activeListings: this.marketplace
        .listingsForCreator(creatorId)
        .filter((listing) => listing.active && characterIds.has(listing.characterId)),
      promoVideos: allPromoVideos,
      has3dViewerAccess,
    };
  }
}
