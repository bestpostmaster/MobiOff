import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalIntervention, statusLabels } from '../../../core/models/intervention';
import { SyncBadgeComponent } from '../../../shared/sync-badge.component';
@Component({
  selector: 'app-intervention-card',
  standalone: true,
  imports: [RouterLink, SyncBadgeComponent],
  template: ` <a
    class="intervention-card"
    [routerLink]="['/interventions', item().id]"
    [class.high-priority]="item().priority === 'HIGH'"
  >
    <div class="card-top">
      <span class="reference">#{{ item().id }}</span
      ><span class="status-badge" [attr.data-status]="item().status">{{
        labels[item().status]
      }}</span>
    </div>
    <div class="card-main">
      <span class="equipment-icon" aria-hidden="true">{{
        item().type === 'Maintenance' ? '⚙' : '▤'
      }}</span>
      <div>
        <h3>{{ item().type }}</h3>
        <p>{{ item().client }}</p>
      </div>
      <span class="arrow" aria-hidden="true">↗</span>
    </div>
    <div class="card-bottom">
      <span class="priority" [class.high]="item().priority === 'HIGH'">{{
        item().priority === 'HIGH' ? '↑ Priorité haute' : 'Priorité normale'
      }}</span
      ><app-sync-badge [state]="item().syncState" />
    </div>
  </a>`,
})
export class InterventionCardComponent {
  readonly item = input.required<LocalIntervention>();
  readonly labels = statusLabels;
}
