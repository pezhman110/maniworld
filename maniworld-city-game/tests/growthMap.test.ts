import { GrowthMapRegistry } from '../src/modules/growthMap';

describe('GrowthMapRegistry', () => {
  it('records skill events and builds a weekly report', () => {
    const registry = new GrowthMapRegistry();
    registry.record('c1', 'problem-solving', 100);
    registry.record('c1', 'problem-solving', 150);
    registry.record('c1', 'kindness', 200);
    registry.record('c1', 'kindness', 5000); // outside the period

    const report = registry.buildReport('c1', 0, 1000);
    expect(report.counts['problem-solving']).toBe(2);
    expect(report.counts.kindness).toBe(1);
    expect(report.counts.creativity).toBe(0);
  });

  it('does not mix skill events between children', () => {
    const registry = new GrowthMapRegistry();
    registry.record('c1', 'collaboration', 10);
    registry.record('c2', 'collaboration', 10);
    expect(registry.eventsForChild('c1')).toHaveLength(1);
  });
});
