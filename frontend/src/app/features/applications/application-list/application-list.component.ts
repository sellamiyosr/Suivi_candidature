import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ALL_STATUSES,
  Application,
  ApplicationStatus,
  STATUS_LABELS
} from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationTableComponent } from '../application-table/application-table.component';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [FormsModule, RouterLink, ApplicationTableComponent],
  templateUrl: './application-list.component.html',
  styleUrl: './application-list.component.scss'
})
export class ApplicationListComponent implements OnInit {
  readonly applications = signal<Application[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<string>('');
  readonly platformFilter = signal('');
  readonly sortAsc = signal(false);

  readonly statuses = ALL_STATUSES;
  readonly statusLabels = STATUS_LABELS;

  readonly platforms = computed(() => {
    const set = new Set(
      this.applications()
        .map((a) => a.platform)
        .filter((p): p is string => !!p)
    );
    return [...set].sort();
  });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const platform = this.platformFilter();
    const asc = this.sortAsc();

    return this.applications()
      .filter((a) => {
        const matchesSearch =
          !q ||
          a.company.toLowerCase().includes(q) ||
          a.jobTitle.toLowerCase().includes(q) ||
          (a.platform ?? '').toLowerCase().includes(q);
        const matchesStatus = !status || a.status === status;
        const matchesPlatform = !platform || a.platform === platform;
        return matchesSearch && matchesStatus && matchesPlatform;
      })
      .sort((a, b) => {
        const da = a.applicationDate ?? '';
        const db = b.applicationDate ?? '';
        return asc ? da.localeCompare(db) : db.localeCompare(da);
      });
  });

  constructor(
    private readonly applicationService: ApplicationService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.applicationService.list().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les candidatures');
        this.loading.set(false);
      }
    });
  }

  open(app: Application): void {
    this.router.navigate(['/applications', app.id]);
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  onStatus(value: string): void {
    this.statusFilter.set(value as ApplicationStatus | '');
  }

  onPlatform(value: string): void {
    this.platformFilter.set(value);
  }

  toggleSort(): void {
    this.sortAsc.update((v) => !v);
  }
}
