import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InterventionStore } from '../../../core/services/intervention.store';
import { InterventionCardComponent } from '../components/intervention-card.component';
import { AnalysisService } from '../services/analysis.service';
@Component({
  standalone: true,
  imports: [InterventionCardComponent, DecimalPipe],
  template: `
    <section class="welcome">
      <div>
        <span class="eyebrow">VOTRE ESPACE TERRAIN</span>
        <h1>Prêt pour<br />la prochaine intervention<span> ?</span></h1>
        <p>Les bonnes informations. Même hors connexion.</p>
      </div>
      <svg class="technical-art" viewBox="0 0 90 110" aria-hidden="true">
        <rect
          x="15"
          y="16"
          width="60"
          height="82"
          rx="10"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <rect x="32" y="10" width="26" height="13" rx="4" fill="currentColor" opacity=".18" />
        <path
          d="m26 43 4 4 7-8m-11 24 4 4 7-8m-11 24 4 4 7-8M45 43h18M45 63h18M45 83h12"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </section>
    <section class="metrics" aria-label="Résumé des interventions">
      <div>
        <strong>{{ store.items().length }}</strong
        ><span>interventions</span>
      </div>
      <div>
        <strong>{{ store.completedCount() }}</strong
        ><span>terminées</span>
      </div>
      <div>
        <strong class="amber-text">{{ store.pendingCount() }}</strong
        ><span>à synchroniser</span>
      </div>
    </section>
    <div class="section-heading">
      <h2>Mes interventions</h2>
      <span class="count-pill">{{ store.items().length }}</span>
    </div>
    @if (!store.ready()) {
      <p class="empty" role="status">Chargement de votre espace…</p>
    } @else if (store.items().length === 0) {
      <p class="empty">
        Aucune intervention en cache. Connectez le backend puis cliquez sur « Synchroniser
        maintenant ».
      </p>
    }
    <div class="card-list">
      @for (item of store.items(); track item.id) {
        <app-intervention-card [item]="item" />
      }
    </div>
    <section class="analysis-panel">
      <span class="eyebrow">CALCUL LOCAL · WEB WORKER</span>
      <h2>Un million de données.<br />Une interface toujours fluide.</h2>
      <p>
        Statistiques et scores de priorité sur un jeu de données simulées, dans un thread dédié.
      </p>
      <button class="primary" [disabled]="analysis.running()" (click)="analysis.run()">
        {{ analysis.running() ? 'Analyse en cours…' : 'Analyser les interventions' }}
        <span aria-hidden="true">↗</span>
      </button>
      @if (analysis.running()) {
        <p role="status">Vous pouvez continuer à ouvrir les cartes.</p>
      }
      @if (analysis.result(); as result) {
        <div class="analysis-result" role="status">
          <div>
            <strong>{{ result.critical | number: '1.0-0' : 'fr' }}</strong
            ><span>critiques</span>
          </div>
          <div>
            <strong>{{ result.pending | number: '1.0-0' : 'fr' }}</strong
            ><span>en attente</span>
          </div>
          <p>
            Temps de calcul : {{ result.durationMs | number: '1.0-1' : 'fr' }} ms ·
            {{ result.total | number: '1.0-0' : 'fr' }} lignes simulées
          </p>
        </div>
      }
      @if (analysis.error()) {
        <p class="error" role="alert">{{ analysis.error() }}</p>
      }
    </section>
  `,
})
export class ListPage {
  readonly store = inject(InterventionStore);
  readonly analysis = inject(AnalysisService);
}
