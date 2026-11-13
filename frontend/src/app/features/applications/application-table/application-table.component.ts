import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ALL_STATUSES,
  Application,
  ApplicationStatus,
  CONTRACT_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  WORK_MODE_LABELS
} from '../../../core/models/application.model';
import { CompanyLogoComponent } from '../../../shared/company-logo/company-logo.component';
import { ScoreBadgeComponent } from '../../../shared/score-badge/score-badge.component';
import { SelectComponent } from '../../../shared/select/select.component';

const MAX_SKILLS = 3;

@Component({
  selector: 'app-application-table',
  standalone: true,
  imports: [DatePipe, ScoreBadgeComponent, CompanyLogoComponent, SelectComponent],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent {
  @Input({ required: true }) applications: Application[] = [];
  /** Id de la candidature dont le statut est en cours d'enregistrement. */
  @Input() updatingId: number | null = null;
  @Output() rowClick = new EventEmitter<Application>();
  @Output() statusChange = new EventEmitter<{ app: Application; status: ApplicationStatus }>();

  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly contractLabels = CONTRACT_LABELS;
  readonly statuses = ALL_STATUSES;
  readonly statusOptions = STATUS_OPTIONS;

  onStatusPicked(app: Application, value: string): void {
    const status = value as ApplicationStatus;
    if (status !== app.status) {
      this.statusChange.emit({ app, status });
    }
  }

  /** "Lyon · Hybride · Data / IA" */
  jobMeta(app: Application): string {
    return [app.location, app.workMode ? WORK_MODE_LABELS[app.workMode] : null, app.domain]
      .filter((v): v is string => !!v && !!v.trim())
      .join(' · ');
  }

  /** "Févr. 2027 · 6 mois" */
  timing(app: Application): string {
    return [app.startDate, app.duration].filter((v): v is string => !!v && !!v.trim()).join(' · ');
  }

  private skillList(app: Application): string[] {
    return (app.skills ?? '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  topSkills(app: Application): string[] {
    return this.skillList(app).slice(0, MAX_SKILLS);
  }

  extraSkills(app: Application): number {
    return Math.max(0, this.skillList(app).length - MAX_SKILLS);
  }

  followUpLabel(app: Application): string {
    if (!app.followUp1Done && app.followUp1Date) {
      return `Relance 1 · ${this.shortDate(app.followUp1Date)}`;
    }
    if (app.followUp1Done && !app.followUp2Done && app.followUp2Date) {
      return `Relance 2 · ${this.shortDate(app.followUp2Date)}`;
    }
    if (app.followUp2Done) {
      return 'Relances faites';
    }
    return '—';
  }

  private shortDate(iso: string): string {
    const [, m, d] = iso.split('-');
    return d && m ? `${d}/${m}` : iso;
  }
}
