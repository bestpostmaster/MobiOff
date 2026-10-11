import { Component, input } from '@angular/core';
import { SyncState, syncLabels } from '../core/models/intervention';
@Component({
  selector: 'app-sync-badge',
  standalone: true,
  template: `<span class="sync-badge" [attr.data-state]="state()"
    ><span class="dot"></span>{{ labels[state()] }}</span
  >`,
})
export class SyncBadgeComponent {
  readonly state = input.required<SyncState>();
  readonly labels = syncLabels;
}
