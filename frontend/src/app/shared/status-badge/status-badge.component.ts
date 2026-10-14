import { Component, Input } from '@angular/core';
import { ApplicationStatus, STATUS_LABELS } from '../../core/models/application.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [attr.data-status]="status">{{ label }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .badge[data-status='EN_ATTENTE'] { background: #e0e7ff; color: #3730a3; }
    .badge[data-status='RELANCE_1'] { background: #ffedd5; color: #c2410c; }
    .badge[data-status='RELANCE_2'] { background: #fed7aa; color: #9a3412; }
    .badge[data-status='ENTRETIEN'] { background: #ede9fe; color: #6d28d9; }
    .badge[data-status='OFFRE'] { background: #dcfce7; color: #166534; }
    .badge[data-status='REFUSEE'] { background: #fee2e2; color: #b91c1c; }
    .badge[data-status='RETIREE'] { background: #e5e7eb; color: #374151; }

    :host-context([data-theme='dark']) .badge[data-status='EN_ATTENTE'] { background: #312e81; color: #c7d2fe; }
    :host-context([data-theme='dark']) .badge[data-status='RELANCE_1'] { background: #7c2d12; color: #fed7aa; }
    :host-context([data-theme='dark']) .badge[data-status='RELANCE_2'] { background: #9a3412; color: #ffedd5; }
    :host-context([data-theme='dark']) .badge[data-status='ENTRETIEN'] { background: #4c1d95; color: #ddd6fe; }
    :host-context([data-theme='dark']) .badge[data-status='OFFRE'] { background: #14532d; color: #bbf7d0; }
    :host-context([data-theme='dark']) .badge[data-status='REFUSEE'] { background: #7f1d1d; color: #fecaca; }
    :host-context([data-theme='dark']) .badge[data-status='RETIREE'] { background: #374151; color: #e5e7eb; }
  `
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: ApplicationStatus;

  get label(): string {
    return STATUS_LABELS[this.status] ?? this.status;
  }
}
