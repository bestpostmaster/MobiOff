import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SyncService } from './core/services/sync.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <a routerLink="/" class="brand" aria-label="MobiOff Demo, accueil"
          ><span class="brand-icon">⌖</span
          ><span>MobiOff <em>Demo</em><small>Interventions terrain</small></span></a
        ><span class="connection" [class.offline]="!sync.api.online()"
          ><span class="dot"></span>{{ sync.api.online() ? 'En ligne' : 'Hors connexion' }}</span
        >
      </header>
      <main><router-outlet /></main>
      <section class="demo-tools" aria-label="Outils de démonstration">
        <div class="demo-title">
          <span>OUTIL DE DÉMONSTRATION</span><span>{{ sync.store.pendingCount() }} en attente</span>
        </div>
        <div class="demo-actions">
          <button
            class="secondary"
            [disabled]="sync.busy()"
            (click)="sync.api.demoOffline() ? sync.restoreOnline() : sync.simulateOffline()"
          >
            {{ sync.api.demoOffline() ? 'Revenir en ligne' : 'Mode démo hors ligne' }}</button
          ><button
            class="secondary"
            [disabled]="sync.busy() || sync.api.demoOffline()"
            (click)="sync.synchronize()"
          >
            {{ sync.busy() ? 'Synchronisation…' : 'Synchroniser maintenant' }}
          </button>
        </div>
        @if (sync.api.demoOffline()) {
          <p class="demo-hint">API volontairement désactivée côté navigateur.</p>
        }
      </section>
      @if (sync.error()) {
        <p class="error global-error" role="alert">{{ sync.error() }}</p>
      }
      <footer>
        Prototype technique inspiré d’un contexte de mobilité terrain.<span
          >Angular 22 · Spring Boot · Données fictives</span
        >
      </footer>
    </div>
    @if (sync.store.notice()) {
      <div class="toast" role="status"><span>✓</span>{{ sync.store.notice() }}</div>
    }
  `,
})
export class AppComponent implements OnInit {
  readonly sync = inject(SyncService);
  ngOnInit(): void {
    void this.sync.start();
  }
}
