import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { defer, Observable, throwError, timeout } from 'rxjs';
import { Intervention, UpdateIntervention } from '../models/intervention';
@Injectable({ providedIn: 'root' })
export class InterventionApiService {
  private readonly http = inject(HttpClient);
  readonly demoOffline = signal(false);
  readonly online = signal(false);
  private request<T>(call: () => Observable<T>): Observable<T> {
    return defer(() =>
      this.demoOffline()
        ? throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Mode démo hors ligne' }))
        : call(),
    ).pipe(timeout(3500));
  }
  list(): Observable<Intervention[]> {
    return this.request(() => this.http.get<Intervention[]>('/api/interventions'));
  }
  get(id: number): Observable<Intervention> {
    return this.request(() => this.http.get<Intervention>(`/api/interventions/${id}`));
  }
  update(id: number, payload: UpdateIntervention): Observable<Intervention> {
    return this.request(() => this.http.put<Intervention>(`/api/interventions/${id}`, payload));
  }
}
