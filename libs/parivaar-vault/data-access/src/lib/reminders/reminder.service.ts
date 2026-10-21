import { Injectable, inject } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { documentTitle, type ExpiryReminder } from '@pranav/shared-models';
import { hashString, parseIsoDate } from '@pranav/shared-util';
import { PlatformService } from '../platform/platform.service';

const LEAD_DAYS = [30, 7];

/** Schedules local notifications for documents that are about to expire (native only). */
@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly platform = inject(PlatformService);

  get supportsNotifications(): boolean {
    return this.platform.isNative;
  }

  /** Re-syncs the native notification schedule with the current reminders. */
  async sync(reminders: ExpiryReminder[]): Promise<void> {
    if (!this.supportsNotifications) return;
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }

      const now = Date.now();
      const notifications = reminders.flatMap(({ document, expiryDate }) => {
        const expiry = parseIsoDate(expiryDate);
        if (!expiry) return [];
        return LEAD_DAYS.flatMap((lead) => {
          const at = new Date(expiry);
          at.setDate(at.getDate() - lead);
          at.setHours(9, 0, 0, 0);
          if (at.getTime() <= now) return [];
          return [
            {
              id:
                (hashString(document.id) % 1_000_000) * 10 +
                LEAD_DAYS.indexOf(lead),
              title: `${documentTitle(document)} expires in ${lead} days`,
              body: 'Open Parivaar Vault to review or renew this document.',
              schedule: { at },
              extra: { documentId: document.id },
            },
          ];
        });
      });
      if (notifications.length)
        await LocalNotifications.schedule({ notifications });
    } catch {
      // Notifications are best-effort; never block the UI on them.
    }
  }
}
