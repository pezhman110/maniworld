import request from 'supertest';
import { createApp } from '../src/server/app';

describe('investor acquisition API', () => {
  it('lists tools, evaluates a lead, registers it, and reports metrics', async () => {
    const app = createApp();

    const toolsRes = await request(app).get('/api/investor-acquisition/tools');
    expect(toolsRes.status).toBe(200);
    expect(toolsRes.body.tools).toHaveLength(20);

    const evaluateRes = await request(app).post('/api/investor-acquisition/signals/evaluate').send({
      source: 'inbound_form',
      sourceProof: 'website form consent id wf-1',
      consentGranted: true,
      message: 'کجا سرمایه بذارم برای درآمد غیرفعال',
      investorAmount: 150000,
      channels: ['email'],
    });
    expect(evaluateRes.status).toBe(200);
    expect(evaluateRes.body.evaluation.complianceStatus).toBe('allowed');

    const createRes = await request(app).post('/api/investor-acquisition/leads').send({
      id: 'api-lead-1',
      source: 'public_business_profile',
      sourceProof: 'Public company page lists business email',
      publicBusinessContact: true,
      message: 'میخوام بیزینس بخرم فرانچایز',
      channels: ['linkedin'],
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.lead.evaluation.triggeredIntent).toBe('business-buying');

    const metricsRes = await request(app).get('/api/investor-acquisition/metrics');
    expect(metricsRes.body.metrics.totalLeads).toBe(1);
    expect(metricsRes.body.metrics.allowed).toBe(1);
  });

  it('returns blocked status for unsafe source types and creates all-tool playbooks', async () => {
    const app = createApp();

    const blockedRes = await request(app).post('/api/investor-acquisition/leads').send({
      source: 'purchased_list',
      sourceProof: 'purchased list from broker',
      consentGranted: true,
      message: 'سرمایهگذاری مطمئن',
    });
    expect(blockedRes.status).toBe(201);
    expect(blockedRes.body.lead.evaluation.complianceStatus).toBe('blocked');

    const playbookRes = await request(app).post('/api/investor-acquisition/playbooks').send({
      name: 'Investor stage 1',
      objective: 'Run all compliant targeting methods',
      channels: ['website', 'whatsapp'],
    });
    expect(playbookRes.status).toBe(201);
    expect(playbookRes.body.playbook.toolIds).toHaveLength(20);
    expect(playbookRes.body.playbook.complianceRules.join(' ')).toMatch(/No anti-detection/);
  });
});
