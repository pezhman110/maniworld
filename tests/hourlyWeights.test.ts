import { DEFAULT_HOURLY_WEIGHTS, weightedExpectedFraction } from '../src/modules/hourlyWeights';

describe('hourlyWeights', () => {
  it('defines an hourly curve for every market', () => {
    const markets: Array<keyof typeof DEFAULT_HOURLY_WEIGHTS> = [
      'salon-women',
      'home-service',
      'business-buying',
      'business-selling',
      'investment',
    ];
    for (const market of markets) {
      expect(DEFAULT_HOURLY_WEIGHTS[market].length).toBeGreaterThan(0);
    }
  });

  it('returns 0 at the start of the working window and 1 at/after close', () => {
    expect(weightedExpectedFraction({ market: 'salon-women', currentHour: 10 })).toBeCloseTo(0, 5);
    expect(weightedExpectedFraction({ market: 'salon-women', currentHour: 22 })).toBeCloseTo(1, 5);
    expect(weightedExpectedFraction({ market: 'salon-women', currentHour: 23 })).toBeCloseTo(1, 5);
  });

  it('is monotonically non-decreasing through the day', () => {
    let previous = -1;
    for (let hour = 10; hour <= 22; hour += 0.5) {
      const fraction = weightedExpectedFraction({ market: 'salon-women', currentHour: hour });
      expect(fraction).toBeGreaterThanOrEqual(previous);
      previous = fraction;
    }
  });

  it('an evening-heavy market reaches less than the linear 50% fraction at the midpoint of the day', () => {
    // 10-22 window, midpoint = 16:00. Linear pacing would say 50%; the evening-heavy
    // curve should say meaningfully less, since most of the weight sits after 16:00.
    const fraction = weightedExpectedFraction({ market: 'salon-women', currentHour: 16 });
    expect(fraction).toBeLessThan(0.5);
  });

  it('falls back to linear pacing when no curve is supplied', () => {
    const fraction = weightedExpectedFraction({
      market: 'salon-women',
      currentHour: 16,
      curve: [],
    });
    expect(fraction).toBeCloseTo(0.5, 5);
  });
});
