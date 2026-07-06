import { Freelancer, FreelancerContract, RecruitmentPlan } from '../src/types/domain';
import {
  FreelancerInterviewRegistry,
  FreelancerContractRegistry,
  generateOfferLetter,
  HireDecisionRegistry,
  StaffAccountRegistry,
} from '../src/modules/freelancerContracts';

function makeFreelancer(overrides: Partial<Freelancer> = {}): Freelancer {
  return {
    id: 'freelancer_1',
    fullName: 'Sara Ahmadi',
    phone: '+971500000000',
    email: 'sara@example.com',
    line: 'nails',
    source: 'indeed',
    availability: [],
    status: 'sourced',
    createdAt: 0,
    ...overrides,
  };
}

function makePlan(overrides: Partial<RecruitmentPlan> = {}): RecruitmentPlan {
  return {
    id: 'plan_1',
    market: 'salon-women',
    line: 'nails',
    createdBy: 'manager',
    directCommissionPercent: 30,
    otherServicesCommissionPercent: 15,
    targetLocationIds: ['salon_1'],
    active: true,
    createdAt: 0,
    ...overrides,
  };
}

describe('FreelancerInterviewRegistry', () => {
  it('schedules an interview and records the outcome from the salon dashboard', () => {
    const registry = new FreelancerInterviewRegistry();
    registry.schedule('freelancer_1', 'salon_1', 1000);
    const record = registry.recordOutcome('freelancer_1', 'salon_1', 'passed', 'salon-manager', 'Great test result');

    expect(record.outcome).toBe('passed');
    expect(registry.listByFreelancer('freelancer_1')).toHaveLength(1);
    expect(registry.listByLocation('salon_1')).toHaveLength(1);
  });

  it('throws when recording an outcome for an interview that was never scheduled', () => {
    const registry = new FreelancerInterviewRegistry();
    expect(() => registry.recordOutcome('freelancer_1', 'salon_1', 'failed')).toThrow();
  });
});

describe('FreelancerContractRegistry', () => {
  it('signs a contract carrying the plan commission percentages', () => {
    const registry = new FreelancerContractRegistry();
    const contract = registry.sign(makeFreelancer(), makePlan());

    expect(contract.directCommissionPercent).toBe(30);
    expect(contract.otherServicesCommissionPercent).toBe(15);
    expect(registry.getByFreelancer('freelancer_1')).toBe(contract);
  });

  it('computes salon earnings from direct and other-services revenue', () => {
    const registry = new FreelancerContractRegistry();
    const contract = registry.sign(makeFreelancer(), makePlan());
    const earnings = registry.computeSalonEarnings(contract, 1000, 200);
    expect(earnings).toBeCloseTo(1000 * 0.3 + 200 * 0.15);
  });
});

describe('generateOfferLetter', () => {
  it('includes the freelancer name, line, and commission percentages', () => {
    const contract: FreelancerContract = {
      id: 'contract_1',
      freelancerId: 'freelancer_1',
      planId: 'plan_1',
      directCommissionPercent: 30,
      otherServicesCommissionPercent: 15,
      signedAt: 0,
      active: true,
    };
    const text = generateOfferLetter(makeFreelancer(), contract);
    expect(text).toContain('Sara Ahmadi');
    expect(text).toContain('nails');
    expect(text).toContain('30%');
    expect(text).toContain('15%');
  });
});

describe('HireDecisionRegistry', () => {
  it('records a hire decision and produces HR/manager/freelancer/salon notifications', () => {
    const registry = new HireDecisionRegistry();
    const contractRegistry = new FreelancerContractRegistry();
    const freelancer = makeFreelancer();
    const contract = contractRegistry.sign(freelancer, makePlan());

    const { record, notifications } = registry.decide({
      freelancer,
      contract,
      decision: 'hired',
      decidedBy: 'hr-manager',
      locationId: 'salon_1',
      hrContact: 'hr@maniworld.com',
      salesManagerContact: 'manager@maniworld.com',
    });

    expect(record.decision).toBe('hired');
    expect(record.offerLetterText).toBeDefined();
    expect(notifications).toHaveLength(4);
    expect(notifications.map((n) => n.recipientRole)).toEqual(['hr', 'sales-manager', 'freelancer', 'salon']);
  });

  it('rejects a "hired" decision without a signed contract', () => {
    const registry = new HireDecisionRegistry();
    expect(() =>
      registry.decide({
        freelancer: makeFreelancer(),
        decision: 'hired',
        decidedBy: 'hr',
        hrContact: 'hr@maniworld.com',
        salesManagerContact: 'manager@maniworld.com',
      })
    ).toThrow();
  });

  it('produces no notifications for a rejection', () => {
    const registry = new HireDecisionRegistry();
    const { record, notifications } = registry.decide({
      freelancer: makeFreelancer(),
      decision: 'rejected',
      decidedBy: 'hr',
      hrContact: 'hr@maniworld.com',
      salesManagerContact: 'manager@maniworld.com',
    });
    expect(record.decision).toBe('rejected');
    expect(notifications).toHaveLength(0);
  });
});

describe('StaffAccountRegistry', () => {
  it('converts a hired freelancer into an active staff account', () => {
    const contractRegistry = new FreelancerContractRegistry();
    const staffRegistry = new StaffAccountRegistry();
    const freelancer = makeFreelancer({ status: 'hired' });
    const contract = contractRegistry.sign(freelancer, makePlan());

    const account = staffRegistry.convert(freelancer, 'salon-women', contract);

    expect(account.freelancerId).toBe(freelancer.id);
    expect(account.active).toBe(true);
    expect(freelancer.status).toBe('active-account');
    expect(staffRegistry.getByFreelancer(freelancer.id)).toBe(account);
  });

  it('refuses to convert a freelancer that has not been hired', () => {
    const contractRegistry = new FreelancerContractRegistry();
    const staffRegistry = new StaffAccountRegistry();
    const freelancer = makeFreelancer({ status: 'screening' });
    const contract = contractRegistry.sign(freelancer, makePlan());

    expect(() => staffRegistry.convert(freelancer, 'salon-women', contract)).toThrow();
  });
});
