import { CoachTip, CoachTriggerAction, LocaleString, MANI_LITTLE_ARCHITECT } from '../types/domain';

/**
 * Coach Mani (plan block 6): step-by-step, motivational guidance shown
 * after every meaningful action — never static/dead-end buttons. Uses the
 * dedicated "little architect" Mani mascot variant for this module.
 */
const DEFAULT_MESSAGES: Record<CoachTriggerAction, LocaleString> = {
  'built-zone': {
    fa: 'عالی بود! یک منطقهٔ جدید ساختی. حالا بریم داخلش یک ساختمان بسازیم؟',
    ar: 'رائع! لقد بنيت منطقة جديدة. هل ندخل ونبني مبنى الآن؟',
    en: 'Awesome! You built a new zone. Want to go inside and add a building?',
  },
  'built-building': {
    fa: 'چه ساختمان قشنگی! دوست داری چند طبقه داشته باشه؟',
    ar: 'يا له من مبنى جميل! كم طابقاً تريد أن يكون له؟',
    en: 'What a beautiful building! How many floors should it have?',
  },
  'built-room': {
    fa: 'اتاق ساخته شد! حالا بیا وسایلش رو بچینیم.',
    ar: 'تم بناء الغرفة! لنرتب الأثاث فيها الآن.',
    en: 'Room built! Let\'s arrange its furniture now.',
  },
  'placed-item': {
    fa: 'قشنگ شد! می‌خوای یه چیز دیگه هم اضافه کنی؟',
    ar: 'أصبح جميلاً! هل تريد إضافة شيء آخر؟',
    en: 'Looking great! Want to add something else?',
  },
  'added-resident': {
    fa: 'یک ساکن جدید به شهرت اومد! حالش چطوره؟',
    ar: 'انضم ساكن جديد إلى مدينتك! كيف حاله؟',
    en: 'A new resident joined your city! How are they feeling?',
  },
  'added-event': {
    fa: 'چه اتفاق قشنگی! بیا یه صحنهٔ کارتونی ازش بسازیم.',
    ar: 'يا له من حدث جميل! لنصنع مشهداً كرتونياً له.',
    en: 'What a lovely event! Let\'s turn it into a cartoon scene.',
  },
  'shared-city': {
    fa: 'شهرت رو با بقیه به اشتراک گذاشتی، آفرین!',
    ar: 'شاركت مدينتك مع الآخرين، أحسنت!',
    en: 'You shared your city with others, well done!',
  },
  'idle-return': {
    fa: 'دلم برات تنگ شده بود! شهرت منتظرته.',
    ar: 'اشتقت إليك! مدينتك بانتظارك.',
    en: 'I missed you! Your city has been waiting.',
  },
};

export class CoachManiRegistry {
  private tips = new Map<string, CoachTip>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `tip_${Date.now()}_${this.sequence}`;
  }

  tipFor(trigger: CoachTriggerAction): CoachTip {
    const tip: CoachTip = {
      id: this.nextId(),
      trigger,
      message: DEFAULT_MESSAGES[trigger],
      mascot: MANI_LITTLE_ARCHITECT,
    };
    this.tips.set(tip.id, tip);
    return tip;
  }

  history(): CoachTip[] {
    return [...this.tips.values()];
  }
}
