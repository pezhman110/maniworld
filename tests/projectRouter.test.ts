import request from 'supertest';
import { createApp } from '../src/server/app';

describe('project API (step 0) & AI persona approval gate', () => {
  function buildApp() {
    return createApp({});
  }

  it('creates a project via step 0, always exposing all three acquisition routes inactive', async () => {
    const app = buildApp();

    const createRes = await request(app)
      .post('/api/projects')
      .send({ id: 'project-1', name: 'Freelancer', createdBy: 'client-a', goals: ['must contact previous employer'] });
    expect(createRes.status).toBe(201);
    expect(createRes.body.project.name).toBe('Freelancer');
    expect(createRes.body.project.routes).toHaveLength(3);
    expect(createRes.body.project.routes.every((r: { active: boolean }) => !r.active)).toBe(true);

    const getRes = await request(app).get('/api/projects/project-1');
    expect(getRes.status).toBe(200);
    expect(getRes.body.project.id).toBe('project-1');

    const listRes = await request(app).get('/api/projects');
    expect(listRes.status).toBe(200);
    expect(listRes.body.projects).toHaveLength(1);
    expect(listRes.body.routes.sort()).toEqual(['direct-network', 'job-posting', 'resume-intake'].sort());
  });

  it('404s for an unknown project', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/projects/missing');
    expect(res.status).toBe(404);
  });

  it('activates and deactivates each of the three routes independently', async () => {
    const app = buildApp();
    await request(app).post('/api/projects').send({ id: 'project-1', name: 'Freelancer', createdBy: 'client-a' });

    const activateRes = await request(app).post('/api/projects/project-1/routes/direct-network/activate');
    expect(activateRes.status).toBe(200);
    expect(
      activateRes.body.project.routes.find((r: { route: string }) => r.route === 'direct-network').active
    ).toBe(true);

    const deactivateRes = await request(app).post('/api/projects/project-1/routes/direct-network/deactivate');
    expect(deactivateRes.status).toBe(200);
    expect(
      deactivateRes.body.project.routes.find((r: { route: string }) => r.route === 'direct-network').active
    ).toBe(false);
  });

  it('links the project to an AudienceProfile group and updates goals', async () => {
    const app = buildApp();
    await request(app).post('/api/projects').send({ id: 'project-1', name: 'Freelancer', createdBy: 'client-a' });

    const linkRes = await request(app)
      .post('/api/projects/project-1/audience-profile')
      .send({ audienceProfileId: 'freelancers-beauty' });
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.project.audienceProfileId).toBe('freelancers-beauty');

    const goalsRes = await request(app)
      .put('/api/projects/project-1/goals')
      .send({ goals: ['must not exceed daily cap'] });
    expect(goalsRes.status).toBe(200);
    expect(goalsRes.body.project.goals).toEqual(['must not exceed daily cap']);
  });

  it('requests an AI persona pending manager approval, then lets a manager decide', async () => {
    const app = buildApp();
    await request(app).post('/api/projects').send({ id: 'project-1', name: 'Freelancer', createdBy: 'client-a' });

    const requestRes = await request(app).post('/api/projects/project-1/ai-personas').send({
      id: 'persona-1',
      name: 'Banking Recruiter Bot',
      purpose: 'Screen banking-sector candidates.',
      instructions: 'Stay on script.',
      requestedBy: 'manager-a',
    });
    expect(requestRes.status).toBe(201);
    expect(requestRes.body.persona.approvalStatus).toBe('pending-manager-approval');

    const pendingRes = await request(app).get('/api/projects/ai-personas/pending-approval');
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.personas.map((p: { id: string }) => p.id)).toEqual(['persona-1']);

    const listRes = await request(app).get('/api/projects/project-1/ai-personas');
    expect(listRes.status).toBe(200);
    expect(listRes.body.personas).toHaveLength(1);

    const decisionRes = await request(app)
      .post('/api/projects/ai-personas/persona-1/decision')
      .send({ decision: 'approved', decidedBy: 'manager-b' });
    expect(decisionRes.status).toBe(200);
    expect(decisionRes.body.persona.approvalStatus).toBe('approved');
    expect(decisionRes.body.persona.approvedBy).toBe('manager-b');
  });

  it('blocks an online-session invite from using an AI persona that has not been manager-approved', async () => {
    const app = buildApp();
    await request(app).post('/api/projects').send({ id: 'project-1', name: 'Freelancer', createdBy: 'client-a' });
    await request(app).post('/api/projects/project-1/ai-personas').send({
      id: 'persona-1',
      name: 'Bot',
      purpose: 'purpose',
      instructions: 'instructions',
      requestedBy: 'manager-a',
    });

    await request(app).post('/api/outreach/prospects').send({
      id: 'prospect-1',
      planId: 'plan-1',
      platform: 'instagram',
      accountHandle: '@jane',
      matchScore: 92,
    });
    await request(app).post('/api/outreach/prospects/prospect-1/qualify');
    await request(app)
      .post('/api/outreach/prospects/prospect-1/platform-outreach')
      .send({ message: 'hi' });
    await request(app)
      .post('/api/outreach/prospects/prospect-1/convert-contact')
      .send({ email: 'jane@example.com' });
    await request(app)
      .post('/api/outreach/prospects/prospect-1/direct-outreach')
      .send({ channel: 'email', message: 'following up' });

    const blockedRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/online-session/invite')
      .send({ scheduledAt: Date.now(), script: 'script', aiPersonaId: 'persona-1' });
    expect(blockedRes.status).toBe(400);
    expect(blockedRes.body.error).toMatch(/not approved/);

    await request(app)
      .post('/api/projects/ai-personas/persona-1/decision')
      .send({ decision: 'approved', decidedBy: 'manager-b' });

    const allowedRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/online-session/invite')
      .send({ scheduledAt: Date.now(), script: 'script', aiPersonaId: 'persona-1' });
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.prospect.status).toBe('online-invited');
    expect(allowedRes.body.prospect.onlineSession.aiPersonaId).toBe('persona-1');
  });
});
