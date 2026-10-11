import { computed, inject, Injectable, signal } from '@angular/core';
import { LocalIntervention } from '../models/intervention';
import { OfflineStorageService } from './offline-storage.service';
@Injectable({ providedIn: 'root' })
export class InterventionStore {
  private readonly storage = inject(OfflineStorageService);
  readonly items = signal<LocalIntervention[]>([]);
  readonly ready = signal(false);
  readonly notice = signal('');
  readonly pendingCount = computed(
    () => this.items().filter((i) => i.syncState !== 'SYNCED').length,
  );
  readonly completedCount = computed(() => this.items().filter((i) => i.status === 'DONE').length);
  async hydrate(): Promise<void> {
    this.items.set(await this.storage.all());
    this.ready.set(true);
  }
  replace(item: LocalIntervention): void {
    this.items.update((items) =>
      items.some((i) => i.id === item.id)
        ? items.map((i) => (i.id === item.id ? item : i))
        : [...items, item],
    );
  }
  toast(message: string): void {
    this.notice.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.notice.set(''), 6500);
  }
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
}
