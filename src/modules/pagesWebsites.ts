import { Locale } from '../types/domain';
import { InMemoryRepository, Repository } from './persistence';

export type PageLanguageMode =
  | 'en'
  | 'ar'
  | 'fa'
  | 'en-ar'
  | 'en-fa'
  | 'fa-ar'
  | 'en-ar-fa';

export type PageStatus = 'draft' | 'preview' | 'pending-approval' | 'published' | 'paused' | 'archived';
export type PageQualityStatus = 'ready' | 'ready-with-warnings' | 'blocked';
export type PageStartMode =
  | 'reference-website'
  | 'system-recommendation'
  | 'suggested-templates'
  | 'based-on-target'
  | 'copy-and-optimize'
  | 'quick-form-only';
export type PageImportKind = 'file' | 'voice';
export type PageImportStatus = 'uploaded' | 'parsed' | 'needs-review' | 'routed';

export const PAGE_TYPES = [
  'full-website',
  'one-page-landing-page',
  'target-landing-page',
  'campaign-landing-page',
  'recruitment-page',
  'freelancer-acquisition-page',
  'influencer-collaboration-page',
  'investor-page',
  'business-buyer-page',
  'business-seller-page',
  'salon-booking-page',
  'home-service-booking-page',
  'vip-beauty-experience-page',
  'event-page',
  'product-page',
  'project-showcase-page',
  'corporate-partnership-page',
  'academy-registration-page',
  'franchise-opportunity-page',
  'form-only-quick-capture-page',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PAGE_GOALS = [
  'get-leads',
  'get-bookings',
  'get-online-meetings',
  'get-in-person-meetings',
  'sell-products',
  'recruit-staff',
  'acquire-freelancers',
  'acquire-influencers',
  'attract-investors',
  'attract-partners',
  'attract-business-buyers',
  'attract-business-sellers',
  'request-valuation',
  'request-pitch-deck',
  'upload-documents',
  'register-for-academy',
  'promote-event',
  'introduce-project',
  'introduce-brand',
  'run-target-campaign',
] as const;
export type PageGoal = (typeof PAGE_GOALS)[number];

export const AUDIENCE_TYPES = [
  'salon-customer',
  'home-service-customer',
  'vip-beauty-customer',
  'bridal-customer',
  'investor',
  'business-buyer',
  'business-seller',
  'strategic-partner',
  'freelancer',
  'influencer',
  'job-applicant',
  'corporate-manager',
  'hotel-manager',
  'parent',
  'child-teen',
  'academy-student',
  'franchise-partner',
  'supplier-vendor',
] as const;
export type PageAudienceType = (typeof AUDIENCE_TYPES)[number];

export const FORM_DESTINATIONS = [
  'target-board',
  'customer-crm',
  'home-service-crm',
  'investor-crm',
  'buyer-crm',
  'seller-crm',
  'deal-room',
  'project-pipeline',
  'hr-pipeline',
  'freelancer-pipeline',
  'influencer-pipeline',
  'archive-bank',
  'excel-csv-export',
  'email-notification',
  'whatsapp-notification',
] as const;
export type FormDestination = (typeof FORM_DESTINATIONS)[number];

export type ReferrerType = 'customer' | 'influencer' | 'freelancer' | 'partner' | 'staff' | 'hotel' | 'corporate-partner';

export interface BrandKit {
  id: string;
  brandName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontStyle: string;
  toneOfVoice: string;
  defaultLanguages: Locale[];
  defaultLegalBlocks: string[];
  defaultCtaStyle: string;
  defaultPageStyle: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  pageType: PageType;
  goalType: PageGoal;
  audienceType: PageAudienceType;
  recommendedBlocks: string[];
  defaultFormFields: string[];
  defaultCTA: string;
  defaultRouting: FormDestination;
  defaultScoreRules: string[];
  defaultComplianceBlocks: string[];
}

export interface PageBlockDefinition {
  id: string;
  category: 'hero' | 'trust' | 'conversion' | 'business' | 'customer' | 'compliance';
  name: string;
}

export interface PageBlock {
  id: string;
  definitionId: string;
  locale?: Locale;
  content: Record<string, string>;
}

export interface PageFormField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'select' | 'date' | 'time' | 'number' | 'checkbox' | 'url' | 'file';
  options?: string[];
}

export interface SmartPageForm {
  fields: PageFormField[];
  destination: FormDestination;
  consentRequired: boolean;
  customFields: PageFormField[];
}

export interface PageBrief {
  startMode: PageStartMode;
  goal: PageGoal;
  targetAudience: PageAudienceType;
  pageType: PageType;
  brandKitId: string;
  logoPreference?: string;
  colorStyle: string;
  languageMode: PageLanguageMode;
  marketLocation?: string;
  inspirationUrls: string[];
  contentStrategy?: string;
  requiredBlocks: string[];
  requiredFormFields: string[];
  dataDestination: FormDestination;
  targetId?: string;
  projectId?: string;
  crmId?: string;
  pipelineId?: string;
  dealRoomId?: string;
  requiredActions: string[];
  requiredTools: string[];
  complianceRequirements: string[];
  analyticsRequirements: string[];
  postSubmitWorkflow: string[];
}

export interface PageSeoSettings {
  title?: string;
  metaDescription?: string;
  keywords?: string[];
  openGraphTitle?: string;
  openGraphDescription?: string;
  openGraphImage?: string;
  canonicalUrl?: string;
  schemaType?: string;
}

