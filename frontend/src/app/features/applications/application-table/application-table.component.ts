import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Application, PRIORITY_LABELS } from '../../../core/models/application.model';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-application-table',
  standalone: true,
  imports: [DatePipe, StatusBadgeComponent],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent {
  @Input({ required: true }) applications: Application[] = [];
  @Output() rowClick = new EventEmitter<Application>();

  readonly priorityLabels = PRIORITY_LABELS;

  followUpLabel(app: Application): string {
    if (!app.followUp1Done && app.followUp1Date) {
      return `R1 · ${app.followUp1Date}`;
    }
    if (app.followUp1Done && !app.followUp2Done && app.followUp2Date) {
      return `R2 · ${app.followUp2Date}`;
    }
    if (app.followUp2Done) {
      return 'Terminées';
    }
    return '—';
  }
}
