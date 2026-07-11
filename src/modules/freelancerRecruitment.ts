import {
  Freelancer,
  FreelancerAvailabilitySlot,
  FreelancerSourceChannel,
  FreelancerStatus,
  FreelancerJobPosting,
  JobBoard,
  MarketType,
  RecruitmentPlan,
} from '../types/domain';

/**
 * Freelancer recruitment module.
 *
 * Covers the sourcing side of the freelancer pipeline: a sales manager
 * defines a recruitment plan (which market/line, and the commission split
 * the freelancer will eventually be contracted on), job ads are posted to
 * external boards (Indeed / LinkedIn) or the manager adds a candidate
 * straight from a manual list/referral, and every candidate is tracked
 * through a funnel of statuses from "sourced" to "active-account".
 */

const STATUS_ORDER: FreelancerStatus[] = [
  'sourced',
  'applied',
  'screening',
  'interview-scheduled',
  'interviewed',
  'passed',
  'contract-offered',
  'hired',
  'active-account',
];

export class RecruitmentPlanRegistry {
  private plans = new Map<string, RecruitmentPlan>();
  private sequence = 0;

  create(params: {
    id?: string;
    market: MarketType;
    line: string;
    createdBy: string;
    directCommissionPercent: number;
    otherServicesCommissionPercent: number;
    targetLocationIds: string[];
    notes?: string;
    now?: number;
  }): RecruitmentPlan {
    this.assertPercent(params.directCommissionPercent, 'directCommissionPercent');
    this.assertPercent(params.otherServicesCommissionPercent, 'otherServicesCommissionPercent');
    if (!params.line.trim()) throw new Error('"line" is required.');

    this.sequence += 1;
    const plan: RecruitmentPlan = {
      id: params.id ?? `plan_${this.sequence}`,
      market: params.market,
      line: params.line.trim(),
      createdBy: params.createdBy,
      directCommissionPercent: params.directCommissionPercent,
      otherServicesCommissionPercent: params.otherServicesCommissionPercent,
      targetLocationIds: [...params.targetLocationIds],
      active: true,
      notes: params.notes,
      createdAt: params.now ?? Date.now(),
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  private assertPercent(value: number, field: string): void {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`"${field}" must be a number between 0 and 100, got ${value}.`);
    }
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        RecruitmentPlan,
        'directCommissionPercent' | 'otherServicesCommissionPercent' | 'targetLocationIds' | 'active' | 'notes'
      >
    >
  ): RecruitmentPlan {
    const existing = this.plans.get(id);
    if (!existing) throw new Error(`Recruitment plan "${id}" not found.`);
    if (patch.directCommissionPercent !== undefined) this.assertPercent(patch.directCommissionPercent, 'directCommissionPercent');
    if (patch.otherServicesCommissionPercent !== undefined) {
      this.assertPercent(patch.otherServicesCommissionPercent, 'otherServicesCommissionPercent');
    }
    const updated: RecruitmentPlan = { ...existing, ...patch };
    this.plans.set(id, updated);
    return updated;
  }

  get(id: string): RecruitmentPlan | undefined {
    return this.plans.get(id);
  }

  listByMarket(market: MarketType, onlyActive = true): RecruitmentPlan[] {
    return [...this.plans.values()].filter((p) => p.market === market && (!onlyActive || p.active));
  }

  all(onlyActive = false): RecruitmentPlan[] {
    return [...this.plans.values()].filter((p) => !onlyActive || p.active);
  }
}

export class FreelancerJobPostingRegistry {
  private postings = new Map<string, FreelancerJobPosting>();
  private sequence = 0;

  post(params: { board: JobBoard; planId: string; title: string; url?: string; now?: number }): FreelancerJobPosting {
    if (!params.title.trim()) throw new Error('"title" is required.');
    if (params.url && !/^https?:\/\//i.test(params.url)) {
      throw new Error(`"url" must be a valid http(s) URL, got "${params.url}".`);
    }

    this.sequence += 1;
    const posting: FreelancerJobPosting = {
      id: `posting_${this.sequence}`,
      board: params.board,
      planId: params.planId,
      title: params.title.trim(),
      url: params.url,
      postedAt: params.now ?? Date.now(),
      active: true,
    };
    this.postings.set(posting.id, posting);
    return posting;
  }

  close(id: string): boolean {
    const posting = this.postings.get(id);
    if (!posting) return false;
    posting.active = false;
    return true;
  }

