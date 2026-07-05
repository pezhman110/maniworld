import { Locale } from '../types/domain';

/**
 * i18n module.
 *
 * The whole team is English-speaking, so English is the default locale;
 * Farsi is kept available via the same dictionary/lookup so no UI text is
 * ever hardcoded in one language only. Add new keys here rather than
 * inlining strings in dashboard/report-rendering code.
 */

export const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    'dashboard.title': 'Sales Pacing Dashboard',
    'dashboard.market': 'Market',
    'dashboard.branch': 'Branch',
    'dashboard.rep': 'Sales rep',
    'dashboard.achievedSoFar': 'Achieved so far',
    'dashboard.expectedByNow': 'Expected by now',
    'dashboard.floorTarget': 'Floor target',
    'dashboard.stretchTarget': 'Stretch target',
    'dashboard.onTrack': 'On track',
    'dashboard.belowTarget': 'Below target',
    'dashboard.aboveMax': 'Above stretch target',
    'dashboard.missed': 'Missed',
    'dashboard.noCap': 'No cap',
    'dashboard.requiredMultiplier': 'Required speed-up for the rest of the day',
    'dashboard.runRateProjection': 'Projected end-of-day total',
    'dashboard.vsYesterday': 'vs. yesterday',
    'dashboard.vsLastWeek': 'vs. last week',
    'dashboard.vsSameDayLastMonth': 'vs. same day last month',
    'dashboard.alertRed': 'Behind pace — needs attention',
    'dashboard.alertBlue': 'Ahead of pace — spare capacity',
    'dashboard.funnel': 'Funnel',
    'dashboard.channelBreakdown': 'Channel breakdown',
    'dashboard.costPerLead': 'Cost per lead',
    'dashboard.costPerBooking': 'Cost per booking',
    'dashboard.trend7Day': '7-day trend',
    'dashboard.exportCsv': 'Export CSV',
    'dashboard.autoRefresh': 'Auto-refresh',
    'dashboard.timezone': 'Timezone',
    'dashboard.language': 'Language',
  },
  fa: {
    'dashboard.title': 'داشبورد سرعت‌سنج فروش',
    'dashboard.market': 'بازار',
    'dashboard.branch': 'شعبه',
    'dashboard.rep': 'فروشنده',
    'dashboard.achievedSoFar': 'تا این لحظه',
    'dashboard.expectedByNow': 'انتظار تا این لحظه',
    'dashboard.floorTarget': 'هدف کف',
    'dashboard.stretchTarget': 'هدف کششی',
    'dashboard.onTrack': 'در مسیر',
    'dashboard.belowTarget': 'زیر هدف',
    'dashboard.aboveMax': 'بالای هدف کششی',
    'dashboard.missed': 'محقق‌نشده',
    'dashboard.noCap': 'بدون سقف',
    'dashboard.requiredMultiplier': 'سرعت لازم برای باقی روز',
    'dashboard.runRateProjection': 'پیش‌بینی پایان روز',
    'dashboard.vsYesterday': 'نسبت به دیروز',
    'dashboard.vsLastWeek': 'نسبت به هفته قبل',
    'dashboard.vsSameDayLastMonth': 'نسبت به همین روز ماه قبل',
    'dashboard.alertRed': 'عقب از برنامه — نیاز به توجه',
    'dashboard.alertBlue': 'جلوتر از برنامه — ظرفیت آزاد',
    'dashboard.funnel': 'قیف فروش',
    'dashboard.channelBreakdown': 'تفکیک کانال',
    'dashboard.costPerLead': 'هزینه هر لید',
    'dashboard.costPerBooking': 'هزینه هر رزرو',
    'dashboard.trend7Day': 'روند ۷ روزه',
    'dashboard.exportCsv': 'خروجی CSV',
    'dashboard.autoRefresh': 'رفرش خودکار',
    'dashboard.timezone': 'منطقه زمانی',
    'dashboard.language': 'زبان',
  },
};

/** Translates `key` into `locale`, falling back to English then the raw key. */
export function t(key: string, locale: Locale = 'en'): string {
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
