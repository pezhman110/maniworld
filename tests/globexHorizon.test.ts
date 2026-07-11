import request from 'supertest';
import { GlobexHorizonRegistry } from '../src/modules/globexHorizon';
import { createApp } from '../src/server/app';

describe('globexHorizon', () => {
  it('builds the complete 37-target mission pack with revenue and operating model', () => {
    const registry = new GlobexHorizonRegistry();
    const missionPack = registry.getMissionPack();

    expect(missionPack.name).toBe('Globex Horizon Industrial Sales System');
    expect(missionPack.monthlyRevenueTargetAed).toBe(1_000_000);
    expect(missionPack.investmentGoalAed).toBe(20_000_000);
    expect(missionPack.revenueLines.map((line) => line.monthlyTargetAed).reduce((sum, value) => sum + value, 0)).toBe(
      1_000_000
    );
    expect(missionPack.groups).toHaveLength(6);
    expect(missionPack.groups.flatMap((group) => group.targets)).toHaveLength(37);
    expect(registry.metrics().readiness).toBe('ready');
  });

  it('replaces unsafe scraping/fake/private tactics with compliant acquisition paths', () => {
    const registry = new GlobexHorizonRegistry();

    expect(registry.evaluateSource('Instagram followers scraping').status).toBe('replaced');
    expect(registry.evaluateSource('fake accounts with anti-detection').status).toBe('blocked');
    expect(registry.evaluateSource('official Meta lead form with consent').status).toBe('allowed');

    const targets = registry.listTargets();
    expect(targets[0].blockedTactics.join(' ')).toMatch(/fake or purchased social accounts/);
    expect(targets[0].safeAcquisitionPath.join(' ')).toMatch(/official APIs|lead forms/i);
  });

  it('records a daily report and raises KPI alerts when targets are missed', () => {
    const registry = new GlobexHorizonRegistry();
    const report = registry.recordDailyReport({
      id: 'day-1',
      date: '2026-07-11',
      discoveredLeads: 400,
      aiQualifiedLeads: 120,
      salonBookings: 80,
      successfulCalls: 90,
      bridalContracts: 2,
      freelancerInterviews: 12,
      investorMeetings: 1,
      revenueAed: 10_000,
      averageResponseMinutes: 11,
      customerSatisfaction: 4.2,
      now: 100,
    });

    expect(report.progressToDailyRevenueTarget).toBe(30);
    expect(report.alerts.join(' ')).toMatch(/Discovery below 700/);
    expect(registry.metrics().latestAlerts).toBeGreaterThan(0);
  });

  it('exposes Globex Horizon APIs end-to-end', async () => {
    const app = createApp({});

    const missionRes = await request(app).get('/api/globex-horizon/mission-pack');
    expect(missionRes.status).toBe(200);
    expect(missionRes.body.missionPack.groups).toHaveLength(6);

    const targetsRes = await request(app).get('/api/globex-horizon/targets').query({ groupId: 'investment' });
    expect(targetsRes.status).toBe(200);
    expect(targetsRes.body.targets).toHaveLength(4);

    const evalRes = await request(app).post('/api/globex-horizon/source-evaluation').send({ source: 'purchased list' });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.evaluation.status).toBe('blocked');

    const reportRes = await request(app).post('/api/globex-horizon/daily-reports').send({
      date: '2026-07-11',
      discoveredLeads: 800,
      aiQualifiedLeads: 350,
      salonBookings: 130,
      successfulCalls: 220,
      bridalContracts: 6,
      freelancerInterviews: 32,
      investorMeetings: 4,
      revenueAed: 40_000,
      averageResponseMinutes: 4,
      customerSatisfaction: 4.9,
    });
    expect(reportRes.status).toBe(201);
    expect(reportRes.body.report.alerts).toHaveLength(0);

    const manifestRes = await request(app).get('/api/globex-horizon/deployment-manifest');
    expect(manifestRes.status).toBe(200);
    expect(manifestRes.body.manifest.windowsCommands.join(' ')).toContain('npm start');
  });
});