export interface PageQualityScore {
  score: number;
  status: PageQualityStatus;
  issues: string[];
  recommendations: string[];
}

export interface PageVariant {
  id: string;
  pageId: string;
  label: string;
  headline: string;
  isWinner: boolean;
  metrics: PageVariantMetrics;
}

export interface PageVariantMetrics {
  views: number;
  submissions: number;
  qualifiedLeads: number;
  bookings: number;
  meetings: number;
  conversionRate: number;
}

export interface PageAnalytics {
  views: number;
  uniqueVisitors: number;
  formStarts: number;
  submissions: number;
  qualifiedLeads: number;
  bookings: number;
  meetingsConfirmed: number;
  archivedLeads: number;
  conversionRate: number;
  costPerLead?: number;
  costPerBooking?: number;
  bestSource?: string;
  bestLanguage?: Locale;
  bestCTA?: string;
  bestVariant?: string;
}

export interface PageVersion {
  versionNumber: number;
  changedBy: string;
  changedAt: number;
  whatChanged: string;
  status: PageStatus;
  snapshot: Omit<Page, 'versions'>;
}

export interface PageApprovalRequest {
  id: string;
  pageId: string;
  requiredApprovers: string[];
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  decidedBy?: string;
  decidedAt?: number;
  note?: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  brief: PageBrief;
  blocks: PageBlock[];
  form: SmartPageForm;
  seo: PageSeoSettings;
  status: PageStatus;
  qualityScore: PageQualityScore;
  analytics: PageAnalytics;
  variants: PageVariant[];
  versions: PageVersion[];
  createdAt: number;
  updatedAt: number;
}

export interface PageSubmission {
  id: string;
  pageId: string;
  slug: string;
  variantId?: string;
  language?: Locale;
  values: Record<string, unknown>;
  utm: Record<string, string>;
  referralCode?: string;
  score: number;
  routedTo: FormDestination;
  lifecycle: Array<'view' | 'form-start' | 'submission' | 'score' | 'qualified' | 'archived' | 'contacted' | 'booked' | 'meeting-confirmed' | 'achieved'>;
  workflowLog: string[];
  createdAt: number;
}

export interface ReferralLink {
  id: string;
  pageId: string;
  referrerType: ReferrerType;
  referrerId: string;
  referralCode: string;
  clicks: number;
  submissions: number;
  qualifiedLeads: number;
  bookings: number;
  rewardStatus: 'pending' | 'earned' | 'paid' | 'cancelled';
}

export interface PageImportRecord {
  id: string;
  pageId?: string;
  kind: PageImportKind;
  fileName: string;
  language?: Locale;
  status: PageImportStatus;
  extractedLead?: Record<string, unknown>;
  intent?: string;
  routedTo?: FormDestination;
  createdAt: number;
}

export interface PageExecutionLog {
  id: string;
  pageId: string;
  type: string;
  message: string;
  createdAt: number;
}

const COMMON_FIELDS: PageFormField[] = [
  { key: 'name', label: 'Name', required: true, type: 'text' },
  { key: 'phone', label: 'Phone', required: true, type: 'phone' },
  { key: 'whatsapp', label: 'WhatsApp', required: false, type: 'phone' },
  { key: 'email', label: 'Email', required: false, type: 'email' },
  { key: 'city', label: 'City', required: false, type: 'text' },
  { key: 'area', label: 'Area', required: false, type: 'text' },
  { key: 'preferredLanguage', label: 'Preferred language', required: false, type: 'select', options: ['en', 'ar', 'fa'] },
  { key: 'preferredContactMethod', label: 'Preferred contact method', required: false, type: 'select', options: ['phone', 'whatsapp', 'email'] },
  { key: 'consent', label: 'Consent', required: true, type: 'checkbox' },
];

