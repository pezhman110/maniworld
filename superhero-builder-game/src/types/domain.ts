/**
 * Domain types for the Kids Superhero Builder.
 *
 * This is a standalone product for kids 6-9 who describe a character
 * (animal/object/person), watch AI turn it into a superhero, equip it with
 * tools and a home, and then trade/collect/print it in a marketplace. It
 * intentionally lives in its own top-level project
 * (`superhero-builder-game/`) with its own package.json/tsconfig/jest
 * config, so it never gets built, tested, or deployed together with the
 * unrelated maniworld CRM (`src/`) or the other kids' products
 * (`maniworld-city-game/`, `music-studio-game/`, `social-skills-game/`).
 *
 * NOTE ON SCOPE: real AI image generation, 3D-figurine rendering/printing,
 * physical card printing/shipping, and voice capture require external
 * services. This project models the registries, state machines and data
 * contracts around that pipeline (what was described, what state the
 * artwork/tool/habitat review is in, what a marketplace listing/purchase
 * looks like) — it does not itself generate images, print, ship, or record
 * audio/video.
 */

// ---------------------------------------------------------------------------
// Shared review-cycle types (used by character art, tools and habitats)
// ---------------------------------------------------------------------------

/** Generic AI-artwork review cycle shared by concept art, tools and habitats. */
export type ArtworkStatus = 'pending-generation' | 'generated' | 'needs-revision' | 'approved';

/** How the child provided input for a given step: typed text or a voice note. */
export type InputMode = 'text' | 'voice';

// ---------------------------------------------------------------------------
// Character concept (step 1): description -> AI image -> review -> type pick
// ---------------------------------------------------------------------------

export interface CharacterConcept {
  id: string;
  creatorId: string;
  /** The child's own description of an animal/object/person to turn into a hero. */
  description: string;
  inputMode: InputMode;
  /** Opaque reference to a voice note, when inputMode === 'voice'. */
  voiceNoteId?: string;
  status: ArtworkStatus;
  /** Opaque reference to the AI-generated artwork asset. */
  imageAssetRef?: string;
  /** History of "change this" requests the child made during revision. */
  revisionNotes: string[];
  /** The character-type option chosen once the concept art is approved. */
  chosenTypeOptionId?: string;
  createdAt: number;
  approvedAt?: number;
}

