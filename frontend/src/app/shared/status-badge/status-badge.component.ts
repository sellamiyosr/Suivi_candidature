import { Component, Input } from '@angular/core';
import { ApplicationStatus, STATUS_LABELS } from '../../core/models/application.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="pill" [attr.data-status]="status"><span class="dot" [attr.data-status]="status"></span>{{ label }}</span>`,
  styles: `
    .pill .dot { background: currentColor; box-shadow: none; }
  `
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: ApplicationStatus;

  get label(): string {
    return STATUS_LABELS[this.status] ?? this.status;
  }
}
