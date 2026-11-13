import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ALL_STATUSES,
  Application,
  ApplicationStatus,
  Statistics,
  STATUS_LABELS
} from '../../core/models/application.model';
import { ApplicationService } from '../../core/services/application.service';
import { nextFollowUpNumber } from '../../core/utils/follow-up-message';
import { FollowUpListComponent } from '../applications/follow-up-list/follow-up-list.component';
import { CompanyLogoComponent } from '../../shared/company-logo/company-logo.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StatisticsComponent } from './statistics/statistics.component';

/** Circonférence du cercle de la jauge (r = 50). */
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 50;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FollowUpListComponent,
    StatisticsComponent,
    StatusBadgeComponent,
    CompanyLogoComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly applicationService = inject(ApplicationService);
  private readonly router = inject(Router);

  stats: Statistics | null = null;
  followUps: Application[] = [];
  recent: Application[] = [];
  loading = true;
  error = '';
  actionError = '';

  readonly statusLabels = STATUS_LABELS;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      stats: this.applicationService.statistics(),
      followUps: this.applicationService.followUpsToday(),
      applications: this.applicationService.list()
    }).subscribe({
      next: ({ stats, followUps, applications }) => {
        this.stats = stats;
        this.followUps = followUps;
        this.recent = [...applications]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5);
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger le tableau de bord';
        this.loading = false;
      }
    });
  }

  statusCount(status: string): number {
    return this.stats?.byStatus?.[status] ?? 0;
  }

  /** Part des candidatures qui ont reçu une réponse (entretien, offre ou refus). */
  responseRate(): number {
    const total = this.stats?.total ?? 0;
    if (!total) return 0;
    const answered = this.statusCount('ENTRETIEN') + this.statusCount('OFFRE') + this.statusCount('REFUSEE');
    return Math.round((answered / total) * 100);
  }

  pipeline(): { status: ApplicationStatus; label: string; count: number; pct: number }[] {
    const total = this.stats?.total ?? 0;
    return ALL_STATUSES.map((status) => {
      const count = this.statusCount(status);
      return {
        status,
        label: STATUS_LABELS[status],
        count,
        pct: total ? Math.round((count / total) * 100) : 0
      };
    });
  }

  scoreLevel(): 'low' | 'mid' | 'high' {
    const s = this.stats?.averageMatchScore ?? 0;
    if (s < 40) return 'low';
    if (s < 70) return 'mid';
    return 'high';
  }

  gaugeDash(): string {
    const s = Math.max(0, Math.min(100, this.stats?.averageMatchScore ?? 0));
    const filled = (s / 100) * GAUGE_CIRCUMFERENCE;
    return `${filled} ${GAUGE_CIRCUMFERENCE}`;
  }

  onRelancer(app: Application): void {
    const n = nextFollowUpNumber(app);
    if (!n) {
      return;
    }
    this.actionError = '';
    this.applicationService.markFollowUp(app.id, n).subscribe({
      next: () => this.loadDashboard(),
      error: (err) => {
        this.actionError = err?.error?.message ?? 'Échec du marquage de relance';
      }
    });
  }

  open(app: Application): void {
    this.router.navigate(['/applications', app.id]);
  }
}
