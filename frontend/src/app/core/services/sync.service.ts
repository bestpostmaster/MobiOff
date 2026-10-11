import { inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Intervention, LocalIntervention, UpdateIntervention } from '../models/intervention';
import { InterventionApiService } from './intervention-api.service';
import { OfflineStorageService } from './offline-storage.service';
import { InterventionStore } from './intervention.store';
@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly api = inject(InterventionApiService);
  readonly store = inject(InterventionStore);
  private readonly storage = inject(OfflineStorageService);
  readonly busy = signal(false);
  readonly error = signal('');
  private started = false;
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      await this.store.hydrate();
      await this.synchronize(false);
    } catch {
      this.error.set('Stockage local indisponible. Autorisez IndexedDB pour utiliser la démo.');
    }
    setInterval(() => {
      if (!this.api.demoOffline()) void this.synchronize(false);
    }, 8000);
    window.addEventListener('online', () => void this.synchronize(false));
    window.addEventListener('offline', () => this.api.online.set(false));
  }
  simulateOffline(): void {
    if (this.busy()) return;
    this.api.demoOffline.set(true);
    this.api.online.set(false);
    this.store.toast('Mode démo hors ligne activé');
  }
  async restoreOnline(): Promise<void> {
    this.api.demoOffline.set(false);
    await this.synchronize();
  }
  private networkFailure(error: unknown): boolean {
    return !(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500;
  }
  private local(item: Intervention): LocalIntervention {
    return { ...item, syncState: 'SYNCED' };
  }
  async synchronize(manual = true): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const remote = await firstValueFrom(this.api.list());
      this.api.online.set(true);
      const changes = await this.storage.pending();
      let count = 0;
      for (const change of changes) {
        const item = this.store.items().find((i) => i.id === change.id);
        if (!item || (!manual && item.syncState === 'ERROR')) continue;
        this.store.replace({ ...item, syncState: 'SYNCING' });
        try {
          const updated = this.local(
            await firstValueFrom(this.api.update(change.id, change.payload)),
          );
          await this.storage.acknowledge(updated);
          this.store.replace(updated);
          count++;
        } catch (error) {
          if (this.networkFailure(error)) {
            this.api.online.set(false);
            this.store.replace({ ...item, syncState: 'PENDING' });
            throw error;
          }
          const failed: LocalIntervention = { ...item, syncState: 'ERROR' };
          await this.storage.cache([failed]);
          this.store.replace(failed);
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Cette intervention a été modifiée depuis votre dernière consultation.'
              : 'Mise à jour refusée par le serveur.',
          );
        }
      }
      const protectedIds = new Set(changes.map((c) => c.id));
      const fresh = remote.filter((i) => !protectedIds.has(i.id)).map((i) => this.local(i));
      await this.storage.cache(fresh);
      for (const item of fresh) this.store.replace(item);
      if (count > 0 || (manual && changes.length === 0))
        this.store.toast('Synchronisation terminée');
    } catch (error) {
      if (this.networkFailure(error)) {
        this.api.online.set(false);
        if (manual && !this.api.demoOffline())
          this.error.set('API inaccessible. Vos données locales restent disponibles.');
      } else this.error.set('Impossible de charger les interventions.');
    } finally {
      this.busy.set(false);
    }
  }
  async loadDetail(id: number): Promise<void> {
    if (this.busy() || this.store.items().find((i) => i.id === id)?.syncState !== 'SYNCED') return;
    this.busy.set(true);
    try {
      const item = this.local(await firstValueFrom(this.api.get(id)));
      this.api.online.set(true);
      await this.storage.cache([item]);
      this.store.replace(item);
    } catch (error) {
      if (this.networkFailure(error)) this.api.online.set(false);
      else this.error.set('Intervention introuvable sur le serveur.');
    } finally {
      this.busy.set(false);
    }
  }
  async save(
    item: LocalIntervention,
    values: Omit<UpdateIntervention, 'version'>,
  ): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    try {
      const previous = (await this.storage.pending()).find((c) => c.id === item.id);
      const payload: UpdateIntervention = {
        ...values,
        version: previous?.payload.version ?? item.version,
      };
      const local: LocalIntervention = { ...item, ...values, syncState: 'PENDING' };
      // The outbox and the visible record commit atomically before attempting HTTP.
      await this.storage.enqueue(local, { id: item.id, payload });
      this.store.replace(local);
      try {
        const updated = this.local(await firstValueFrom(this.api.update(item.id, payload)));
        this.api.online.set(true);
        await this.storage.acknowledge(updated);
        this.store.replace(updated);
        this.store.toast('Intervention enregistrée sur le serveur');
      } catch (error) {
        if (this.networkFailure(error)) {
          this.api.online.set(false);
          this.store.toast('Enregistré localement · Synchronisation en attente');
        } else {
          const failed: LocalIntervention = { ...local, syncState: 'ERROR' };
          await this.storage.cache([failed]);
          this.store.replace(failed);
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Cette intervention a été modifiée depuis votre dernière consultation.'
              : 'Mise à jour refusée par le serveur.',
          );
          return false;
        }
      }
      return true;
    } catch {
      this.error.set('Échec du stockage local. La modification n’a pas pu être enregistrée.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async discardConflict(id: number): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const item = this.local(await firstValueFrom(this.api.get(id)));
      await this.storage.acknowledge(item);
      this.store.replace(item);
      this.error.set('');
      this.api.online.set(true);
      this.store.toast('Version serveur chargée');
    } catch {
      this.error.set('Impossible de charger la version serveur.');
    } finally {
      this.busy.set(false);
    }
  }
}
