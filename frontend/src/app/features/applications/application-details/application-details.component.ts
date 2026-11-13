import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Application,
  PRIORITY_LABELS,
  CONTRACT_LABELS,
  WORK_MODE_LABELS
} from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { IntegrationsService } from '../../../core/services/integrations.service';
import { SettingsService } from '../../../core/services/settings.service';
import {
  generateFollowUpMessage,
  nextFollowUpNumber
} from '../../../core/utils/follow-up-message';
import { CompanyLogoComponent } from '../../../shared/company-logo/company-logo.component';
import { ScoreBadgeComponent } from '../../../shared/score-badge/score-badge.component';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StatusBadgeComponent, ScoreBadgeComponent, CompanyLogoComponent],
  templateUrl: './application-details.component.html',
  styleUrl: './application-details.component.scss'
})
export class ApplicationDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationService = inject(ApplicationService);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly integrations = inject(IntegrationsService);

  app: Application | null = null;
  error = '';
  success = '';
  screenshotUrl: string | null = null;
  messagePreview = '';
  messageVisible = false;
  copied = false;
  actionLoading = false;

  // Rédaction / envoi
  mailTo = '';
  mailSubject = '';
  messageFromAi = false;
  markDoneOnSend = true;
  readonly sending = signal(false);
  readonly mailReady = signal(false);
  readonly mailFrom = signal<string | null>(null);

  // IA
  readonly aiReady = signal(false);
  readonly aiBusy = signal<'followup' | 'analysis' | null>(null);
  readonly aiNotice = signal('');
  readonly analysis = signal<AnalysisBlock[] | null>(null);
  readonly analysisUsedCv = signal(true);
  readonly priorityLabels = PRIORITY_LABELS;
  readonly contractLabels = CONTRACT_LABELS;
  readonly workModeLabels = WORK_MODE_LABELS;

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
    this.integrations.get().subscribe({
      next: (s) => {
        this.aiReady.set(!!s.aiReady);
        this.mailReady.set(!!s.mailReady);
        this.mailFrom.set(s.smtpEmail);
      },
      error: () => {
        /* non bloquant */
      }
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
    this.mailSubject = `Suivi de ma candidature — ${this.app.jobTitle}`;
    this.mailTo = this.app.contactEmail ?? '';
    this.messageFromAi = false;
    this.messageVisible = true;
    this.copied = false;
  }

  aiWriteFollowUp(): void {
    if (!this.app || !this.ensureAi()) {
      return;
    }
    this.aiBusy.set('followup');
    this.error = '';
    this.integrations.aiFollowUp(this.app.id).subscribe({
      next: (r) => {
        this.aiBusy.set(null);
        const name = this.settings.fullName().trim();
        this.messagePreview = name ? r.body.replace(/\[Ton prénom\]/g, name) : r.body;
        this.mailSubject = r.subject;
        this.mailTo = r.to || this.app?.contactEmail || '';
        this.messageFromAi = true;
        this.messageVisible = true;
        this.copied = false;
      },
      error: (err) => {
        this.aiBusy.set(null);
        this.error = err?.error?.message ?? 'La génération a échoué';
      }
    });
  }

  aiAnalyze(): void {
    if (!this.app || !this.ensureAi()) {
      return;
    }
    this.aiBusy.set('analysis');
    this.error = '';
    this.integrations.aiAnalysis(this.app.id).subscribe({
      next: (r) => {
        this.aiBusy.set(null);
        this.analysis.set(parseMarkdown(r.analysis));
        this.analysisUsedCv.set(r.usedCv === 'true');
      },
      error: (err) => {
        this.aiBusy.set(null);
        this.error = err?.error?.message ?? 'L’analyse a échoué';
      }
    });
  }

  sendMail(): void {
    if (!this.app) {
      return;
    }
    if (!confirm(`Envoyer ce message à ${this.mailTo} ?`)) {
      return;
    }
    this.sending.set(true);
    this.error = '';
    this.integrations
      .sendFollowUp(this.app.id, {
        to: this.mailTo.trim(),
        subject: this.mailSubject.trim(),
        body: this.messagePreview,
        markDone: this.markDoneOnSend && this.nextFollowUp !== null
      })
      .subscribe({
        next: (app) => {
          this.app = app;
          this.sending.set(false);
          this.messageVisible = false;
          this.success = `Message envoyé à ${this.mailTo}`;
          setTimeout(() => (this.success = ''), 3500);
        },
        error: (err) => {
          this.sending.set(false);
          this.error = err?.error?.message ?? 'Envoi impossible';
        }
      });
  }

  private ensureAi(): boolean {
    if (this.aiReady()) {
      this.aiNotice.set('');
      return true;
    }
    this.aiNotice.set('Aucun assistant IA configuré : choisis un fournisseur (Ollama gratuit, Groq, Claude…) dans Paramètres.');
    return false;
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

  recalculateMatch(): void {
    if (!this.app) {
      return;
    }
    this.actionLoading = true;
    this.error = '';
    this.applicationService.recalculateMatch(this.app.id).subscribe({
      next: (app) => {
        this.app = app;
        this.actionLoading = false;
        this.success = 'Score recalculé';
        setTimeout(() => (this.success = ''), 2000);
      },
      error: (err) => {
        this.actionLoading = false;
        this.error = err?.error?.message ?? 'Recalcul impossible';
      }
    });
  }

  keywordList(value: string | null | undefined): string[] {
    if (!value?.trim()) {
      return [];
    }
    return value.split(',').map((k) => k.trim()).filter(Boolean);
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

interface AnalysisBlock {
  type: 'h' | 'li' | 'p';
  text?: string;
  items?: string[];
}

/** Mini rendu Markdown (titres ##, puces -, paragraphes) sans innerHTML. */
function parseMarkdown(md: string): AnalysisBlock[] {
  const blocks: AnalysisBlock[] = [];
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const clean = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`/g, '').trim();
    if (/^#{1,4}\s+/.test(line)) {
      blocks.push({ type: 'h', text: clean(line.replace(/^#{1,4}\s+/, '')) });
    } else if (/^([-*•]|\d+[.)])\s+/.test(line)) {
      const item = clean(line.replace(/^([-*•]|\d+[.)])\s+/, ''));
      const last = blocks[blocks.length - 1];
      if (last?.type === 'li') last.items!.push(item);
      else blocks.push({ type: 'li', items: [item] });
    } else {
      blocks.push({ type: 'p', text: clean(line) });
    }
  }
  return blocks;
}
