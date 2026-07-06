import { CharacterConceptRegistry } from '../src/modules/characterConcept';
import { CharacterTraitsRegistry } from '../src/modules/characterTraits';
import { ToolBuilderRegistry } from '../src/modules/toolBuilder';
import { HabitatRegistry } from '../src/modules/habitat';
import { MarketplaceRegistry } from '../src/modules/marketplace';
import { CardCollectionRegistry } from '../src/modules/cardCollection';
import { CreatorDashboardService } from '../src/modules/creatorDashboard';
import { MarketplacePriceTiers } from '../src/types/domain';

const prices: MarketplacePriceTiers = {
  digitalPrice: 100,
  printedCardWithLogoPrice: 250,
  physicalShippingPrice: 400,
  personalized3dStatuePrice: 800,
};

function buildCharacter(concepts: CharacterConceptRegistry, traits: CharacterTraitsRegistry, creatorId: string) {
  const concept = concepts.describe(creatorId, 'A speedy silver fox');
  concepts.markGenerated(concept.id, 'asset://art-1');
  concepts.approve(concept.id);
  const options = concepts.offerTypeOptions(
    concept.id,
    Array.from({ length: 7 }, (_, i) => ({ label: `Type ${i}`, description: `Description ${i}` }))
  );
  concepts.chooseType(concept.id, options[0].id);
  return traits.create(concept.id, 'girl');
}

describe('CreatorDashboardService', () => {
  it('rolls up characters, tools, habitats, cards, custom games and active listings', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts);
    const tools = new ToolBuilderRegistry();
    const habitats = new HabitatRegistry();
    const marketplace = new MarketplaceRegistry();
    const cards = new CardCollectionRegistry();
    const dashboard = new CreatorDashboardService(concepts, traits, tools, habitats, marketplace, cards);

    const character = buildCharacter(concepts, traits, 'creator_1');

    const tool = tools.requestTool(character.id, 'weapon', 'a blaster');
    tools.markGenerated(tool.id, 'asset://tool-1');
    tools.reviewTool(tool.id, 'no-change');

    const habitat = habitats.describe(character.id, 'a cave');
    habitats.markGenerated(habitat.id, 'asset://habitat-1');
    habitats.approve(habitat.id);

    marketplace.list(character.id, 'creator_1', prices);
    cards.addCard('creator_1', character.id);

    const summary = dashboard.buildSummary('creator_1', false);

    expect(summary.characters).toHaveLength(1);
    expect(summary.tools).toHaveLength(1);
    expect(summary.habitats).toHaveLength(1);
    expect(summary.activeListings).toHaveLength(1);
    expect(summary.cardsCollected).toBe(1);
    expect(summary.customGames).toEqual([]);
    expect(summary.has3dViewerAccess).toBe(false);
  });

  it('excludes unlisted (inactive) listings from the active listings summary', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts);
    const tools = new ToolBuilderRegistry();
    const habitats = new HabitatRegistry();
    const marketplace = new MarketplaceRegistry();
    const cards = new CardCollectionRegistry();
    const dashboard = new CreatorDashboardService(concepts, traits, tools, habitats, marketplace, cards);

    const character = buildCharacter(concepts, traits, 'creator_1');
    const listing = marketplace.list(character.id, 'creator_1', prices);
    marketplace.unlist(listing.id);

    const summary = dashboard.buildSummary('creator_1', true);
    expect(summary.activeListings).toEqual([]);
    expect(summary.has3dViewerAccess).toBe(true);
  });
});
