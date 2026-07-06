import { DashboardService } from '../src/modules/dashboard';
import { ChildProfileRegistry } from '../src/modules/childProfile';

describe('DashboardService', () => {
  it('does not report a transition on the very first dashboard check', () => {
    const dashboard = new DashboardService();
    const profiles = new ChildProfileRegistry();
    const child = profiles.create({
      displayName: 'Sara',
      birthDate: '2019-01-01', // 7 years old as of 2026-07-06
      parentContactId: 'parent_1',
    });

    const event = dashboard.checkForAgeBandTransition(child, new Date('2026-07-06'));
    expect(event).toBeUndefined();
  });

  it('detects an age-band transition and unlocks the next tier of skills', () => {
    const dashboard = new DashboardService();
    const profiles = new ChildProfileRegistry();
    const child = profiles.create({
      displayName: 'Ali',
      birthDate: '2016-07-01',
      parentContactId: 'parent_1',
    });

    // First check: age 9 (kids-6-9), establishes baseline band.
    const firstCheck = dashboard.checkForAgeBandTransition(child, new Date('2026-06-30'));
    expect(firstCheck).toBeUndefined();

    // Second check: birthday just passed, now age 10 -> tweens-10-12.
    const transition = dashboard.checkForAgeBandTransition(child, new Date('2026-07-02'));
    expect(transition).toBeDefined();
    expect(transition?.fromBandId).toBe('kids-6-9');
    expect(transition?.toBandId).toBe('tweens-10-12');
    expect(transition?.message).toContain('leveled up');
    expect(transition?.newlyUnlockedSkillIds).toContain('verbal-conflict-resolution');
    // baseline skills should NOT be listed again as "newly" unlocked
    expect(transition?.newlyUnlockedSkillIds).not.toContain('greet-and-introduce');
  });

  it('unlockedSkillsFor returns the cumulative skill set for the child current age', () => {
    const dashboard = new DashboardService();
    const profiles = new ChildProfileRegistry();
    const child = profiles.create({
      displayName: 'Mina',
      birthDate: '2010-01-01', // 16 by 2026
      parentContactId: 'parent_1',
    });

    const skills = dashboard.unlockedSkillsFor(child, new Date('2026-07-06'));
    const ids = skills.map((s) => s.id);
    expect(ids).toContain('greet-and-introduce'); // baseline still included
    expect(ids).toContain('interview-and-presentation'); // most advanced tier included
  });

  it('buildParentReport summarizes mastered vs in-progress skills with home practice tips', () => {
    const dashboard = new DashboardService();
    const profiles = new ChildProfileRegistry();
    const child = profiles.create({
      displayName: 'Nina',
      birthDate: '2019-01-01',
      parentContactId: 'parent_1',
    });

    // Master one skill to gold (6 successes), leave another at bronze.
    for (let i = 0; i < 6; i += 1) {
      dashboard.engine.recordAttempt(child.id, 'greet-and-introduce', 'success');
    }
    dashboard.engine.recordAttempt(child.id, 'active-listening', 'success');

    const report = dashboard.buildParentReport(child, new Date('2026-07-06'));
    expect(report.skillsMastered.map((s) => s.skillId)).toContain('greet-and-introduce');
    const inProgressIds = report.skillsInProgress.map((s) => s.skillId);
    expect(inProgressIds).toContain('active-listening');
    expect(inProgressIds).not.toContain('greet-and-introduce');
    expect(report.homePracticeSuggestions.some((tip) => tip.includes('Active Listening'))).toBe(true);
    expect(report.homePracticeSuggestions.length).toBeGreaterThan(0);
  });
});
