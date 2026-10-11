export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type SyncState = 'SYNCED' | 'PENDING' | 'SYNCING' | 'ERROR';
export interface Intervention {
  id: number;
  type: string;
  client: string;
  address: string;
  currentEquipment: string;
  newEquipment: string;
  comment: string;
  status: Status;
  priority: 'HIGH' | 'NORMAL';
  version: number;
}
export interface LocalIntervention extends Intervention {
  syncState: SyncState;
}
export interface UpdateIntervention {
  newEquipment: string;
  comment: string;
  status: Status;
  version: number;
}
export interface PendingChange {
  id: number;
  payload: UpdateIntervention;
}
export const statusLabels: Record<Status, string> = {
  TODO: 'À réaliser',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
};
export const syncLabels: Record<SyncState, string> = {
  SYNCED: 'Synchronisé',
  PENDING: 'Synchronisation en attente',
  SYNCING: 'Synchronisation…',
  ERROR: 'Conflit à résoudre',
};