const SPECIFIC_FIELDS: Partial<Record<PageType, PageFormField[]>> = {
  'salon-booking-page': [
    { key: 'serviceInterest', label: 'Service interest', required: true, type: 'text' },
    { key: 'preferredBranch', label: 'Preferred branch', required: false, type: 'text' },
    { key: 'preferredDate', label: 'Preferred date', required: false, type: 'date' },
    { key: 'preferredTime', label: 'Preferred time', required: false, type: 'time' },
    { key: 'budgetRange', label: 'Budget range', required: false, type: 'text' },
    { key: 'customerType', label: 'New or returning customer', required: false, type: 'select', options: ['new', 'returning'] },
    { key: 'offerCode', label: 'Offer code', required: false, type: 'text' },
    { key: 'referralCode', label: 'Referral code', required: false, type: 'text' },
  ],
  'home-service-booking-page': [
    { key: 'serviceType', label: 'Service type', required: true, type: 'text' },
    { key: 'fullAddress', label: 'Full address', required: true, type: 'text' },
    { key: 'preferredDate', label: 'Preferred date', required: false, type: 'date' },
    { key: 'preferredTime', label: 'Preferred time', required: false, type: 'time' },
    { key: 'numberOfPeople', label: 'Number of people', required: false, type: 'number' },
    { key: 'specialNotes', label: 'Special notes', required: false, type: 'text' },
    { key: 'paymentPreference', label: 'Payment preference', required: false, type: 'text' },
  ],
  'investor-page': [
    { key: 'investorType', label: 'Investor type', required: true, type: 'text' },
    { key: 'ticketSize', label: 'Ticket size', required: true, type: 'text' },
    { key: 'sectorInterest', label: 'Sector interest', required: false, type: 'text' },
    { key: 'country', label: 'Country', required: false, type: 'text' },
    { key: 'meetingType', label: 'Meeting type', required: false, type: 'select', options: ['online', 'in-person'] },
    { key: 'pitchDeckRequest', label: 'Pitch deck request', required: false, type: 'checkbox' },
    { key: 'ndaRequired', label: 'NDA required', required: false, type: 'checkbox' },
  ],
  'business-buyer-page': [
    { key: 'budget', label: 'Budget', required: true, type: 'text' },
    { key: 'preferredIndustry', label: 'Preferred industry', required: false, type: 'text' },
    { key: 'managementMode', label: 'Managed by buyer or Globex', required: false, type: 'text' },
    { key: 'timeline', label: 'Timeline', required: false, type: 'text' },
    { key: 'financingNeeded', label: 'Financing needed', required: false, type: 'checkbox' },
    { key: 'preferredCity', label: 'Preferred city', required: false, type: 'text' },
  ],
  'business-seller-page': [
    { key: 'businessType', label: 'Business type', required: true, type: 'text' },
    { key: 'revenueRange', label: 'Revenue range', required: false, type: 'text' },
    { key: 'profitRange', label: 'Profit range', required: false, type: 'text' },
    { key: 'askingPrice', label: 'Asking price', required: false, type: 'text' },
    { key: 'reasonForSale', label: 'Reason for sale', required: false, type: 'text' },
    { key: 'documentsAvailable', label: 'Documents available', required: false, type: 'checkbox' },
    { key: 'uploadFiles', label: 'Upload files', required: false, type: 'file' },
  ],
  'recruitment-page': [
    { key: 'role', label: 'Role', required: true, type: 'text' },
    { key: 'experience', label: 'Experience', required: false, type: 'text' },
    { key: 'portfolioLink', label: 'Portfolio link', required: false, type: 'url' },
    { key: 'cvUpload', label: 'CV upload', required: false, type: 'file' },
    { key: 'availability', label: 'Availability', required: false, type: 'text' },
    { key: 'expectedSalary', label: 'Expected salary', required: false, type: 'text' },
    { key: 'location', label: 'Location', required: false, type: 'text' },
  ],
};

const DEFAULT_ANALYTICS: PageAnalytics = {
  views: 0,
  uniqueVisitors: 0,
  formStarts: 0,
  submissions: 0,
  qualifiedLeads: 0,
  bookings: 0,
  meetingsConfirmed: 0,
  archivedLeads: 0,
  conversionRate: 0,
};

const BLOCKS: PageBlockDefinition[] = [
  ...['Luxury Beauty Hero', 'Investor Hero', 'Business Buyer Hero', 'Business Seller Hero', 'Recruitment Hero', 'Home Service Hero', 'Kids / ManiWorld Hero', 'Corporate Hero', 'Minimal SaaS Hero', 'Video Hero'].map((name) => ({ id: slugify(name), category: 'hero' as const, name })),
  ...['Reviews', 'Testimonials', 'Licenses', 'Certifications', 'Partner Logos', 'Case Studies', 'Before / After', 'Numbers / Stats', 'Media Mentions', 'Team Credentials'].map((name) => ({ id: slugify(name), category: 'trust' as const, name })),
  ...['Lead Form', 'Booking Form', 'Meeting Scheduler', 'WhatsApp CTA', 'Call Button', 'Upload Documents', 'Download Pitch Deck', 'Calculator', 'Quiz', 'Assessment', 'Quote Request'].map((name) => ({ id: slugify(name), category: 'conversion' as const, name })),
  ...['Revenue Model', 'Investment Highlights', 'Business Categories', 'Valuation Snapshot', 'Buyer Journey', 'Seller Journey', 'Deal Process', 'Due D Diligence Steps', 'Risk Notes', 'Use of Funds'].map((name) => ({ id: slugify(name), category: 'business' as const, name })),
  ...['Services', 'Packages', 'Price Table', 'Service Areas', 'Gallery', 'Team', 'Location Map', 'FAQ', 'Offers', 'Loyalty / Referral'].map((name) => ({ id: slugify(name), category: 'customer' as const, name })),
  ...['License', 'Terms', 'Privacy', 'Consent', 'Marketing Permission', 'Disclaimer', 'Data Retention Notice', 'NDA Notice', 'Investment Risk Disclaimer'].map((name) => ({ id: slugify(name), category: 'compliance' as const, name })),
];

const DEFAULT_BRAND_KITS: BrandKit[] = [
  makeBrandKit('globex-horizon', 'Globex Horizon', 'Luxury black / gold', ['en', 'ar']),
  makeBrandKit('elaris', 'ELARIS', 'Corporate blue', ['en', 'ar']),
  makeBrandKit('maniworld', 'ManiWorld', 'Kids colorful', ['en', 'fa', 'ar']),
  makeBrandKit('custom-brand', 'Custom brand', 'Custom', ['en']),
  makeBrandKit('client-brand', 'Client brand', 'Custom', ['en']),
];

