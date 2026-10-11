import { Injectable } from '@angular/core';
import { LocalIntervention, PendingChange } from '../models/intervention';
@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  private readonly database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mobioff-demo', 1);
    request.onupgradeneeded = () => {
      for (const name of ['interventions', 'pendingChanges'])
        request.result.createObjectStore(name, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
  private async readAll<T>(name: string): Promise<T[]> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }
  all(): Promise<LocalIntervention[]> {
    return this.readAll('interventions');
  }
  pending(): Promise<PendingChange[]> {
    return this.readAll('pendingChanges');
  }
  private async write(action: (tx: IDBTransaction) => void): Promise<void> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['interventions', 'pendingChanges'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Écriture locale annulée'));
      action(tx);
    });
  }
  cache(items: LocalIntervention[]): Promise<void> {
    return this.write((tx) => {
      for (const item of items) tx.objectStore('interventions').put(item);
    });
  }
  enqueue(item: LocalIntervention, change: PendingChange): Promise<void> {
    return this.write((tx) => {
      tx.objectStore('interventions').put(item);
      tx.objectStore('pendingChanges').put(change);
    });
  }
  acknowledge(item: LocalIntervention): Promise<void> {
    return this.write((tx) => {
      tx.objectStore('interventions').put(item);
      tx.objectStore('pendingChanges').delete(item.id);
    });
  }
}
