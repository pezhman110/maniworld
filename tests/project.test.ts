import {
  ProjectRegistry,
  AIPersonaRegistry,
  ProjectNotFoundError,
  InvalidRouteError,
  AIPersonaNotFoundError,
  AIPersonaNotApprovedError,
  ALL_AUDIENCE_ROUTES,
} from '../src/modules/project';

describe('ProjectRegistry', () => {
  it('creates a project (step 0) with all three acquisition routes present but inactive', () => {
    const registry = new ProjectRegistry();
    const project = registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a' });

    expect(project.name).toBe('Freelancer');
    expect(project.createdBy).toBe('client-a');
    expect(project.routes).toHaveLength(3);
    expect(project.routes.map((r) => r.route).sort()).toEqual([...ALL_AUDIENCE_ROUTES].sort());
    expect(project.routes.every((r) => !r.active)).toBe(true);
  });

  it('requires a name and a createdBy', () => {
    const registry = new ProjectRegistry();
    expect(() => registry.create({ name: '', createdBy: 'client-a' })).toThrow('"name" is required.');
    expect(() => registry.create({ name: 'Freelancer', createdBy: '' })).toThrow('"createdBy" is required.');
  });

  it('rejects creating a project with a duplicate id', () => {
    const registry = new ProjectRegistry();
    registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a' });
    expect(() => registry.create({ id: 'proj-1', name: 'Other', createdBy: 'client-a' })).toThrow(
      'already exists'
    );
  });

  it('activates and deactivates one of the three routes independently', () => {
    const registry = new ProjectRegistry();
    const project = registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a' });

    registry.activateRoute('proj-1', 'direct-network', 1000);
    expect(registry.listActiveRoutes('proj-1')).toEqual([
      { route: 'direct-network', active: true, activatedAt: 1000 },
    ]);

    registry.activateRoute('proj-1', 'job-posting', 2000);
    expect(registry.listActiveRoutes('proj-1').map((r) => r.route).sort()).toEqual(
      ['direct-network', 'job-posting'].sort()
    );

    registry.deactivateRoute('proj-1', 'direct-network');
    expect(registry.listActiveRoutes('proj-1').map((r) => r.route)).toEqual(['job-posting']);

    expect(project.routes).toHaveLength(3);
  });

  it('rejects activating an invalid route', () => {
    const registry = new ProjectRegistry();
    registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a' });
    expect(() => registry.activateRoute('proj-1', 'bogus-route' as never)).toThrow(InvalidRouteError);
  });

  it('throws ProjectNotFoundError for an unknown project', () => {
    const registry = new ProjectRegistry();
    expect(() => registry.activateRoute('missing', 'direct-network')).toThrow(ProjectNotFoundError);
  });

  it('links the project to the AudienceProfile group created for it', () => {
    const registry = new ProjectRegistry();
    registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a' });
    const linked = registry.linkAudienceProfile('proj-1', 'freelancers-beauty');
    expect(linked.audienceProfileId).toBe('freelancers-beauty');
  });

  it('updates goals/standards for a project', () => {
    const registry = new ProjectRegistry();
    registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a', goals: ['a'] });
    const updated = registry.updateGoals('proj-1', ['must contact previous employer', 'must not exceed daily cap']);
    expect(updated.goals).toEqual(['must contact previous employer', 'must not exceed daily cap']);
  });

  it('lists only active projects when requested', () => {
    const registry = new ProjectRegistry();
    registry.create({ id: 'proj-1', name: 'Freelancer', createdBy: 'client-a' });
    expect(registry.all(true)).toHaveLength(1);
  });
});

describe('AIPersonaRegistry', () => {
  it('requests a persona that always starts pending manager approval', () => {
    const registry = new AIPersonaRegistry();
    const persona = registry.request({
      id: 'persona-1',
      projectId: 'proj-1',
      name: 'Banking Recruiter Bot',
      purpose: 'Screen banking-sector candidates against compliance goals.',
      instructions: 'Stay on script; never discuss commission numbers.',
      requestedBy: 'manager-a',
    });
    expect(persona.approvalStatus).toBe('pending-manager-approval');
    expect(persona.approvedBy).toBeUndefined();
  });

  it('requires all fields to request a persona', () => {
    const registry = new AIPersonaRegistry();
    expect(() =>
      registry.request({ projectId: '', name: 'x', purpose: 'y', instructions: 'z', requestedBy: 'm' })
    ).toThrow('"projectId" is required.');
    expect(() =>
      registry.request({ projectId: 'p', name: '', purpose: 'y', instructions: 'z', requestedBy: 'm' })
    ).toThrow('"name" is required.');
  });

  it('a manager can approve a pending persona, after which it passes assertApproved', () => {
    const registry = new AIPersonaRegistry();
    registry.request({
      id: 'persona-1',
      projectId: 'proj-1',
      name: 'Banking Recruiter Bot',
      purpose: 'purpose',
      instructions: 'instructions',
      requestedBy: 'manager-a',
    });

    expect(() => registry.assertApproved('persona-1')).toThrow(AIPersonaNotApprovedError);

    const decided = registry.decide('persona-1', 'approved', 'manager-b', 5000);
    expect(decided.approvalStatus).toBe('approved');
    expect(decided.approvedBy).toBe('manager-b');
    expect(decided.decidedAt).toBe(5000);

    expect(registry.assertApproved('persona-1')).toBe(decided);
  });

  it('a manager can reject a pending persona, which then fails assertApproved permanently', () => {
    const registry = new AIPersonaRegistry();
    registry.request({
      id: 'persona-1',
      projectId: 'proj-1',
      name: 'Bot',
      purpose: 'purpose',
      instructions: 'instructions',
      requestedBy: 'manager-a',
    });
    registry.decide('persona-1', 'rejected', 'manager-b');
    expect(() => registry.assertApproved('persona-1')).toThrow(AIPersonaNotApprovedError);
  });

  it('rejects deciding a persona twice', () => {
    const registry = new AIPersonaRegistry();
    registry.request({
      id: 'persona-1',
      projectId: 'proj-1',
      name: 'Bot',
      purpose: 'purpose',
      instructions: 'instructions',
      requestedBy: 'manager-a',
    });
    registry.decide('persona-1', 'approved', 'manager-b');
    expect(() => registry.decide('persona-1', 'rejected', 'manager-c')).toThrow('already been decided');
  });

  it('throws AIPersonaNotFoundError for an unknown persona', () => {
    const registry = new AIPersonaRegistry();
    expect(() => registry.assertApproved('missing')).toThrow(AIPersonaNotFoundError);
  });

  it('lists personas by project and lists those pending approval', () => {
    const registry = new AIPersonaRegistry();
    registry.request({
      id: 'persona-1',
      projectId: 'proj-1',
      name: 'Bot 1',
      purpose: 'purpose',
      instructions: 'instructions',
      requestedBy: 'manager-a',
    });
    registry.request({
      id: 'persona-2',
      projectId: 'proj-2',
      name: 'Bot 2',
      purpose: 'purpose',
      instructions: 'instructions',
      requestedBy: 'manager-a',
    });
    registry.decide('persona-2', 'approved', 'manager-b');

    expect(registry.listByProject('proj-1').map((p) => p.id)).toEqual(['persona-1']);
    expect(registry.listPendingApproval().map((p) => p.id)).toEqual(['persona-1']);
    expect(registry.all()).toHaveLength(2);
  });
});
