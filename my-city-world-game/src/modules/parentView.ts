import { ParentCitySummary, ParentPinConfig } from '../types/domain';

/**
 * Parent View (plan block 7): a PIN-gated, non-analytic summary of the
 * child's city. Default PIN is "1234" but is fully configurable per
 * family. If half or more of the residents carry a "hard" mood, a soft
 * nudge is produced encouraging the parent to talk with their child —
 * this is deliberately never a psychological profile or diagnosis.
 */
export const DEFAULT_PARENT_PIN = '1234';

const NUDGE_THRESHOLD = 0.5;

export class ParentPinRegistry {
  private configs = new Map<string, ParentPinConfig>();

  setPin(cityId: string, pin: string): ParentPinConfig {
    if (!/^\d{4,}$/.test(pin)) {
      throw new Error('Parent PIN must be at least 4 digits.');
    }
    const config: ParentPinConfig = { pin };
    this.configs.set(cityId, config);
    return config;
  }

  verify(cityId: string, attempt: string): boolean {
    const config = this.configs.get(cityId) ?? { pin: DEFAULT_PARENT_PIN };
    return config.pin === attempt;
  }
}

export function buildParentCitySummary(
  cityId: string,
  totals: { residents: number; buildings: number; events: number; hardMoodResidentRatio: number }
): ParentCitySummary {
  const summary: ParentCitySummary = {
    cityId,
    totalResidents: totals.residents,
    totalBuildings: totals.buildings,
    totalEvents: totals.events,
    hardMoodResidentRatio: totals.hardMoodResidentRatio,
  };
  if (totals.hardMoodResidentRatio >= NUDGE_THRESHOLD) {
    summary.softNudge = {
      fa: 'به‌نظر می‌رسه چند تا از ساکنای شهر بچه‌تون این روزها حس سختی دارن؛ شاید وقت خوبی باشه که یک گفت‌وگوی گرم و بدون قضاوت با او داشته باشید.',
      ar: 'يبدو أن بعض سكان مدينة طفلك يشعرون بمشاعر صعبة هذه الأيام؛ قد يكون هذا وقتاً مناسباً لحديث دافئ وبدون حكم معه.',
      en: 'It looks like several residents in your child\'s city are feeling a hard emotion lately — this might be a good moment for a warm, judgment-free chat with them.',
    };
  }
  return summary;
}
