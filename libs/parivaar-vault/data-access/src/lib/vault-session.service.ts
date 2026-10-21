import { Injectable, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { VaultLockService } from './lock/vault-lock.service';
import { ReminderService } from './reminders/reminder.service';
import { DocumentsStore } from './stores/documents.store';
import { MembersStore } from './stores/members.store';

/**
 * Loads the stores when the vault unlocks, clears them when it locks and keeps
 * native reminders in sync. Inject once from the root component to start it.
 */
@Injectable({ providedIn: 'root' })
export class VaultSessionService {
  private readonly lock = inject(VaultLockService);
  private readonly router = inject(Router);
  private readonly members = inject(MembersStore);
  private readonly documents = inject(DocumentsStore);
  private readonly reminders = inject(ReminderService);

  constructor() {
    effect(() => {
      const status = this.lock.status();
      untracked(() => {
        if (status === 'unlocked') void this.loadAll();
        if (status === 'locked' || status === 'uninitialized')
          this.clearAll(status === 'locked');
      });
    });
    effect(() => {
      const reminders = this.documents.reminders();
      if (this.documents.loaded()) void this.reminders.sync(reminders);
    });
  }

  private async loadAll(): Promise<void> {
    await Promise.all([this.members.load(), this.documents.load()]);
  }

  private clearAll(redirect: boolean): void {
    this.members.clear();
    this.documents.clear();
    if (redirect && !this.router.url.startsWith('/auth')) {
      void this.router.navigate(['/auth'], {
        queryParams: { returnUrl: this.router.url },
      });
    }
  }
}
