import { ComparisonPeriod, DeltaComparison } from '../types/domain';

/**
 * Comparison module — the "2x / half" layer.
 *
 * Turns a raw number into an actionable comparison against yesterday, last
 * week, or the same day last month, e.g. "▲ 2.0x yesterday" or
 * "▼ 0.5x (half of) last week". Division-by-zero never produces `Infinity`
 * or `NaN`: when the previous value is 0, `ratio` is `null` and the label
 * falls back to an absolute description.
 */

const PERIOD_LABEL: Record<ComparisonPeriod, string> = {
  yesterday: 'yesterday',
  'last-week': 'last week',
  'same-day-last-month': 'same day last month',
};

function formatRatioLabel(ratio: number, periodLabel: string): string {
  if (ratio >= 2) return `${ratio.toFixed(1)}x ${periodLabel}`;
  if (ratio <= 0.5 && ratio > 0) return `${ratio.toFixed(1)}x (half or less of) ${periodLabel}`;
  return `${ratio.toFixed(1)}x ${periodLabel}`;
}

export function computeDeltaComparison(params: {
  period: ComparisonPeriod;
  currentValue: number;
  previousValue: number;
}): DeltaComparison {
  const { period, currentValue, previousValue } = params;
  const periodLabel = PERIOD_LABEL[period];

  let ratio: number | null = null;
  let label: string;
  let direction: 'up' | 'down' | 'flat';

  if (previousValue === 0) {
    ratio = null;
    direction = currentValue > 0 ? 'up' : 'flat';
    label = currentValue > 0 ? `new activity vs. ${periodLabel} (was 0)` : `flat vs. ${periodLabel} (both 0)`;
  } else {
    ratio = currentValue / previousValue;
    direction = currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'flat';
    label = formatRatioLabel(ratio, periodLabel);
  }

  return { period, previousValue, currentValue, ratio, direction, label };
}

export function computeAllDeltaComparisons(params: {
  currentValue: number;
  yesterdayValue: number;
  lastWeekValue: number;
  sameDayLastMonthValue: number;
}): DeltaComparison[] {
  return [
    computeDeltaComparison({ period: 'yesterday', currentValue: params.currentValue, previousValue: params.yesterdayValue }),
    computeDeltaComparison({ period: 'last-week', currentValue: params.currentValue, previousValue: params.lastWeekValue }),
    computeDeltaComparison({
      period: 'same-day-last-month',
      currentValue: params.currentValue,
      previousValue: params.sameDayLastMonthValue,
    }),
  ];
}
