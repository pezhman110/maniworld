import { LocaleString, NotificationKind, PushNotificationPayload } from '../types/domain';

/**
 * Notifications (extra request): "your city is alive, come back!" nudges
 * and other events (friend visited, daily leaderboard result, new
 * mission), modeled as a generic push-payload shape a real OS/app push
 * delivery layer (web push / APNs / FCM) can consume later — actual
 * delivery is out of scope here.
 */
const DEFAULT_TITLES: Record<NotificationKind, LocaleString> = {
  'city-is-alive-nudge': {
    fa: 'شهر زندهٔ تو منتظرته!',
    ar: 'مدينتك الحية بانتظارك!',
    en: 'Your living city is waiting for you!',
  },
  'friend-visited': {
    fa: 'یک دوست به شهرت سر زد!',
    ar: 'زار صديق مدينتك!',
    en: 'A friend visited your city!',
  },
  'daily-leaderboard-result': {
    fa: 'نتیجهٔ امروز جدول شهرها آماده‌ست!',
    ar: 'نتيجة لوحة المدن اليوم جاهزة!',
    en: "Today's city leaderboard result is ready!",
  },
  'new-mission': {
    fa: 'یک ماموریت جدید برات اومده!',
    ar: 'مهمة جديدة بانتظارك!',
    en: 'A new mission is waiting for you!',
  },
};

export class NotificationRegistry {
  private notifications = new Map<string, PushNotificationPayload>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `notif_${Date.now()}_${this.sequence}`;
  }

  schedule(childId: string, kind: NotificationKind, body: LocaleString, scheduledFor: number): PushNotificationPayload {
    const notification: PushNotificationPayload = {
      id: this.nextId(),
      childId,
      kind,
      title: DEFAULT_TITLES[kind],
      body,
      scheduledFor,
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  /** "Come back, your city is alive" nudge after a period of inactivity. */
  scheduleComeBackNudge(childId: string, lastActiveAt: number, inactivityThresholdMs: number = 24 * 60 * 60 * 1000, now: number = Date.now()): PushNotificationPayload | undefined {
    if (now - lastActiveAt < inactivityThresholdMs) {
      return undefined;
    }
    return this.schedule(childId, 'city-is-alive-nudge', {
      fa: 'بیا سریع شهرت رو ببین، خیلی چیزا برات اتفاق افتاده!',
      ar: 'تعال بسرعة لرؤية مدينتك، الكثير حدث لها!',
      en: 'Come back quickly and check on your city — so much has happened!',
    }, now);
  }

  markSent(notificationId: string, sentAt: number = Date.now()): PushNotificationPayload {
    const notification = this.getById(notificationId);
    notification.sentAt = sentAt;
    return notification;
  }

  getById(notificationId: string): PushNotificationPayload {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Unknown notification id: ${notificationId}`);
    }
    return notification;
  }

  pendingFor(childId: string): PushNotificationPayload[] {
    return [...this.notifications.values()].filter((notification) => notification.childId === childId && !notification.sentAt);
  }
}