  listByBoard(board: JobBoard, onlyActive = true): FreelancerJobPosting[] {
    return [...this.postings.values()].filter((p) => p.board === board && (!onlyActive || p.active));
  }

  listByPlan(planId: string, onlyActive = true): FreelancerJobPosting[] {
    return [...this.postings.values()].filter((p) => p.planId === planId && (!onlyActive || p.active));
  }
}

export class DuplicateFreelancerError extends Error {
  constructor(id: string) {
    super(`Freelancer "${id}" is already registered.`);
    this.name = 'DuplicateFreelancerError';
  }
}

export class InvalidFreelancerTransitionError extends Error {
  constructor(from: FreelancerStatus, to: FreelancerStatus) {
    super(`Invalid freelancer status transition from "${from}" to "${to}".`);
    this.name = 'InvalidFreelancerTransitionError';
  }
}

/**
 * Registry of freelancer candidates, whether they arrived via a job board
 * application, an inbound approach, or were added straight to a manual
 * outreach list by the sales team.
 */
export class FreelancerRegistry {
  private freelancers = new Map<string, Freelancer>();
  private sequence = 0;

  /** Adds a freelancer candidate - from a job-board application, referral, or a manually curated list. */
  add(params: {
    id?: string;
    fullName: string;
    phone: string;
    email?: string;
    line: string;
    source: FreelancerSourceChannel;
    resumeUrl?: string;
    resumeSummary?: string;
    clientCount?: number;
    availability?: FreelancerAvailabilitySlot[];
    notes?: string;
    now?: number;
  }): Freelancer {
    if (!params.fullName.trim()) throw new Error('"fullName" is required.');
    if (!params.phone.trim()) throw new Error('"phone" is required.');
    if (!params.line.trim()) throw new Error('"line" is required.');

    this.sequence += 1;
    const id = params.id ?? `freelancer_${this.sequence}`;
    if (this.freelancers.has(id)) {
      throw new DuplicateFreelancerError(id);
    }

    const freelancer: Freelancer = {
      id,
      fullName: params.fullName.trim(),
      phone: params.phone.trim(),
      email: params.email?.trim(),
      line: params.line.trim(),
      source: params.source,
      resumeUrl: params.resumeUrl,
      resumeSummary: params.resumeSummary,
      clientCount: params.clientCount,
      availability: params.availability ? [...params.availability] : [],
      status: 'sourced',
      createdAt: params.now ?? Date.now(),
      notes: params.notes,
    };
    this.freelancers.set(id, freelancer);
    return freelancer;
  }

  get(id: string): Freelancer | undefined {
    return this.freelancers.get(id);
  }

  /**
   * Screens a candidate's resume/notes: any candidate with a resume/summary
   * and a phone on file moves from "sourced"/"applied" into "screening",
   * matching the requested flow of "دریافت رزومه، غربال کردن، ارتباط گرفتن".
   */
  screen(id: string): Freelancer {
    const freelancer = this.mustGet(id);
    const hasEnoughInfo = Boolean(freelancer.resumeUrl || freelancer.resumeSummary);
    return this.transition(id, hasEnoughInfo ? 'screening' : 'rejected');
  }

  transition(id: string, toStatus: FreelancerStatus): Freelancer {
    const freelancer = this.mustGet(id);
    if (!this.isValidTransition(freelancer.status, toStatus)) {
      throw new InvalidFreelancerTransitionError(freelancer.status, toStatus);
    }
    freelancer.status = toStatus;
    return freelancer;
  }

  private isValidTransition(from: FreelancerStatus, to: FreelancerStatus): boolean {
    if (to === 'rejected' || to === 'failed') return true; // Can drop out at any stage.
    const fromIndex = STATUS_ORDER.indexOf(from);
    const toIndex = STATUS_ORDER.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) return false;
    return toIndex >= fromIndex;
  }

  private mustGet(id: string): Freelancer {
    const freelancer = this.freelancers.get(id);
    if (!freelancer) throw new Error(`Freelancer "${id}" not found.`);
    return freelancer;
  }

  listByStatus(status: FreelancerStatus): Freelancer[] {
    return [...this.freelancers.values()].filter((f) => f.status === status);
  }

  listByLine(line: string): Freelancer[] {
    return [...this.freelancers.values()].filter((f) => f.line === line);
  }

  all(): Freelancer[] {
    return [...this.freelancers.values()];
  }
}
