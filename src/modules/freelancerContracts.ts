import {
  Freelancer,
  FreelancerContract,
  FreelancerInterviewRecord,
  HireDecision,
  HireDecisionRecord,
  HireNotification,
  InterviewOutcome,
  MarketType,
  RecruitmentPlan,
  StaffAccount,
} from '../types/domain';

/**
 * Freelancer contracts & onboarding module.
 *
 * Covers the back half of the pipeline: the salon records an in-person (or
 * online) interview outcome from its own dashboard, a final hire/reject
 * decision is made, a commission contract is signed off a recruitment
 * plan's percentages, HR is handed an offer-letter/contract text plus
 * start-of-work notifications go out to everyone involved, and the
 * freelancer is finally converted into an active staff account.
 */

export class FreelancerInterviewRegistry {
  private records: FreelancerInterviewRecord[] = [];

  /** The salon's own dashboard schedules (or later records the outcome of) an interview. */
  schedule(freelancerId: string, locationId: string, scheduledAt: number): FreelancerInterviewRecord {
    const record: FreelancerInterviewRecord = { freelancerId, locationId, scheduledAt, outcome: 'pending' };
    this.records.push(record);
    return record;
  }

  /** Salon marks the interview result: "خوب بود" / "بد بود" -> passed / failed. */
  recordOutcome(
    freelancerId: string,
    locationId: string,
    outcome: InterviewOutcome,
    recordedBy?: string,
    notes?: string
  ): FreelancerInterviewRecord {
    const record = [...this.records]
      .reverse()
      .find((r) => r.freelancerId === freelancerId && r.locationId === locationId);
    if (!record) {
      throw new Error(`No scheduled interview found for freelancer "${freelancerId}" at location "${locationId}".`);
    }
    record.outcome = outcome;
    record.recordedBy = recordedBy;
    record.notes = notes;
    return record;
  }

  listByFreelancer(freelancerId: string): FreelancerInterviewRecord[] {
    return this.records.filter((r) => r.freelancerId === freelancerId);
  }

  listByLocation(locationId: string): FreelancerInterviewRecord[] {
    return this.records.filter((r) => r.locationId === locationId);
  }
}

export class FreelancerContractRegistry {
  private contracts = new Map<string, FreelancerContract>();
  private sequence = 0;

  sign(freelancer: Freelancer, plan: RecruitmentPlan, now: number = Date.now()): FreelancerContract {
    this.sequence += 1;
    const contract: FreelancerContract = {
      id: `contract_${this.sequence}`,
      freelancerId: freelancer.id,
      planId: plan.id,
      directCommissionPercent: plan.directCommissionPercent,
      otherServicesCommissionPercent: plan.otherServicesCommissionPercent,
      signedAt: now,
      active: true,
    };
    this.contracts.set(contract.id, contract);
    return contract;
  }

  get(id: string): FreelancerContract | undefined {
    return this.contracts.get(id);
  }

  getByFreelancer(freelancerId: string): FreelancerContract | undefined {
    return [...this.contracts.values()].find((c) => c.freelancerId === freelancerId && c.active);
  }

  /** Salon's share of revenue: direct % of the freelancer's own clients + other-services % of upsells. */
  computeSalonEarnings(contract: FreelancerContract, directRevenue: number, otherServicesRevenue: number): number {
    return (
      (directRevenue * contract.directCommissionPercent) / 100 +
      (otherServicesRevenue * contract.otherServicesCommissionPercent) / 100
    );
  }
}

/** Generates the offer-letter/contract text HR sends once a freelancer is finally approved for hire. */
export function generateOfferLetter(freelancer: Freelancer, contract: FreelancerContract): string {
  return [
    `Offer of Contract - ${freelancer.fullName}`,
    ``,
    `Line: ${freelancer.line}`,
    `Direct commission: ${contract.directCommissionPercent}% (your own clients)`,
    `Other-services commission: ${contract.otherServicesCommissionPercent}% (when your client uses another salon service)`,
    ``,
    `Please confirm acceptance to schedule your start date.`,
  ].join('\n');
}