const DEFAULT_TEMPLATES: PageTemplate[] = [
  makeTemplate('salon-booking', 'Salon Booking Page', 'salon-booking-page', 'get-bookings', 'salon-customer', 'customer-crm', ['luxury-beauty-hero', 'services', 'booking-form', 'privacy']),
  makeTemplate('home-service-booking', 'Home Service Booking Page', 'home-service-booking-page', 'get-bookings', 'home-service-customer', 'home-service-crm', ['home-service-hero', 'service-areas', 'booking-form', 'privacy']),
  makeTemplate('investor-pitch', 'Investor Pitch Page', 'investor-page', 'attract-investors', 'investor', 'investor-crm', ['investor-hero', 'investment-highlights', 'download-pitch-deck', 'investment-risk-disclaimer']),
  makeTemplate('business-buyer', 'Business Buyer Page', 'business-buyer-page', 'attract-business-buyers', 'business-buyer', 'buyer-crm', ['business-buyer-hero', 'buyer-journey', 'lead-form', 'privacy']),
  makeTemplate('business-seller', 'Business Seller Page', 'business-seller-page', 'attract-business-sellers', 'business-seller', 'seller-crm', ['business-seller-hero', 'seller-journey', 'upload-documents', 'privacy']),
  makeTemplate('recruitment', 'Recruitment Page', 'recruitment-page', 'recruit-staff', 'job-applicant', 'hr-pipeline', ['recruitment-hero', 'team-credentials', 'lead-form', 'privacy']),
  makeTemplate('freelancer-acquisition', 'Freelancer Acquisition Page', 'freelancer-acquisition-page', 'acquire-freelancers', 'freelancer', 'freelancer-pipeline', ['recruitment-hero', 'services', 'lead-form', 'terms']),
  makeTemplate('influencer-collaboration', 'Influencer Collaboration Page', 'influencer-collaboration-page', 'acquire-influencers', 'influencer', 'influencer-pipeline', ['corporate-hero', 'partner-logos', 'lead-form', 'marketing-permission']),
  makeTemplate('project-showcase', 'Project Showcase Page', 'project-showcase-page', 'introduce-project', 'strategic-partner', 'project-pipeline', ['corporate-hero', 'case-studies', 'lead-form', 'privacy']),
  makeTemplate('corporate-partnership', 'Corporate Partnership Page', 'corporate-partnership-page', 'attract-partners', 'corporate-manager', 'project-pipeline', ['corporate-hero', 'partner-logos', 'meeting-scheduler', 'privacy']),
  makeTemplate('academy-registration', 'Academy Registration Page', 'academy-registration-page', 'register-for-academy', 'academy-student', 'customer-crm', ['minimal-saas-hero', 'services', 'lead-form', 'consent']),
  makeTemplate('vip-beauty-experience', 'VIP Beauty Experience Page', 'vip-beauty-experience-page', 'get-bookings', 'vip-beauty-customer', 'customer-crm', ['luxury-beauty-hero', 'packages', 'booking-form', 'privacy']),
  makeTemplate('franchise-opportunity', 'Franchise Opportunity Page', 'franchise-opportunity-page', 'attract-partners', 'franchise-partner', 'deal-room', ['corporate-hero', 'revenue-model', 'lead-form', 'nda-notice']),
  makeTemplate('event-landing', 'Event Landing Page', 'event-page', 'promote-event', 'strategic-partner', 'customer-crm', ['video-hero', 'offers', 'lead-form', 'terms']),
  makeTemplate('quick-capture', 'Form-only Quick Capture Page', 'form-only-quick-capture-page', 'get-leads', 'supplier-vendor', 'archive-bank', ['lead-form', 'privacy']),
];

function makeBrandKit(id: string, brandName: string, style: string, defaultLanguages: Locale[]): BrandKit {
  return {
    id,
    brandName,
    primaryColor: style.includes('black') ? '#070707' : '#12376b',
    secondaryColor: style.includes('gold') ? '#c8a64b' : '#ffffff',
    accentColor: '#d6b76a',
    fontStyle: 'modern',
    toneOfVoice: 'clear, premium and business-focused',
    defaultLanguages,
    defaultLegalBlocks: ['privacy', 'terms', 'consent'],
    defaultCtaStyle: 'primary button',
    defaultPageStyle: style,
  };
}

