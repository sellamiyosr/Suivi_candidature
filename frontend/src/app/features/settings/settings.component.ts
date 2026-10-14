import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CvInfo } from '../../core/models/application.model';
import { ApplicationService } from '../../core/services/application.service';
import { CvService } from '../../core/services/cv.service';
import { ProfileService } from '../../core/services/profile.service';
import { SettingsService } from '../../core/services/settings.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  readonly settings = inject(SettingsService);
  readonly theme = inject(ThemeService);
  private readonly cvService = inject(CvService);
  private readonly profileService = inject(ProfileService);
  private readonly applicationService = inject(ApplicationService);

  fullName = this.settings.fullName();
  accountEmail = '';
  skillsText = '';
  skillsList: string[] = [];
  emailRemindersEnabled = true;
  mailConfigured = false;
  saved = false;
  reminderMessage = '';
  reminderLoading = false;
  cv: CvInfo | null = null;
  cvError = '';
  cvLoading = false;
  cvMessage = '';

  ngOnInit(): void {
    this.loadProfile();
    this.loadCv();
  }

  save(): void {
    this.settings.setFullName(this.fullName);
    this.profileService
      .update({
        skills: this.skillsText,
        emailRemindersEnabled: this.emailRemindersEnabled
      })
      .subscribe({
        next: (profile) => {
          this.applyProfile(profile);
          this.saved = true;
          setTimeout(() => (this.saved = false), 2000);
        },
        error: (err) => {
          this.cvError = err?.error?.message ?? 'Enregistrement du profil impossible';
        }
      });
  }

  sendTestReminder(): void {
    this.reminderLoading = true;
    this.reminderMessage = '';
    this.cvError = '';
    this.profileService.sendReminderNow(true).subscribe({
      next: (res) => {
        this.reminderLoading = false;
        this.reminderMessage = res.message;
      },
      error: (err) => {
        this.reminderLoading = false;
        this.cvError = err?.error?.message ?? 'Envoi du rappel impossible';
      }
    });
  }

  onSkillsTextChange(value: string): void {
    this.skillsList = (value ?? '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.cvLoading = true;
    this.cvError = '';
    this.cvMessage = '';
    this.cvService.upload(file).subscribe({
      next: (info) => {
        this.cv = info;
        this.cvLoading = false;
        if (info.detectedSkills?.length) {
          this.applySkills(info.detectedSkills.join(', '), info.detectedSkills);
          this.cvMessage =
            info.warning ||
            `CV enregistré — ${info.detectedSkills.length} compétence(s) détectée(s) et ajoutée(s) au profil`;
        } else {
          this.cvMessage =
            info.warning ||
            'CV enregistré — aucune compétence reconnue (vérifie le dictionnaire / le texte du PDF)';
        }
        this.applicationService.recalculateAllMatches().subscribe({
          next: () => {
            this.cvMessage += ' — scores des candidatures recalculés';
          },
          error: () => {
            /* non bloquant */
          }
        });
        input.value = '';
      },
      error: (err) => {
        this.cvLoading = false;
        this.cvError = err?.error?.message ?? 'Upload impossible';
        input.value = '';
      }
    });
  }

  downloadCv(): void {
    if (!this.cv) {
      return;
    }
    this.cvError = '';
    this.cvService.download().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.cv!.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        void this.readHttpError(err).then((msg) => {
          this.cvError = msg || 'Téléchargement impossible — redémarre le backend (mvn spring-boot:run)';
        });
      }
    });
  }

  deleteCv(): void {
    if (!this.cv || !confirm('Supprimer le CV enregistré ?')) {
      return;
    }
    this.cvService.delete().subscribe({
      next: () => {
        this.cv = null;
        this.cvMessage = 'CV supprimé (les compétences du profil sont conservées)';
      },
      error: (err) => (this.cvError = err?.error?.message ?? 'Suppression impossible')
    });
  }

  private loadProfile(): void {
    this.profileService.get().subscribe({
      next: (profile) => this.applyProfile(profile),
      error: () => {
        this.skillsText = '';
        this.skillsList = [];
      }
    });
  }

  private applyProfile(profile: {
    email?: string | null;
    skills: string | null;
    skillsList: string[];
    emailRemindersEnabled?: boolean;
    mailConfigured?: boolean;
  }): void {
    this.accountEmail = profile.email ?? '';
    this.emailRemindersEnabled = profile.emailRemindersEnabled ?? true;
    this.mailConfigured = !!profile.mailConfigured;
    this.applySkills(profile.skills, profile.skillsList);
  }

  private loadCv(): void {
    this.cvService.info().subscribe({
      next: (info) => (this.cv = info),
      error: () => (this.cv = null)
    });
  }

  private applySkills(skills: string | null | undefined, list?: string[]): void {
    this.skillsList = list?.length
      ? [...list]
      : (skills ?? '')
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);
    this.skillsText = this.skillsList.join(', ');
  }

  private async readHttpError(err: { error?: unknown; message?: string }): Promise<string> {
    const body = err?.error;
    if (body instanceof Blob) {
      try {
        const text = await body.text();
        const json = JSON.parse(text) as { message?: string };
        return json.message ?? '';
      } catch {
        return '';
      }
    }
    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message?: string }).message ?? '');
    }
    return err?.message ?? '';
  }
}
