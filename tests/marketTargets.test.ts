import {
  computeMarketPacing,
  computeMarketPacingForAllMetrics,
  DEFAULT_MARKET_TARGETS,
  findTargetRule,
} from '../src/modules/marketTargets';

describe('marketTargets', () => {
  it('exposes the brief targets: 90-110 confirmed bookings/day for salon & home-service', () => {
    expect(findTargetRule('salon-women', 'confirmed-booking')).toEqual({
      market: 'salon-women',
      metric: 'confirmed-booking',
      minPerDay: 90,
      maxPerDay: 110,
    });
    expect(findTargetRule('home-service', 'confirmed-booking')).toEqual({
      market: 'home-service',
      metric: 'confirmed-booking',
      minPerDay: 90,
      maxPerDay: 110,
    });
  });

  it('exposes business-buying targets: 50-70 online sessions, 30-40 in-person meetings', () => {
    expect(findTargetRule('business-buying', 'online-session')).toMatchObject({ minPerDay: 50, maxPerDay: 70 });
    expect(findTargetRule('business-buying', 'in-person-meeting')).toMatchObject({ minPerDay: 30, maxPerDay: 40 });
  });

  it('exposes business-selling (30 confirmed online contacts) and investment (70 in-person, 70+ online) targets', () => {
    expect(findTargetRule('business-selling', 'online-contact')).toMatchObject({ minPerDay: 30, maxPerDay: 30 });
    expect(findTargetRule('investment', 'in-person-meeting')).toMatchObject({ minPerDay: 70, maxPerDay: 70 });
    expect(findTargetRule('investment', 'online-session')).toMatchObject({ minPerDay: 70, maxPerDay: Infinity });
  });

  it('returns undefined for a market/metric combination without a rule', () => {
    expect(findTargetRule('salon-women', 'online-contact')).toBeUndefined();
  });

  it('flags a market as behind pace when achieved is under the expected-by-now minimum', () => {
    // salon-women: 10-22 window (12h), min 90/day -> 7.5 expected per hour.
    const report = computeMarketPacing({
      market: 'salon-women',
      metric: 'confirmed-booking',
      achievedSoFar: 20,
      currentHour: 16, // 6 hours elapsed
    });

    expect(report.hoursElapsed).toBe(6);
    expect(report.hoursRemaining).toBe(6);
    expect(report.expectedByNowMin).toBeCloseTo(45, 5);
    expect(report.isBelowTarget).toBe(true);
    expect(report.onTrackForMin).toBe(false);
    expect(report.remainingNeededForMin).toBe(70);
    expect(report.requiredPerRemainingHour).toBeCloseTo(70 / 6, 5);
  });

  it('flags a market as on-track when achieved meets/exceeds the expected-by-now minimum', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 15,
      currentHour: 15, // 9-21 window, 6 elapsed of 12 -> expected 15
    });

    expect(report.onTrackForMin).toBe(true);
    expect(report.isBelowTarget).toBe(false);
  });

  it('flags isAboveMax once achieved exceeds the max target', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 31,
      currentHour: 21,
    });
    expect(report.isAboveMax).toBe(true);
  });

  it('clamps elapsed/remaining hours before opening and after closing', () => {
    const beforeOpen = computeMarketPacing({
      market: 'investment',
      metric: 'in-person-meeting',
      achievedSoFar: 0,
      currentHour: 7,
    });
    expect(beforeOpen.hoursElapsed).toBe(0);
    expect(beforeOpen.hoursRemaining).toBe(12);

    const afterClose = computeMarketPacing({
      market: 'investment',
      metric: 'in-person-meeting',
      achievedSoFar: 70,
      currentHour: 23,
    });
    expect(afterClose.hoursElapsed).toBe(12);
    expect(afterClose.hoursRemaining).toBe(0);
    expect(afterClose.requiredPerRemainingHour).toBe(0);
  });

  it('throws when no target rule exists for the requested market/metric', () => {
    expect(() =>
      computeMarketPacing({ market: 'salon-women', metric: 'online-contact', achievedSoFar: 0, currentHour: 12 })
    ).toThrow(/No target rule defined/);
  });

  it('computes pacing for every configured metric of a market at once', () => {
    const reports = computeMarketPacingForAllMetrics({
      market: 'business-buying',
      achievedByMetric: { 'online-session': 20, 'in-person-meeting': 10 },
      currentHour: 15,
    });

    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.metric).sort()).toEqual(['in-person-meeting', 'online-session']);
  });

  it('DEFAULT_MARKET_TARGETS covers every market mentioned in the brief', () => {
    const markets = new Set(DEFAULT_MARKET_TARGETS.map((r) => r.market));
    expect(markets).toEqual(
      new Set(['salon-women', 'home-service', 'business-buying', 'business-selling', 'investment'])
    );
  });
});