/** One of the 7-10 suggested character "types" offered after concept approval. */
export interface CharacterTypeOption {
  id: string;
  conceptId: string;
  label: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Character traits (step 2): gender + powers, capped roster size
// ---------------------------------------------------------------------------

export type CharacterGender = 'girl' | 'boy';

export interface CharacterPower {
  id: string;
  characterId: string;
  /** What the power looks/feels like, in the child's own words. */
  description: string;
  /** What the power actually does. */
  effect: string;
  /** When/how the power turns on (e.g. "at night", "when he claps twice"). */
  activationCondition: string;
}

export interface Character {
  id: string;
  conceptId: string;
  creatorId: string;
  typeOptionId: string;
  gender: CharacterGender;
  createdAt: number;
}

/** Configurable roster cap, shown at the top of the screen (default: 5). */
export interface RosterLimitConfig {
  maxCharactersPerCreator: number;
}

export const DEFAULT_ROSTER_LIMIT: RosterLimitConfig = { maxCharactersPerCreator: 5 };

// ---------------------------------------------------------------------------
// Tool builder (step 3): per-character gear, capped + diverse catalog
// ---------------------------------------------------------------------------

export type ToolCategory =
  | 'weapon'
  | 'vehicle'
  | 'gadget'
  | 'costume-accessory'
  | 'shield'
  | 'pet-companion'
  | 'communicator';

export interface ToolCatalogEntry {
  category: ToolCategory;
  label: string;
  description: string;
}

/** Whether the child accepted the AI-generated tool artwork as-is or asked for changes. */
export type ToolRevisionChoice = 'no-change' | 'with-change';

export interface CharacterTool {
  id: string;
  characterId: string;
  category: ToolCategory;
  description: string;
  status: ArtworkStatus;
  imageAssetRef?: string;
  revisionChoice?: ToolRevisionChoice;
  revisionNotes: string[];
  createdAt: number;
}

/** Configurable tier cap, shown at the top of the screen (default: 3 categories in tier 1). */
export interface ToolTierLimitConfig {
  maxToolCategoriesInTier1: number;
}

export const DEFAULT_TOOL_TIER_LIMIT: ToolTierLimitConfig = { maxToolCategoriesInTier1: 3 };

// ---------------------------------------------------------------------------
// Habitat (step 4): where the character lives
// ---------------------------------------------------------------------------

export interface CharacterHabitat {
  id: string;
  characterId: string;
  description: string;
  status: ArtworkStatus;
  imageAssetRef?: string;
  revisionNotes: string[];
  /** Answer to "do you want a home for this character?" */
  wantsHabitat?: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Marketplace (economy): listings, purchases, coins, 3D statues
// ---------------------------------------------------------------------------

export interface MarketplacePriceTiers {
  digitalPrice: number;
  printedCardWithLogoPrice: number;
  physicalShippingPrice: number;
  personalized3dStatuePrice: number;
}

export interface MarketplaceListing {
  id: string;
  characterId: string;
  creatorId: string;
  prices: MarketplacePriceTiers;
  listedAt: number;
  active: boolean;
}

export type PurchaseTier = 'digital' | 'printed-card-with-logo' | 'physical-shipping';

export interface MarketplacePurchase {
  id: string;
  listingId: string;
  buyerId: string;
  tier: PurchaseTier;
  wantsOwnName: boolean;
  coinsPaidToCreator: number;
  purchasedAt: number;
}

export interface Statue3DOrder {
  id: string;
  purchaseId: string;
  buyerId: string;
  characterId: string;
  buyerDisplayName: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Card collection: up to 52 cards per creator -> auto-generated custom game
// ---------------------------------------------------------------------------

export interface Card {
  id: string;
  ownerId: string;
  characterId: string;
  createdAt: number;
}

export const MAX_CARDS_FOR_CUSTOM_GAME = 52;

export interface CustomGame {
  id: string;
  ownerId: string;
  title: string;
  cardIds: string[];
  createdAt: number;
  listedInMarketplace: boolean;
  hasOwnLogoPrint: boolean;
  physicalShippingRequested: boolean;
}

// ---------------------------------------------------------------------------
// Voice input: recorded prompts for kids who can't type yet
// ---------------------------------------------------------------------------

export type VoiceNoteStage =
  | 'character-description'
  | 'revision-request'
  | 'power-description'
  | 'tool-description'
  | 'habitat-description';

export type VoiceNoteStatus = 'pending' | 'recorded' | 'approved';

export interface VoiceNote {
  id: string;
  ownerId: string;
  stage: VoiceNoteStage;
  status: VoiceNoteStatus;
  /** Opaque reference to the recorded audio asset (external media storage). */
  audioAssetRef?: string;
  recordedAt?: number;
  approvedAt?: number;
}

// ---------------------------------------------------------------------------
// Parental safety: consent + moderation before any marketplace/print action
// ---------------------------------------------------------------------------

export type ConsentStatus = 'pending' | 'granted' | 'declined';

export interface ParentalConsent {
  id: string;
  childOrCreatorId: string;
  parentContactId: string;
  status: ConsentStatus;
  requestedAt: number;
  decidedAt?: number;
}

export type ModerationDecision = 'approved' | 'rejected';

export type ModerationSubjectKind = 'marketplace-listing' | 'custom-game' | 'physical-print-order';

export interface ModerationReview {
  id: string;
  subjectKind: ModerationSubjectKind;
  subjectId: string;
  decision?: ModerationDecision;
  reviewedAt?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Creator dashboard: aggregated, embeddable view
// ---------------------------------------------------------------------------

export interface CreatorDashboardSummary {
  creatorId: string;
  generatedAt: number;
  characters: Character[];
  concepts: CharacterConcept[];
  tools: CharacterTool[];
  habitats: CharacterHabitat[];
  cardsCollected: number;
  customGames: CustomGame[];
  activeListings: MarketplaceListing[];
  /** True once the creator has an upgrade/subscription unlocking the 3D viewer. */
  has3dViewerAccess: boolean;
}
