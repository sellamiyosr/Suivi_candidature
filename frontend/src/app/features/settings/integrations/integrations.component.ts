import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AI_PROVIDERS,
  AiProviderId,
  AiProviderInfo,
  IntegrationSettings,
  IntegrationsService
} from '../../../core/services/integrations.service';

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

/** Réglages "E-mail d'envoi" et "Assistant IA" (secrets chiffrés côté serveur). */
@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './integrations.component.html',
  styleUrl: './integrations.component.scss'
})
export class IntegrationsComponent implements OnInit {
  private readonly service = inject(IntegrationsService);

  /** Affiche une seule partie (onglets de la page Paramètres) ou les deux. */
  @Input() section: 'mail' | 'ai' | 'all' = 'all';

  readonly loading = signal(true);
  readonly current = signal<IntegrationSettings | null>(null);

  // ---- E-mail
  smtpEmail = '';
  smtpPassword = '';
  smtpHost = '';
  smtpPort: number | null = null;
  showAdvancedMail = false;
  readonly mailSaving = signal(false);
  readonly mailTesting = signal(false);
  readonly mailFeedback = signal<Feedback>(null);

  // ---- IA
  readonly provider = signal<AiProviderId | ''>('');
  aiModel = '';
  aiBaseUrl = '';
  aiApiKey = '';
  readonly aiSaving = signal(false);
  readonly aiTesting = signal(false);
  readonly aiFeedback = signal<Feedback>(null);

  readonly providers = AI_PROVIDERS;
  readonly providerInfo = computed<AiProviderInfo | null>(
    () => AI_PROVIDERS.find((p) => p.id === this.provider()) ?? null
  );

  ngOnInit(): void {
    this.service.get().subscribe({
      next: (s) => this.apply(s),
      error: () => this.loading.set(false)
    });
  }

  /* ------------------------------------------------ E-mail */

  get detectedHost(): string | null {
    const domain = this.smtpEmail.split('@')[1]?.toLowerCase() ?? '';
    if (domain === 'gmail.com' || domain === 'googlemail.com') return 'smtp.gmail.com';
    if (/^(outlook|hotmail|live|msn)\./.test(domain)) return 'smtp-mail.outlook.com';
    if (domain.startsWith('yahoo.')) return 'smtp.mail.yahoo.com';
    return null;
  }

  get isGmail(): boolean {
    return this.detectedHost === 'smtp.gmail.com';
  }

  saveMail(thenTest = false): void {
    this.mailSaving.set(true);
    this.mailFeedback.set(null);
    this.service.update(this.payload({ includeMailSecret: true })).subscribe({
      next: (s) => {
        this.apply(s);
        this.mailSaving.set(false);
        if (thenTest) {
          this.testMail();
        } else {
          this.mailFeedback.set({ kind: 'ok', text: 'Réglages e-mail enregistrés.' });
        }
      },
      error: (err) => {
        this.mailSaving.set(false);
        this.mailFeedback.set({ kind: 'error', text: err?.error?.message ?? 'Enregistrement impossible' });
      }
    });
  }

  testMail(): void {
    this.mailTesting.set(true);
    this.mailFeedback.set(null);
    this.service.testMail(true).subscribe({
      next: (r) => {
        this.mailTesting.set(false);
        this.mailFeedback.set({ kind: 'ok', text: r.message });
      },
      error: (err) => {
        this.mailTesting.set(false);
        this.mailFeedback.set({ kind: 'error', text: err?.error?.message ?? 'Test impossible' });
      }
    });
  }

  removeMail(): void {
    if (!confirm('Supprimer le compte e-mail d’envoi ?')) return;
    this.smtpEmail = '';
    this.smtpPassword = '';
    this.smtpHost = '';
    this.smtpPort = null;
    this.saveMail();
  }

  /* ------------------------------------------------ IA */

  onProviderChange(id: string): void {
    this.provider.set(id as AiProviderId | '');
    const info = this.providerInfo();
    // Pré-remplit avec les valeurs conseillées pour ce fournisseur
    this.aiModel = info?.defaultModel ?? '';
    this.aiBaseUrl = info?.needsBaseUrl ? info.defaultBaseUrl : '';
    this.aiApiKey = '';
    this.aiFeedback.set(null);
  }

  saveAi(thenTest = false): void {
    this.aiSaving.set(true);
    this.aiFeedback.set(null);
    this.service.update(this.payload({ includeAiSecret: true })).subscribe({
      next: (s) => {
        this.apply(s);
        this.aiSaving.set(false);
        if (thenTest && s.aiReady) {
          this.testAi();
        } else {
          this.aiFeedback.set({
            kind: 'ok',
            text: s.aiProvider ? 'Assistant IA enregistré.' : 'Assistant IA désactivé.'
          });
        }
      },
      error: (err) => {
        this.aiSaving.set(false);
        this.aiFeedback.set({ kind: 'error', text: err?.error?.message ?? 'Enregistrement impossible' });
      }
    });
  }

  testAi(): void {
    this.aiTesting.set(true);
    this.aiFeedback.set(null);
    this.service.testAi().subscribe({
      next: (r) => {
        this.aiTesting.set(false);
        this.aiFeedback.set({
          kind: 'ok',
          text: `« ${r.message} » — ${r.model}, ${(r.durationMs / 1000).toFixed(1)} s`
        });
      },
      error: (err) => {
        this.aiTesting.set(false);
        this.aiFeedback.set({ kind: 'error', text: err?.error?.message ?? 'Test impossible' });
      }
    });
  }

  removeAiKey(): void {
    this.aiApiKey = '';
    this.service.update({ ...this.payload({}), aiApiKey: '' }).subscribe({
      next: (s) => {
        this.apply(s);
        this.aiFeedback.set({ kind: 'ok', text: 'Clé supprimée.' });
      }
    });
  }

  /* ------------------------------------------------ Outils */

  /**
   * Construit la requête complète (le backend remplace tous les champs).
   * Les secrets ne sont envoyés que s'ils ont été saisis : sinon null = inchangé.
   */
  private payload(opts: { includeMailSecret?: boolean; includeAiSecret?: boolean }): IntegrationSettings {
    return {
      smtpEmail: this.smtpEmail.trim() || null,
      smtpPassword: opts.includeMailSecret && this.smtpPassword ? this.smtpPassword : null,
      smtpHost: this.smtpHost.trim() || null,
      smtpPort: this.smtpPort || null,
      aiProvider: this.provider() || null,
      aiModel: this.aiModel.trim() || null,
      aiBaseUrl: this.aiBaseUrl.trim() || null,
      aiApiKey: opts.includeAiSecret && this.aiApiKey ? this.aiApiKey : null
    };
  }

  private apply(s: IntegrationSettings): void {
    this.current.set(s);
    this.smtpEmail = s.smtpEmail ?? '';
    this.smtpHost = s.smtpHost ?? '';
    this.smtpPort = s.smtpPort ?? null;
    this.smtpPassword = '';
    this.showAdvancedMail = !!(s.smtpHost || s.smtpPort);

    this.provider.set(s.aiProvider ?? '');
    const info = AI_PROVIDERS.find((p) => p.id === s.aiProvider);
    this.aiModel = s.aiModel ?? info?.defaultModel ?? '';
    this.aiBaseUrl = s.aiBaseUrl ?? (info?.needsBaseUrl ? info.defaultBaseUrl : '');
    this.aiApiKey = '';
    this.loading.set(false);
  }
}
