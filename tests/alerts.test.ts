import { computeMarketPacing } from '../src/modules/marketTargets';
import { computeThresholdAlert } from '../src/modules/alerts';

describe('alerts', () => {
  it('raises a red alert when achieved falls below 50% of the expected-by-now floor line', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 2, // expectedByNowMin ~16 at hour 15 -> well under 50%
      currentHour: 15,
    });

    const alert = computeThresholdAlert(report);
    expect(alert.level).toBe('red');
  });

  it('raises a blue flag when achieved exceeds the stretch (max) target', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 35,
      currentHour: 15,
    });

    const alert = computeThresholdAlert(report);
    expect(alert.level).toBe('blue');
  });

  it('reports no alert within normal pacing range', () => {
    const report = computeMarketPacing({
      market: 'business-selling',
      metric: 'online-contact',
      achievedSoFar: 16,
      currentHour: 15,
    });

    const alert = computeThresholdAlert(report);
    expect(alert.level).toBe('none');
  });
});
