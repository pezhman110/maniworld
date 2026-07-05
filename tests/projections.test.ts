import { computeMarketPacing } from '../src/modules/marketTargets';
import { computeRequiredMultiplier, computeRunRateProjection } from '../src/modules/projections';

describe('projections', () => {
  it('projects end-of-day total from the current rate and remaining hours', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 12,
      currentHour: 15, // 9-21 window: 6 hours elapsed, 6 remaining
    });

    const projection = computeRunRateProjection(report);
    expect(projection.currentRatePerHour).toBeCloseTo(2, 5);
    expect(projection.projectedAdditional).toBeCloseTo(12, 5);
    expect(projection.projectedEndOfDay).toBeCloseTo(24, 5);
    expect(projection.projectedPercentOfMin).toBeCloseTo(80, 5);
  });

  it('computes the multiplier required for the rest of the day to still hit the floor', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 10,
      currentHour: 15, // rate so far = 10/6, remaining need = 20 over 6h -> required rate = 20/6
    });

    const result = computeRequiredMultiplier(report);
    expect(result.currentRatePerHour).toBeCloseTo(10 / 6, 5);
    expect(result.requiredRatePerHour).toBeCloseTo(20 / 6, 5);
    expect(result.multiplier).toBeCloseTo(2, 5);
    expect(result.status).toBe('needs-boost');
  });

  it('reports on-track when the required multiplier is at or below 1x', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 20,
      currentHour: 15,
    });

    const result = computeRequiredMultiplier(report);
    expect(result.status).toBe('on-track');
  });

  it('never returns Infinity: a zero current rate with remaining need reports multiplier null + needs-boost', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 0,
      currentHour: 15,
    });

    const result = computeRequiredMultiplier(report);
    expect(result.multiplier).toBeNull();
    expect(result.status).toBe('needs-boost');
  });

  it('reports "missed" (not Infinity) once time is up and the floor was not reached', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 10,
      currentHour: 22, // window closed
    });

    const result = computeRequiredMultiplier(report);
    expect(result.multiplier).toBeNull();
    expect(result.status).toBe('missed');
  });
});