function makeTemplate(
  id: string,
  name: string,
  pageType: PageType,
  goalType: PageGoal,
  audienceType: PageAudienceType,
  defaultRouting: FormDestination,
  recommendedBlocks: string[]
): PageTemplate {
  return {
    id,
    name,
    pageType,
    goalType,
    audienceType,
    recommendedBlocks,
    defaultFormFields: buildFormFields(pageType).map((field) => field.key),
    defaultCTA: goalType.includes('booking') ? 'Book now' : 'Submit',
    defaultRouting,
    defaultScoreRules: ['required-contact-info', 'audience-fit', 'budget-or-intent', 'consent'],
    defaultComplianceBlocks: recommendedBlocks.filter((block) => ['privacy', 'terms', 'consent', 'nda-notice', 'investment-risk-disclaimer'].includes(block)),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value;
}

function assertInList<T extends string>(value: T, list: readonly T[], field: string): void {
  if (!list.includes(value)) throw new Error(`"${field}" must be one of ${list.join(', ')}.`);
}

function localesForMode(mode: PageLanguageMode): Locale[] {
  if (mode === 'en-ar-fa') return ['en', 'ar', 'fa'];
  return mode.split('-') as Locale[];
}

function buildFormFields(pageType: PageType, required: string[] = []): PageFormField[] {
  const fields = [...COMMON_FIELDS, ...(SPECIFIC_FIELDS[pageType] ?? [])];
  const seen = new Set<string>();
  const merged = fields.filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
  required.forEach((key) => {
    if (!seen.has(key)) merged.push({ key, label: key, required: false, type: 'text' });
  });
  return merged;
}

function emptyQuality(): PageQualityScore {
  return { score: 0, status: 'blocked', issues: ['Quality score has not been calculated.'], recommendations: [] };
}

function clonePageSnapshot(page: Page): Omit<Page, 'versions'> {
  const { versions: _versions, ...snapshot } = page;
  return JSON.parse(JSON.stringify(snapshot));
}

function approvalRules(pageType: PageType): string[] {
  if (pageType === 'investor-page') return ['CEO', 'Legal'];
  if (pageType === 'business-seller-page') return ['Legal'];
  if (pageType === 'recruitment-page' || pageType === 'freelancer-acquisition-page') return ['HR'];
  if (pageType.includes('kids')) return ['Safety / Compliance'];
  return ['Marketing'];
}

function scoreSubmission(values: Record<string, unknown>): number {
  let score = 30;
  ['phone', 'whatsapp', 'email'].forEach((field) => {
    if (values[field]) score += 15;
  });
  ['budget', 'ticketSize', 'preferredDate', 'serviceInterest', 'businessType', 'role'].forEach((field) => {
    if (values[field]) score += 10;
  });
  if (values.consent === true || values.consent === 'true' || values.consent === 'on') score += 10;
  return Math.min(100, score);
}

function defaultWorkflow(pageType: PageType): string[] {
  if (pageType === 'salon-booking-page') return ['score-customer', 'create-booking-task', 'send-whatsapp', 'add-to-target-progress'];
  if (pageType === 'home-service-booking-page') return ['validate-service-area', 'score-customer', 'create-home-service-request', 'notify-operations'];
  if (pageType === 'investor-page') return ['score-investor', 'create-investor-crm-record', 'offer-meeting-booking', 'attach-pitch-deck-workflow'];
  if (pageType === 'business-buyer-page') return ['score-buyer', 'match-business-categories', 'create-buyer-profile', 'book-online-meeting'];
  if (pageType === 'business-seller-page') return ['score-seller-readiness', 'request-documents', 'create-seller-profile', 'send-to-valuation-workflow'];
  if (pageType === 'recruitment-page') return ['parse-cv-file', 'score-applicant', 'send-to-hr-or-project-pipeline'];
  return ['show-thank-you', 'create-lead', 'score-lead', 'route-lead', 'notify-team'];
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export class PagesWebsitesRegistry {
  constructor(
    private pages: Repository<Page> = new InMemoryRepository(),
    private submissions: Repository<PageSubmission> = new InMemoryRepository(),
    private referrals: Repository<ReferralLink> = new InMemoryRepository(),
    private imports: Repository<PageImportRecord> = new InMemoryRepository(),
    private approvals: Repository<PageApprovalRequest> = new InMemoryRepository(),
    private logs: Repository<PageExecutionLog> = new InMemoryRepository()
  ) {}

  listOptions() {
    return {
      pageTypes: PAGE_TYPES,
      pageGoals: PAGE_GOALS,
      audienceTypes: AUDIENCE_TYPES,
      formDestinations: FORM_DESTINATIONS,
      languageModes: ['en', 'ar', 'fa', 'en-ar', 'en-fa', 'fa-ar', 'en-ar-fa'],
      startModes: ['reference-website', 'system-recommendation', 'suggested-templates', 'based-on-target', 'copy-and-optimize', 'quick-form-only'],
    };
  }

  listBrandKits(): BrandKit[] {
    return DEFAULT_BRAND_KITS;
  }

  listTemplates(): PageTemplate[] {
    return DEFAULT_TEMPLATES;
  }

  listBlocks(): PageBlockDefinition[] {
    return BLOCKS;
  }

  private async assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const all = await this.pages.list();
    if (all.some((page) => page.slug === slug && page.id !== excludeId)) {
      throw new Error(`A page with slug "${slug}" already exists.`);
    }
  }

  async createPage(params: {
    id: string;
    slug: string;
    title: string;
    brief: PageBrief;
    templateId?: string;
    seo?: PageSeoSettings;
    blocks?: PageBlock[];
    now?: number;
  }): Promise<Page> {
    requireNonEmpty(params.id, 'id');
    requireNonEmpty(params.slug, 'slug');
    requireNonEmpty(params.title, 'title');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(params.slug)) throw new Error('"slug" must be lowercase letters/numbers/hyphens only.');
    if (await this.pages.getById(params.id)) throw new Error(`A page with id "${params.id}" already exists.`);
    await this.assertSlugAvailable(params.slug);
    this.validateBrief(params.brief);
    const template = params.templateId ? DEFAULT_TEMPLATES.find((item) => item.id === params.templateId) : undefined;
    const requiredBlocks = params.brief.requiredBlocks.length ? params.brief.requiredBlocks : template?.recommendedBlocks ?? [];
    const page: Page = {
      id: params.id,
      slug: params.slug,
      title: params.title,
      brief: { ...params.brief, postSubmitWorkflow: params.brief.postSubmitWorkflow.length ? params.brief.postSubmitWorkflow : defaultWorkflow(params.brief.pageType) },
      blocks:
        params.blocks ??
        requiredBlocks.map((definitionId, index) => ({
          id: `${params.id}-block-${index + 1}`,
          definitionId,
          content: { title: definitionId.replace(/-/g, ' '), body: '' },
        })),
      form: {
        fields: buildFormFields(params.brief.pageType, params.brief.requiredFormFields),
        destination: params.brief.dataDestination,
        consentRequired: true,
        customFields: [],
      },
      seo: params.seo ?? {},
      status: 'draft',
      qualityScore: emptyQuality(),
      analytics: { ...DEFAULT_ANALYTICS },
      variants: [],
      versions: [],
      createdAt: params.now ?? Date.now(),
      updatedAt: params.now ?? Date.now(),
    };
    page.versions = [this.makeVersion(page, 'system', 'initial page brief created')];
    await this.pages.save(page.id, page);
    return page;
  }

  private validateBrief(brief: PageBrief): void {
    assertInList(brief.pageType, PAGE_TYPES, 'pageType');
    assertInList(brief.goal, PAGE_GOALS, 'goal');
    assertInList(brief.targetAudience, AUDIENCE_TYPES, 'targetAudience');
    assertInList(brief.dataDestination, FORM_DESTINATIONS, 'dataDestination');
    if (!DEFAULT_BRAND_KITS.some((brand) => brand.id === brief.brandKitId)) throw new Error('A valid brandKitId is required.');
    if (localesForMode(brief.languageMode).length === 0) throw new Error('At least one language is required.');
  }

  private makeVersion(page: Page, changedBy: string, whatChanged: string): PageVersion {
    return {
      versionNumber: page.versions.length + 1,
      changedBy,
      changedAt: Date.now(),
      whatChanged,
      status: page.status,
      snapshot: clonePageSnapshot(page),
    };
  }

  async updatePage(id: string, patch: Partial<Pick<Page, 'title' | 'brief' | 'blocks' | 'seo'>>, changedBy = 'system'): Promise<Page> {
    const existing = await this.getRequiredPage(id);
    const updated: Page = { ...existing, ...patch, updatedAt: Date.now() };
    if (patch.brief) this.validateBrief(patch.brief);
    updated.versions = [...existing.versions, this.makeVersion(updated, changedBy, 'page updated')];
    await this.pages.save(id, updated);
    return updated;
  }

  async calculateQualityScore(id: string): Promise<PageQualityScore> {
    const page = await this.getRequiredPage(id);
    const issues: string[] = [];
    const recommendations: string[] = [];
    const checks: Array<[boolean, string, string]> = [
      [Boolean(page.brief.goal), 'Goal is not defined.', 'Define the page goal.'],
      [Boolean(page.brief.targetAudience), 'Audience is not defined.', 'Select the target audience.'],
      [page.blocks.some((block) => block.content.title || block.content.body), 'Offer content is not clear.', 'Add clear offer copy.'],
      [page.blocks.length > 0, 'No CTA/block exists.', 'Add conversion blocks and CTA.'],
      [page.form.fields.length > 0, 'Form does not exist.', 'Add a smart form.'],
      [Boolean(page.form.destination), 'Form destination is not connected.', 'Select a routing destination.'],
      [localesForMode(page.brief.languageMode).every((locale) => locale === 'en' || page.blocks.some((block) => block.locale === locale)), 'Required languages are incomplete.', 'Complete translated blocks for all selected languages.'],
      [Boolean(page.seo.title && page.seo.metaDescription), 'SEO title and meta description are missing.', 'Add SEO metadata.'],
      [page.brief.analyticsRequirements.length > 0, 'Tracking is not enabled.', 'Select analytics requirements.'],
      [page.brief.complianceRequirements.length > 0 || page.blocks.some((block) => block.definitionId.includes('privacy') || block.definitionId.includes('consent')), 'Consent and legal blocks are missing.', 'Add privacy/consent/legal blocks.'],
      [Boolean(page.brief.targetId || page.brief.projectId || page.brief.crmId || page.brief.pipelineId || page.brief.dealRoomId), 'No target/project/CRM/pipeline/deal-room connection exists.', 'Connect this page to execution.'],
      [true, 'Mobile responsive layout has not been confirmed.', 'Use the responsive dashboard/public renderer.'],
      [Boolean(page.brief.brandKitId), 'Brand kit is not selected.', 'Select a brand kit.'],
      [page.brief.analyticsRequirements.length > 0, 'Analytics are not enabled.', 'Enable analytics.'],
    ];
    checks.forEach(([passed, issue, recommendation]) => {
      if (!passed) {
        issues.push(issue);
        recommendations.push(recommendation);
      }
    });
    const score = Math.round(((checks.length - issues.length) / checks.length) * 100);
    const quality: PageQualityScore = { score, status: score >= 80 ? (issues.length ? 'ready-with-warnings' : 'ready') : 'blocked', issues, recommendations };
    page.qualityScore = quality;
    page.updatedAt = Date.now();
    await this.pages.save(id, page);
    return quality;
  }

  async requestApproval(pageId: string, requestedBy = 'system'): Promise<PageApprovalRequest> {
    const page = await this.getRequiredPage(pageId);
    page.status = 'pending-approval';
    page.versions = [...page.versions, this.makeVersion(page, requestedBy, 'approval requested')];
    await this.pages.save(pageId, page);
    const request: PageApprovalRequest = {
      id: nextId('approval'),
      pageId,
      requiredApprovers: approvalRules(page.brief.pageType),
      status: 'pending',
      requestedAt: Date.now(),
    };
    await this.approvals.save(request.id, request);
    return request;
  }

  async decideApproval(requestId: string, decision: 'approved' | 'rejected', decidedBy: string, note?: string): Promise<PageApprovalRequest> {
    requireNonEmpty(decidedBy, 'decidedBy');
    const request = await this.approvals.getById(requestId);
    if (!request) throw new Error(`Approval request "${requestId}" not found.`);
    const updated = { ...request, status: decision, decidedBy, decidedAt: Date.now(), note };
    await this.approvals.save(requestId, updated);
    if (decision === 'rejected') {
      const page = await this.getRequiredPage(request.pageId);
      page.status = 'draft';
      await this.pages.save(page.id, page);
    }
    return updated;
  }

  async publish(pageId: string, actor = 'system'): Promise<Page> {
    const page = await this.getRequiredPage(pageId);
    const quality = await this.calculateQualityScore(pageId);
    if (quality.score < 70) throw new Error('Page quality score is too low to publish.');
    const approvals = await this.approvals.list();
    const hasApproval = approvals.some((item) => item.pageId === pageId && item.status === 'approved');
    if (!hasApproval) throw new Error('An approved approval request is required before publishing.');
    const refreshed = await this.getRequiredPage(pageId);
    refreshed.status = 'published';
    refreshed.versions = [...refreshed.versions, this.makeVersion(refreshed, actor, 'page published')];
    await this.pages.save(pageId, refreshed);
    return refreshed;
  }

  async setStatus(pageId: string, status: Extract<PageStatus, 'preview' | 'paused' | 'archived'>, actor = 'system'): Promise<Page> {
    const page = await this.getRequiredPage(pageId);
    page.status = status;
    page.versions = [...page.versions, this.makeVersion(page, actor, `status set to ${status}`)];
    await this.pages.save(pageId, page);
    return page;
  }

  async addVariant(pageId: string, label: string, headline: string): Promise<PageVariant> {
    requireNonEmpty(label, 'label');
    requireNonEmpty(headline, 'headline');
    const page = await this.getRequiredPage(pageId);
    const variant: PageVariant = {
      id: nextId('variant'),
      pageId,
      label,
      headline,
      isWinner: false,
      metrics: { views: 0, submissions: 0, qualifiedLeads: 0, bookings: 0, meetings: 0, conversionRate: 0 },
    };
    page.variants = [...page.variants, variant];
    page.versions = [...page.versions, this.makeVersion(page, 'system', 'variant added')];
    await this.pages.save(pageId, page);
    return variant;
  }

  async markWinningVariant(pageId: string, variantId: string): Promise<PageVariant> {
    const page = await this.getRequiredPage(pageId);
    const variant = page.variants.find((item) => item.id === variantId);
    if (!variant) throw new Error(`Variant "${variantId}" not found.`);
    page.variants = page.variants.map((item) => ({ ...item, isWinner: item.id === variantId }));
    page.analytics.bestVariant = variantId;
    await this.pages.save(pageId, page);
    return { ...variant, isWinner: true };
  }

  async createReferralLink(params: { pageId: string; referrerType: ReferrerType; referrerId: string; referralCode: string }): Promise<ReferralLink> {
    await this.getRequiredPage(params.pageId);
    requireNonEmpty(params.referrerId, 'referrerId');
    requireNonEmpty(params.referralCode, 'referralCode');
    const link: ReferralLink = { id: nextId('referral'), pageId: params.pageId, referrerType: params.referrerType, referrerId: params.referrerId, referralCode: params.referralCode, clicks: 0, submissions: 0, qualifiedLeads: 0, bookings: 0, rewardStatus: 'pending' };
    await this.referrals.save(link.id, link);
    return link;
  }

  async recordImport(params: { pageId?: string; kind: PageImportKind; fileName: string; language?: Locale; extractedLead?: Record<string, unknown>; intent?: string; routedTo?: FormDestination }): Promise<PageImportRecord> {
    if (params.pageId) await this.getRequiredPage(params.pageId);
    requireNonEmpty(params.fileName, 'fileName');
    const record: PageImportRecord = { id: nextId('import'), pageId: params.pageId, kind: params.kind, fileName: params.fileName, language: params.language, status: params.extractedLead ? 'parsed' : 'uploaded', extractedLead: params.extractedLead, intent: params.intent, routedTo: params.routedTo, createdAt: Date.now() };
    await this.imports.save(record.id, record);
    return record;
  }

  async trackView(slug: string, params: { visitorId?: string; variantId?: string; source?: string; language?: Locale; referralCode?: string } = {}): Promise<Page> {
    const page = await this.getPublishedBySlug(slug);
    page.analytics.views += 1;
    if (params.visitorId) page.analytics.uniqueVisitors += 1;
    if (params.source) page.analytics.bestSource = params.source;
    if (params.language) page.analytics.bestLanguage = params.language;
    page.variants = page.variants.map((variant) => variant.id === params.variantId ? { ...variant, metrics: { ...variant.metrics, views: variant.metrics.views + 1 } } : variant);
    if (params.referralCode) await this.recordReferralClick(params.referralCode);
    await this.pages.save(page.id, page);
    return page;
  }

  async trackFormStart(slug: string): Promise<Page> {
    const page = await this.getPublishedBySlug(slug);
    page.analytics.formStarts += 1;
    await this.pages.save(page.id, page);
    return page;
  }

  async submit(slug: string, params: { values: Record<string, unknown>; utm?: Record<string, string>; referralCode?: string; variantId?: string; language?: Locale }): Promise<PageSubmission> {
    const page = await this.getPublishedBySlug(slug);
    const score = scoreSubmission(params.values);
    const lifecycle: PageSubmission['lifecycle'] = ['view', 'form-start', 'submission', 'score'];
    if (score >= 70) lifecycle.push('qualified');
    const submission: PageSubmission = { id: nextId('submission'), pageId: page.id, slug, variantId: params.variantId, language: params.language, values: params.values, utm: params.utm ?? {}, referralCode: params.referralCode, score, routedTo: page.form.destination, lifecycle, workflowLog: page.brief.postSubmitWorkflow, createdAt: Date.now() };
    await this.submissions.save(submission.id, submission);
    page.analytics.submissions += 1;
    page.analytics.qualifiedLeads += score >= 70 ? 1 : 0;
    page.analytics.conversionRate = page.analytics.views === 0 ? 0 : page.analytics.submissions / page.analytics.views;
    page.variants = page.variants.map((variant) => {
      if (variant.id !== params.variantId) return variant;
      const metrics = { ...variant.metrics, submissions: variant.metrics.submissions + 1, qualifiedLeads: variant.metrics.qualifiedLeads + (score >= 70 ? 1 : 0) };
      metrics.conversionRate = metrics.views === 0 ? 0 : metrics.submissions / metrics.views;
      return { ...variant, metrics };
    });
    if (params.referralCode) await this.recordReferralSubmission(params.referralCode, score >= 70);
    await this.pages.save(page.id, page);
    await this.logs.save(nextId('log'), { id: nextId('log'), pageId: page.id, type: 'submission-routed', message: `Submission routed to ${page.form.destination}`, createdAt: Date.now() });
    return submission;
  }

  private async recordReferralClick(referralCode: string): Promise<void> {
    const links = await this.referrals.list();
    const link = links.find((item) => item.referralCode === referralCode);
    if (!link) return;
    await this.referrals.save(link.id, { ...link, clicks: link.clicks + 1 });
  }

  private async recordReferralSubmission(referralCode: string, qualified: boolean): Promise<void> {
    const links = await this.referrals.list();
    const link = links.find((item) => item.referralCode === referralCode);
    if (!link) return;
    await this.referrals.save(link.id, { ...link, submissions: link.submissions + 1, qualifiedLeads: link.qualifiedLeads + (qualified ? 1 : 0), rewardStatus: qualified ? 'earned' : link.rewardStatus });
  }

  async renderPublicPage(slug: string, language: Locale = 'en'): Promise<string> {
    const page = await this.getPublishedBySlug(slug);
    const dir = language === 'fa' || language === 'ar' ? 'rtl' : 'ltr';
    const title = escapeHtml(page.title);
    const fields = page.form.fields
      .map((field) => `<label>${escapeHtml(field.label)}${field.required ? ' *' : ''}<input name="${escapeHtml(field.key)}" type="${field.type === 'checkbox' ? 'checkbox' : 'text'}" ${field.required ? 'required' : ''}></label>`)
      .join('');
    const blocks = page.blocks.map((block) => `<section><h2>${escapeHtml(block.content.title || block.definitionId)}</h2><p>${escapeHtml(block.content.body || '')}</p></section>`).join('');
    return `<!doctype html><html lang="${language}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.seo.title || page.title)}</title><meta name="description" content="${escapeHtml(page.seo.metaDescription || '')}"></head><body><main><h1>${title}</h1>${blocks}<form method="post" action="/public/page/${escapeHtml(page.slug)}/submissions">${fields}<button type="submit">Submit</button></form></main></body></html>`;
  }

  async get(id: string): Promise<Page | undefined> {
    return this.pages.getById(id);
  }

  async list(status?: PageStatus): Promise<Page[]> {
    const all = await this.pages.list();
    return status ? all.filter((page) => page.status === status) : all;
  }

  async listSubmissions(pageId?: string): Promise<PageSubmission[]> {
    const all = await this.submissions.list();
    return pageId ? all.filter((submission) => submission.pageId === pageId) : all;
  }

  async listReferrals(pageId?: string): Promise<ReferralLink[]> {
    const all = await this.referrals.list();
    return pageId ? all.filter((link) => link.pageId === pageId) : all;
  }

  async listImports(pageId?: string): Promise<PageImportRecord[]> {
    const all = await this.imports.list();
    return pageId ? all.filter((record) => record.pageId === pageId) : all;
  }

  async listApprovals(pageId?: string): Promise<PageApprovalRequest[]> {
    const all = await this.approvals.list();
    return pageId ? all.filter((request) => request.pageId === pageId) : all;
  }

  private async getRequiredPage(id: string): Promise<Page> {
    const page = await this.pages.getById(id);
    if (!page) throw new Error(`Page "${id}" not found.`);
    return page;
  }

  private async getPublishedBySlug(slug: string): Promise<Page> {
    const all = await this.pages.list();
    const page = all.find((item) => item.slug === slug);
    if (!page || page.status !== 'published') throw new Error(`Published page "${slug}" not found.`);
    return page;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));
}
