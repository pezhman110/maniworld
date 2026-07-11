import {
  AudienceProfile,
  AudienceRoute,
  CommissionModel,
  LandingPageContentBlock,
  LandingPageSite,
  ResumeIntake,
  ResumeSource,
  WorkingHoursWindow,
} from '../types/domain';
import { InMemoryRepository, Repository } from './persistence';

/**
 * Presentation & online-consultation campaign module.
 *
 * A fully independent module (does not depend on, and is not depended on
 * by, the lead-to-booking CRM pipeline or the freelancer-recruitment
 * pipeline). It lets a manager, entirely from the dashboard:
 *
 *  1. Define/edit audience profiles: the target-audience text and its
 *     goals, so the same presentation session can be re-aimed at an
 *     influencer, a company, a group, a bank, etc. — changing the
 *     audience changes the goals.
 *  2. Define/edit commission & collaboration models, optionally scoped to
 *     one audience profile or vertical (choosing "banking" people changes
 *     the whole plan, including commissions).
 *  3. Record where a collaborator/candidate's resume came from (Indeed,
 *     LinkedIn, or a manually supplied link/location).
 *  4. Define single-page landing sites: a slug/path, an optional custom
 *     domain to point at once hosted, a hero text, and any number of
 *     manually-added content blocks (words, sentences, or addresses) plus
 *     the lead-capture fields the page should collect.
 */

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value;
}

const VALID_AUDIENCE_ROUTES: AudienceRoute[] = ['direct-network', 'job-posting', 'resume-intake'];

function requireValidRoute(route: AudienceRoute): void {
  if (!VALID_AUDIENCE_ROUTES.includes(route)) {
    throw new Error(`Invalid audience route "${route}".`);
  }
}

function requireValidWorkingHours(window: WorkingHoursWindow): void {
  const { startHour, endHour } = window;
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < 0 ||
    endHour > 24 ||
    startHour >= endHour
  ) {
    throw new Error('Working hours must be an integer 0-24 range with startHour < endHour.');
  }
}

export class AudienceProfileRegistry {
  constructor(private repo: Repository<AudienceProfile> = new InMemoryRepository()) {}

  async create(params: {
    id: string;
    label: string;
    targetText: string;
    goals: string[];
    vertical?: string;
    route?: AudienceRoute;
    regions?: string[];
    dailyCap?: number;
    workingHours?: WorkingHoursWindow;
    now?: number;
  }): Promise<AudienceProfile> {
    requireNonEmpty(params.id, 'id');
    requireNonEmpty(params.label, 'label');
    requireNonEmpty(params.targetText, 'targetText');
    if (!params.goals || params.goals.length === 0) {
      throw new Error('At least one goal is required.');
    }
    if (params.route) requireValidRoute(params.route);
    if (params.workingHours) requireValidWorkingHours(params.workingHours);
    if (await this.repo.getById(params.id)) {
      throw new Error(`An audience profile with id "${params.id}" already exists.`);
    }
    const profile: AudienceProfile = {
      id: params.id,
      label: params.label,
      targetText: params.targetText,
      goals: params.goals,
      vertical: params.vertical,
      route: params.route,
      regions: params.regions,
      dailyCap: params.dailyCap,
      workingHours: params.workingHours,
      createdAt: params.now ?? Date.now(),
      active: true,
    };
    await this.repo.save(profile.id, profile);
    return profile;
  }

  /** Lets a manager change the audience (e.g. influencer → banking) and, with it, the target text and goals. */
  async update(
    id: string,
    patch: Partial<
      Pick<
        AudienceProfile,
        'label' | 'targetText' | 'goals' | 'vertical' | 'active' | 'route' | 'regions' | 'dailyCap' | 'workingHours'
      >
    >
  ): Promise<AudienceProfile> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Audience profile "${id}" not found.`);
    if (patch.route) requireValidRoute(patch.route);
    if (patch.workingHours) requireValidWorkingHours(patch.workingHours);
    const updated: AudienceProfile = { ...existing, ...patch };
    await this.repo.save(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async get(id: string): Promise<AudienceProfile | undefined> {
    return this.repo.getById(id);
  }

  async list(onlyActive = true): Promise<AudienceProfile[]> {
    const all = await this.repo.list();
    return onlyActive ? all.filter((p) => p.active) : all;
  }
}

export class CommissionModelRegistry {
  constructor(private repo: Repository<CommissionModel> = new InMemoryRepository()) {}

  async create(params: {
    id: string;
    label: string;
    type: CommissionModel['type'];
    rate?: number;
    tiers?: CommissionModel['tiers'];
    audienceProfileId?: string;
    notes?: string;
    now?: number;
  }): Promise<CommissionModel> {
    requireNonEmpty(params.id, 'id');
    requireNonEmpty(params.label, 'label');
    if (params.type === 'tiered') {
      if (!params.tiers || params.tiers.length === 0) {
        throw new Error('A tiered commission model requires at least one tier.');
      }
    } else if (params.rate === undefined || params.rate < 0) {
      throw new Error('"rate" is required and must be >= 0 for percentage/flat commission models.');
    }
    if (await this.repo.getById(params.id)) {
      throw new Error(`A commission model with id "${params.id}" already exists.`);
    }
    const model: CommissionModel = {
      id: params.id,
      label: params.label,
      type: params.type,
      rate: params.rate,
      tiers: params.tiers,
      audienceProfileId: params.audienceProfileId,
      notes: params.notes,
      createdAt: params.now ?? Date.now(),
      active: true,
    };
    await this.repo.save(model.id, model);
    return model;
  }

  async update(
    id: string,
    patch: Partial<Pick<CommissionModel, 'label' | 'type' | 'rate' | 'tiers' | 'audienceProfileId' | 'notes' | 'active'>>
  ): Promise<CommissionModel> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Commission model "${id}" not found.`);
    const updated: CommissionModel = { ...existing, ...patch };
    await this.repo.save(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async get(id: string): Promise<CommissionModel | undefined> {
    return this.repo.getById(id);
  }

  async list(onlyActive = true): Promise<CommissionModel[]> {
    const all = await this.repo.list();
    return onlyActive ? all.filter((m) => m.active) : all;
  }

  async listForAudienceProfile(audienceProfileId: string): Promise<CommissionModel[]> {
    const all = await this.list();
    return all.filter((m) => m.audienceProfileId === audienceProfileId);
  }
}

