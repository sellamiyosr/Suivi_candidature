import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ALL_CONTRACTS,
  ALL_STATUSES,
  ALL_WORK_MODES,
  CONTRACT_LABELS,
  CONTRACT_OPTIONS,
  Option,
  STATUS_OPTIONS,
  WORK_MODE_LABELS,
  WORK_MODE_OPTIONS,
  Application,
  ApplicationStatus,
  STATUS_LABELS
} from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationTableComponent } from '../application-table/application-table.component';
import { SelectComponent } from '../../../shared/select/select.component';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [FormsModule, RouterLink, ApplicationTableComponent, SelectComponent],
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
  readonly contractFilter = signal('');
  readonly workModeFilter = signal('');
  readonly updatingId = signal<number | null>(null);
  readonly sortAsc = signal(false);
  readonly sortBy = signal<'date' | 'score'>('date');

  readonly statuses = ALL_STATUSES;
  readonly statusLabels = STATUS_LABELS;
  readonly contracts = ALL_CONTRACTS;
  readonly contractLabels = CONTRACT_LABELS;
  readonly workModes = ALL_WORK_MODES;
  readonly workModeLabels = WORK_MODE_LABELS;

  readonly statusFilterOptions: Option[] = [{ value: '', label: 'Tous les statuts' }, ...STATUS_OPTIONS];
  readonly contractFilterOptions: Option[] = [{ value: '', label: 'Tous les contrats' }, ...CONTRACT_OPTIONS];
  readonly workModeFilterOptions: Option[] = [{ value: '', label: 'Tous les modes' }, ...WORK_MODE_OPTIONS];
  readonly platformFilterOptions = computed<Option[]>(() => [
    { value: '', label: 'Toutes les plateformes' },
    ...this.platforms().map((p) => ({ value: p, label: p }))
  ]);
  readonly hasFilters = computed(
    () => !!(this.statusFilter() || this.contractFilter() || this.workModeFilter() || this.platformFilter() || this.search())
  );

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
    const contract = this.contractFilter();
    const workMode = this.workModeFilter();
    const asc = this.sortAsc();
    const sortBy = this.sortBy();

    return this.applications()
      .filter((a) => {
        const matchesSearch =
          !q ||
          a.company.toLowerCase().includes(q) ||
          a.jobTitle.toLowerCase().includes(q) ||
          (a.platform ?? '').toLowerCase().includes(q) ||
          (a.location ?? '').toLowerCase().includes(q) ||
          (a.domain ?? '').toLowerCase().includes(q) ||
          (a.skills ?? '').toLowerCase().includes(q);
        const matchesStatus = !status || a.status === status;
        const matchesPlatform = !platform || a.platform === platform;
        const matchesContract = !contract || a.contractType === contract;
        const matchesWorkMode = !workMode || a.workMode === workMode;
        return matchesSearch && matchesStatus && matchesPlatform && matchesContract && matchesWorkMode;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          const sa = a.matchScore ?? -1;
          const sb = b.matchScore ?? -1;
          return asc ? sa - sb : sb - sa;
        }
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

  changeStatus(app: Application, status: ApplicationStatus): void {
    const previous = app.status;
    this.updatingId.set(app.id);
    // Mise à jour optimiste : la ligne change de couleur immédiatement
    this.replace({ ...app, status });
    this.applicationService.updateStatus(app.id, status).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.updatingId.set(null);
      },
      error: () => {
        this.replace({ ...app, status: previous });
        this.updatingId.set(null);
        alert('Impossible de modifier le statut');
      }
    });
  }

  private replace(updated: Application): void {
    this.applications.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }

  open(app: Application): void {
    this.router.navigate(['/applications', app.id]);
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.contractFilter.set('');
    this.workModeFilter.set('');
    this.platformFilter.set('');
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

  sortByDate(): void {
    this.sortBy.set('date');
    this.toggleSort();
  }

  sortByScore(): void {
    this.sortBy.set('score');
    this.sortAsc.set(false);
  }
}