export class HireDecisionRegistry {
  private decisions = new Map<string, HireDecisionRecord>();

  /**
   * Records the final hire/reject decision. On hire, generates the HR
   * offer-letter/contract text and the start-of-work notification list
   * (HR, sales manager, the freelancer, and the placing salon).
   */
  decide(params: {
    freelancer: Freelancer;
    contract?: FreelancerContract;
    decision: HireDecision;
    decidedBy: string;
    locationId?: string;
    hrContact: string;
    salesManagerContact: string;
    now?: number;
  }): { record: HireDecisionRecord; notifications: HireNotification[] } {
    const now = params.now ?? Date.now();

    if (params.decision === 'hired' && !params.contract) {
      throw new Error('A signed contract is required to record a "hired" decision.');
    }

    const offerLetterText =
      params.decision === 'hired' && params.contract
        ? generateOfferLetter(params.freelancer, params.contract)
        : undefined;

    const record: HireDecisionRecord = {
      freelancerId: params.freelancer.id,
      decision: params.decision,
      decidedBy: params.decidedBy,
      decidedAt: now,
      offerLetterText,
    };
    this.decisions.set(params.freelancer.id, record);

    const notifications: HireNotification[] =
      params.decision === 'hired'
        ? [
            {
              recipientRole: 'hr',
              recipientContact: params.hrContact,
              subject: `New hire: ${params.freelancer.fullName}`,
              body: offerLetterText ?? '',
            },
            {
              recipientRole: 'sales-manager',
              recipientContact: params.salesManagerContact,
              subject: `Freelancer hired: ${params.freelancer.fullName}`,
              body: `${params.freelancer.fullName} (${params.freelancer.line}) has been hired and starts soon.`,
            },
            {
              recipientRole: 'freelancer',
              recipientContact: params.freelancer.email ?? params.freelancer.phone,
              subject: 'Your contract offer',
              body: offerLetterText ?? '',
            },
            ...(params.locationId
              ? [
                  {
                    recipientRole: 'salon' as const,
                    recipientContact: params.locationId,
                    subject: `${params.freelancer.fullName} starting soon`,
                    body: `${params.freelancer.fullName} (${params.freelancer.line}) has been hired and will start working at your salon soon.`,
                  },
                ]
              : []),
          ]
        : [];

    return { record, notifications };
  }

  get(freelancerId: string): HireDecisionRecord | undefined {
    return this.decisions.get(freelancerId);
  }
}

export class StaffAccountRegistry {
  private accounts = new Map<string, StaffAccount>();
  private sequence = 0;

  /** Converts a hired freelancer candidate into an active staff account - the requested "تبدیل اکانت". */
  convert(freelancer: Freelancer, market: MarketType, contract: FreelancerContract, now: number = Date.now()): StaffAccount {
    if (freelancer.status !== 'hired' && freelancer.status !== 'contract-offered') {
      throw new Error(
        `Freelancer "${freelancer.id}" must be hired before converting to a staff account (status: "${freelancer.status}").`
      );
    }
    if (!contract.active) {
      throw new Error(`Contract "${contract.id}" is not active.`);
    }

    this.sequence += 1;
    const account: StaffAccount = {
      id: `staff_${this.sequence}`,
      freelancerId: freelancer.id,
      fullName: freelancer.fullName,
      line: freelancer.line,
      market,
      contractId: contract.id,
      createdAt: now,
      active: true,
    };
    this.accounts.set(account.id, account);
    freelancer.status = 'active-account';
    return account;
  }

  get(id: string): StaffAccount | undefined {
    return this.accounts.get(id);
  }

  getByFreelancer(freelancerId: string): StaffAccount | undefined {
    return [...this.accounts.values()].find((a) => a.freelancerId === freelancerId);
  }

  all(onlyActive = true): StaffAccount[] {
    return [...this.accounts.values()].filter((a) => !onlyActive || a.active);
  }
}
