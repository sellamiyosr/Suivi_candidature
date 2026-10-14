import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Application,
  PRIORITY_LABELS
} from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import {
  generateFollowUpMessage,
  nextFollowUpNumber
} from '../../../core/utils/follow-up-message';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [DatePipe, RouterLink, StatusBadgeComponent],
  templateUrl: './application-details.component.html',
  styleUrl: './application-details.component.scss'
})
export class ApplicationDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationService = inject(ApplicationService);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);

  app: Application | null = null;
  error = '';
  success = '';
  screenshotUrl: string | null = null;
  messagePreview = '';
  messageVisible = false;
  copied = false;
  actionLoading = false;
  readonly priorityLabels = PRIORITY_LABELS;

  get nextFollowUp(): 1 | 2 | null {
    return this.app ? nextFollowUpNumber(this.app) : null;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.applicationService.getById(id).subscribe({
      next: (app) => {
        this.app = app;
        if (app.hasScreenshot) {
          this.loadScreenshot(app.id);
        }
      },
      error: () => (this.error = 'Candidature introuvable')
    });
  }

  ngOnDestroy(): void {
    if (this.screenshotUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.screenshotUrl);
    }
  }

  delete(): void {
    if (!this.app) {
      return;
    }
    if (!confirm(`Supprimer la candidature chez ${this.app.company} ?`)) {
      return;
    }
    this.applicationService.delete(this.app.id).subscribe({
      next: () => this.router.navigate(['/applications']),
      error: () => (this.error = 'Suppression impossible')
    });
  }

  markAsFollowedUp(): void {
    if (!this.app || !this.nextFollowUp) {
      return;
    }
    const n = this.nextFollowUp;
    this.actionLoading = true;
    this.error = '';
    this.applicationService.markFollowUp(this.app.id, n).subscribe({
      next: (app) => {
        this.app = app;
        this.actionLoading = false;
        this.success = `Relance ${n} marquée comme faite`;
        setTimeout(() => (this.success = ''), 2500);
      },
      error: (err) => {
        this.actionLoading = false;
        this.error = err?.error?.message ?? 'Impossible de marquer la relance';
      }
    });
  }

  generateMessage(): void {
    if (!this.app) {
      return;
    }
    if (!this.settings.fullName().trim()) {
      this.error = 'Renseignez votre nom complet dans Paramètres avant de générer un message';
      return;
    }
    this.error = '';
    this.messagePreview = generateFollowUpMessage(
      this.app.jobTitle,
      this.app.company,
      this.settings.fullName()
    );
    this.messageVisible = true;
    this.copied = false;
  }

  async copyMessage(): Promise<void> {
    if (!this.messagePreview) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.messagePreview);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      this.error = 'Impossible de copier dans le presse-papiers';
    }
  }

  private loadScreenshot(id: number): void {
    fetch(this.applicationService.screenshotUrl(id), {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` }
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        this.screenshotUrl = URL.createObjectURL(blob);
      })
      .catch(() => {
        this.screenshotUrl = null;
      });
  }
}
