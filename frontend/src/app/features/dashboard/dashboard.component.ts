import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  Application,
  Statistics,
  STATUS_LABELS
} from '../../core/models/application.model';
import { ApplicationService } from '../../core/services/application.service';
import { nextFollowUpNumber } from '../../core/utils/follow-up-message';
import { FollowUpListComponent } from '../applications/follow-up-list/follow-up-list.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StatisticsComponent } from './statistics/statistics.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FollowUpListComponent,
    StatisticsComponent,
    StatusBadgeComponent
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
        this.error = 'Impossible de charger le dashboard';
        this.loading = false;
      }
    });
  }

  statusCount(status: string): number {
    return this.stats?.byStatus?.[status] ?? 0;
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