let resumeIdSeq = 0;
function nextResumeId(): string {
  resumeIdSeq += 1;
  return `resume-${Date.now()}-${resumeIdSeq}`;
}

const VALID_RESUME_SOURCES: readonly ResumeSource[] = ['indeed', 'linkedin', 'manual-link', 'upload'];

export class ResumeIntakeRegistry {
  constructor(private repo: Repository<ResumeIntake> = new InMemoryRepository()) {}

  async record(params: {
    candidateName: string;
    source: ResumeSource;
    url?: string;
    audienceProfileId?: string;
    notes?: string;
    now?: number;
  }): Promise<ResumeIntake> {
    requireNonEmpty(params.candidateName, 'candidateName');
    if (!VALID_RESUME_SOURCES.includes(params.source)) {
      throw new Error(`"source" must be one of ${VALID_RESUME_SOURCES.join(', ')}.`);
    }
    if ((params.source === 'indeed' || params.source === 'linkedin' || params.source === 'manual-link')) {
      if (!params.url || !/^https?:\/\//i.test(params.url)) {
        throw new Error(`A valid http(s) "url" is required when source is "${params.source}".`);
      }
    }
    const intake: ResumeIntake = {
      id: nextResumeId(),
      candidateName: params.candidateName,
      source: params.source,
      url: params.url,
      audienceProfileId: params.audienceProfileId,
      notes: params.notes,
      createdAt: params.now ?? Date.now(),
    };
    await this.repo.save(intake.id, intake);
    return intake;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async list(): Promise<ResumeIntake[]> {
    return this.repo.list();
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class LandingPageRegistry {
  constructor(private repo: Repository<LandingPageSite> = new InMemoryRepository()) {}

  private async assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const all = await this.repo.list();
    if (all.some((site) => site.slug === slug && site.id !== excludeId)) {
      throw new Error(`A landing page with slug "${slug}" already exists.`);
    }
  }

  async create(params: {
    id: string;
    slug: string;
    domain?: string;
    audienceProfileId?: string;
    heroText: string;
    contentBlocks?: LandingPageContentBlock[];
    leadFormFields?: string[];
    now?: number;
  }): Promise<LandingPageSite> {
    requireNonEmpty(params.id, 'id');
    requireNonEmpty(params.slug, 'slug');
    requireNonEmpty(params.heroText, 'heroText');
    if (!SLUG_PATTERN.test(params.slug)) {
      throw new Error('"slug" must be lowercase letters/numbers/hyphens only, e.g. "bank-consult".');
    }
    if (await this.repo.getById(params.id)) {
      throw new Error(`A landing page with id "${params.id}" already exists.`);
    }
    await this.assertSlugAvailable(params.slug);

    const site: LandingPageSite = {
      id: params.id,
      slug: params.slug,
      domain: params.domain,
      audienceProfileId: params.audienceProfileId,
      heroText: params.heroText,
      contentBlocks: params.contentBlocks ?? [],
      leadFormFields: params.leadFormFields ?? ['fullName', 'phone'],
      createdAt: params.now ?? Date.now(),
      active: true,
    };
    await this.repo.save(site.id, site);
    return site;
  }

  async update(
    id: string,
    patch: Partial<
      Pick<LandingPageSite, 'slug' | 'domain' | 'audienceProfileId' | 'heroText' | 'contentBlocks' | 'leadFormFields' | 'active'>
    >
  ): Promise<LandingPageSite> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Landing page "${id}" not found.`);
    if (patch.slug && patch.slug !== existing.slug) {
      if (!SLUG_PATTERN.test(patch.slug)) {
        throw new Error('"slug" must be lowercase letters/numbers/hyphens only, e.g. "bank-consult".');
      }
      await this.assertSlugAvailable(patch.slug, id);
    }
    const updated: LandingPageSite = { ...existing, ...patch };
    await this.repo.save(id, updated);
    return updated;
  }

  /** Manually add one extra word/sentence/address content block to an existing page, exactly like the prior project. */
  async addContentBlock(id: string, block: LandingPageContentBlock): Promise<LandingPageSite> {
    requireNonEmpty(block.label, 'label');
    requireNonEmpty(block.content, 'content');
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Landing page "${id}" not found.`);
    const updated: LandingPageSite = { ...existing, contentBlocks: [...existing.contentBlocks, block] };
    await this.repo.save(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async get(id: string): Promise<LandingPageSite | undefined> {
    return this.repo.getById(id);
  }

  async getBySlug(slug: string): Promise<LandingPageSite | undefined> {
    const all = await this.repo.list();
    return all.find((site) => site.slug === slug);
  }

  async list(onlyActive = true): Promise<LandingPageSite[]> {
    const all = await this.repo.list();
    return onlyActive ? all.filter((s) => s.active) : all;
  }
}
