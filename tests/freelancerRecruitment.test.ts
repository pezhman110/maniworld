import {
  RecruitmentPlanRegistry,
  FreelancerJobPostingRegistry,
  FreelancerRegistry,
  InvalidFreelancerTransitionError,
} from '../src/modules/freelancerRecruitment';

describe('RecruitmentPlanRegistry', () => {
  it('creates a plan with commission percentages and target salons', () => {
    const registry = new RecruitmentPlanRegistry();
    const plan = registry.create({
      market: 'salon-women',
      line: 'nails',
      createdBy: 'sales-manager-1',
      directCommissionPercent: 30,
      otherServicesCommissionPercent: 15,
      targetLocationIds: ['location_1', 'location_2'],
    });

    expect(plan.id).toBe('plan_1');
    expect(plan.directCommissionPercent).toBe(30);
    expect(plan.otherServicesCommissionPercent).toBe(15);
    expect(plan.targetLocationIds).toEqual(['location_1', 'location_2']);
    expect(plan.active).toBe(true);
  });

  it('rejects commission percentages outside 0-100', () => {
    const registry = new RecruitmentPlanRegistry();
    expect(() =>
      registry.create({
        market: 'salon-women',
        line: 'nails',
        createdBy: 'manager',
        directCommissionPercent: 130,
        otherServicesCommissionPercent: 10,
        targetLocationIds: [],
      })
    ).toThrow();
  });

  it('lists plans by market and updates an existing plan', () => {
    const registry = new RecruitmentPlanRegistry();
    const plan = registry.create({
      market: 'salon-women',
      line: 'hair',
      createdBy: 'manager',
      directCommissionPercent: 25,
      otherServicesCommissionPercent: 10,
      targetLocationIds: ['location_1'],
    });

    const updated = registry.update(plan.id, { directCommissionPercent: 35 });
    expect(updated.directCommissionPercent).toBe(35);
    expect(registry.listByMarket('salon-women')).toHaveLength(1);
  });
});

describe('FreelancerJobPostingRegistry', () => {
  it('posts and closes job ads on Indeed and LinkedIn', () => {
    const registry = new FreelancerJobPostingRegistry();
    const indeed = registry.post({ board: 'indeed', planId: 'plan_1', title: 'Nail freelancer' });
    const linkedin = registry.post({ board: 'linkedin', planId: 'plan_1', title: 'Hair stylist freelancer' });

    expect(registry.listByPlan('plan_1')).toHaveLength(2);
    expect(registry.listByBoard('indeed')).toEqual([indeed]);

    registry.close(linkedin.id);
    expect(registry.listByBoard('linkedin')).toHaveLength(0);
  });

  it('rejects an invalid posting URL', () => {
    const registry = new FreelancerJobPostingRegistry();
    expect(() => registry.post({ board: 'indeed', planId: 'plan_1', title: 'x', url: 'not-a-url' })).toThrow();
  });
});

describe('FreelancerRegistry', () => {
  it('adds a freelancer from a job board application and tracks status transitions', () => {
    const registry = new FreelancerRegistry();
    const freelancer = registry.add({
      fullName: 'Sara Ahmadi',
      phone: '+971500000000',
      line: 'nails',
      source: 'indeed',
      resumeUrl: 'https://example.com/resume.pdf',
      clientCount: 30,
    });

    expect(freelancer.status).toBe('sourced');

    registry.transition(freelancer.id, 'applied');
    const screened = registry.screen(freelancer.id);
    expect(screened.status).toBe('screening');

    registry.transition(freelancer.id, 'interview-scheduled');
    registry.transition(freelancer.id, 'interviewed');
    registry.transition(freelancer.id, 'passed');
    registry.transition(freelancer.id, 'contract-offered');
    const hired = registry.transition(freelancer.id, 'hired');
    expect(hired.status).toBe('hired');
  });

  it('rejects a candidate during screening when there is no resume on file', () => {
    const registry = new FreelancerRegistry();
    const freelancer = registry.add({
      fullName: 'No Resume',
      phone: '+971500000001',
      line: 'hair',
      source: 'manual-list',
    });

    const result = registry.screen(freelancer.id);
    expect(result.status).toBe('rejected');
  });

  it('allows dropping out (failed/rejected) from any stage but blocks invalid forward skips', () => {
    const registry = new FreelancerRegistry();
    const freelancer = registry.add({
      fullName: 'Test Candidate',
      phone: '+971500000002',
      line: 'nails',
      source: 'referral',
    });

    registry.transition(freelancer.id, 'failed');
    expect(registry.get(freelancer.id)?.status).toBe('failed');
  });

  it('throws on unknown freelancer transitions', () => {
    const registry = new FreelancerRegistry();
    const freelancer = registry.add({
      fullName: 'Backward',
      phone: '+971500000003',
      line: 'nails',
      source: 'manual-list',
    });
    registry.transition(freelancer.id, 'applied');
    expect(() => registry.transition(freelancer.id, 'sourced')).toThrow(InvalidFreelancerTransitionError);
  });

  it('lists freelancers by line and by status', () => {
    const registry = new FreelancerRegistry();
    registry.add({ fullName: 'A', phone: '1', line: 'nails', source: 'manual-list' });
    registry.add({ fullName: 'B', phone: '2', line: 'hair', source: 'manual-list' });

    expect(registry.listByLine('nails')).toHaveLength(1);
    expect(registry.listByStatus('sourced')).toHaveLength(2);
  });
});
