import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Status, statusLabels } from '../../../core/models/intervention';
import { SyncService } from '../../../core/services/sync.service';
import { SyncBadgeComponent } from '../../../shared/sync-badge.component';
@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, SyncBadgeComponent],
  template: `
    <a routerLink="/" class="back-link">← Mes interventions</a>
    @if (item(); as current) {
      <div class="detail-heading">
        <span class="eyebrow">INTERVENTION #{{ current.id }}</span>
        <h1>{{ current.type }}</h1>
        <app-sync-badge [state]="current.syncState" />
      </div>
      <section class="info-panel">
        <div class="client-heading">
          <span class="equipment-icon" aria-hidden="true">▤</span>
          <div>
            <span class="eyebrow">CLIENT</span>
            <h2>{{ current.client }}</h2>
          </div>
        </div>
        <dl>
          <dt>Adresse</dt>
          <dd>{{ current.address }}</dd>
          <dt>Équipement actuel</dt>
          <dd class="mono">{{ current.currentEquipment }}</dd>
          <dt>Statut</dt>
          <dd>{{ labels[current.status] }}</dd>
          <dt>Version serveur</dt>
          <dd>v{{ current.version }}</dd>
        </dl>
      </section>
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-panel">
        <span class="eyebrow">COMPTE RENDU TERRAIN</span>
        <h2>Votre intervention</h2>
        <label for="equipment">Numéro du nouvel équipement</label
        ><input
          id="equipment"
          formControlName="newEquipment"
          placeholder="Ex. EQP-2026-0842"
          maxlength="40"
          autocomplete="off"
          [attr.aria-invalid]="form.controls.newEquipment.invalid && attempted()"
        />
        @if (form.controls.newEquipment.invalid && attempted()) {
          <p class="field-error">Numéro obligatoire, 40 caractères maximum.</p>
        }
        <label for="status">Statut de l’intervention</label
        ><select id="status" formControlName="status">
          <option value="TODO">À réaliser</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="DONE">Terminée</option>
        </select>
        <label for="comment">Commentaire</label
        ><textarea
          id="comment"
          formControlName="comment"
          rows="4"
          maxlength="1000"
          placeholder="Observations, contrôles réalisés…"
        ></textarea>
        <p class="save-hint">
          {{
            sync.api.online()
              ? 'Votre validation sera enregistrée sur le serveur.'
              : 'Votre validation sera conservée sur cet appareil.'
          }}
        </p>
        @if (current.syncState === 'ERROR') {
          <p class="error" role="alert">
            Cette intervention a été modifiée depuis votre dernière consultation.
          </p>
          <button type="button" class="secondary" [disabled]="sync.busy()" (click)="reloadServer()">
            Charger la version serveur (abandonner la saisie locale)
          </button>
        }
        <button
          class="primary"
          type="submit"
          [disabled]="sync.busy() || current.syncState === 'ERROR'"
        >
          {{ sync.busy() ? 'Enregistrement…' : 'Valider l’intervention'
          }}<span aria-hidden="true">✓</span>
        </button>
      </form>
    } @else {
      <p class="empty">
        {{ sync.store.ready() ? 'Intervention introuvable dans le cache.' : 'Chargement…' }}
      </p>
    }
  `,
})
export class DetailPage {
  readonly sync = inject(SyncService);
  private readonly router = inject(Router);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly item = computed(() => this.sync.store.items().find((i) => i.id === this.id));
  readonly labels = statusLabels;
  readonly attempted = signal(false);
  readonly form = new FormGroup({
    newEquipment: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40), Validators.pattern(/.*\S.*/)],
    }),
    status: new FormControl<Status>('TODO', { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });
  constructor() {
    effect(() => {
      const item = this.item();
      if (item && !this.form.dirty)
        this.form.patchValue({
          newEquipment: item.newEquipment,
          status: item.status,
          comment: item.comment,
        });
    });
    void this.sync.loadDetail(this.id);
  }
  async submit(): Promise<void> {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    const item = this.item();
    if (this.form.invalid || !item) return;
    if (await this.sync.save(item, this.form.getRawValue())) {
      this.form.markAsPristine();
      await this.router.navigateByUrl('/');
    }
  }
  async reloadServer(): Promise<void> {
    await this.sync.discardConflict(this.id);
    if (this.item()?.syncState === 'SYNCED') {
      this.form.markAsPristine();
      const item = this.item()!;
      this.form.patchValue({
        newEquipment: item.newEquipment,
        status: item.status,
        comment: item.comment,
      });
    }
  }
}
