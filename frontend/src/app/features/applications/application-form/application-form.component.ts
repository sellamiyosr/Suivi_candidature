import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ALL_STATUSES,
  ApplicationRequest,
  ApplicationStatus,
  Priority,
  PRIORITY_LABELS,
  STATUS_LABELS
} from '../../../core/models/application.model';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.component.html',
  styleUrl: './application-form.component.scss'
})
export class ApplicationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly applicationService = inject(ApplicationService);
  private readonly auth = inject(AuthService);

  editId: number | null = null;
  loading = false;
  error = '';
  screenshotFile: File | null = null;
  screenshotPreview: string | null = null;

  readonly statuses = ALL_STATUSES;
  readonly statusLabels = STATUS_LABELS;
  readonly priorities: Priority[] = ['BASSE', 'MOYENNE', 'HAUTE'];
  readonly priorityLabels = PRIORITY_LABELS;

  readonly form = this.fb.group({
    company: ['', Validators.required],
    jobTitle: ['', Validators.required],
    jobUrl: [''],
    reference: [''],
    platform: [''],
    location: [''],
    description: [''],
    importantElements: [''],
    skills: [''],
    contactName: [''],
    contactEmail: [''],
    contactLinkedin: [''],
    applicationDate: [''],
    status: this.fb.nonNullable.control<ApplicationStatus>('EN_ATTENTE'),
    priority: this.fb.nonNullable.control<Priority>('MOYENNE'),
    followUp1Date: [''],
    followUp2Date: [''],
    notes: ['']
  });

  get isEdit(): boolean {
    return this.editId !== null;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.editId = Number(idParam);
      this.applicationService.getById(this.editId).subscribe({
        next: (app) => {
          this.form.patchValue({
            company: app.company,
            jobTitle: app.jobTitle,
            jobUrl: app.jobUrl ?? '',
            reference: app.reference ?? '',
            platform: app.platform ?? '',
            location: app.location ?? '',
            description: app.description ?? '',
            importantElements: app.importantElements ?? '',
            skills: app.skills ?? '',
            contactName: app.contactName ?? '',
            contactEmail: app.contactEmail ?? '',
            contactLinkedin: app.contactLinkedin ?? '',
            applicationDate: app.applicationDate ?? '',
            status: app.status,
            priority: app.priority,
            followUp1Date: app.followUp1Date ?? '',
            followUp2Date: app.followUp2Date ?? '',
            notes: app.notes ?? ''
          });
          if (app.hasScreenshot) {
            this.loadScreenshotPreview(app.id);
          }
        },
        error: () => (this.error = 'Candidature introuvable')
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setScreenshot(file);
    }
  }

  async onPaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          this.setScreenshot(file);
          event.preventDefault();
        }
        break;
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ApplicationRequest = {
      company: raw.company!.trim(),
      jobTitle: raw.jobTitle!.trim(),
      jobUrl: raw.jobUrl || null,
      reference: raw.reference || null,
      platform: raw.platform || null,
      location: raw.location || null,
      description: raw.description || null,
      importantElements: raw.importantElements || null,
      skills: raw.skills || null,
      contactName: raw.contactName || null,
      contactEmail: raw.contactEmail || null,
      contactLinkedin: raw.contactLinkedin || null,
      applicationDate: raw.applicationDate || null,
      status: raw.status,
      priority: raw.priority,
      notes: raw.notes || null
    };

    if (this.isEdit) {
      payload.followUp1Date = raw.followUp1Date || null;
      payload.followUp2Date = raw.followUp2Date || null;
    }

    this.loading = true;
    this.error = '';

    const request$ = this.isEdit
      ? this.applicationService.update(this.editId!, payload)
      : this.applicationService.create(payload);

    request$.subscribe({
      next: (app) => {
        if (this.screenshotFile) {
          this.applicationService.uploadScreenshot(app.id, this.screenshotFile).subscribe({
            next: () => this.router.navigate(['/applications', app.id]),
            error: () => {
              this.loading = false;
              this.error = 'Candidature enregistrée, mais échec de la capture';
              this.router.navigate(['/applications', app.id]);
            }
          });
        } else {
          this.router.navigate(['/applications', app.id]);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Enregistrement impossible';
      }
    });
  }

  private setScreenshot(file: File): void {
    this.screenshotFile = file;
    if (this.screenshotPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.screenshotPreview);
    }
    this.screenshotPreview = URL.createObjectURL(file);
  }

  private loadScreenshotPreview(id: number): void {
    fetch(this.applicationService.screenshotUrl(id), {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` }
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        this.screenshotPreview = URL.createObjectURL(blob);
      })
      .catch(() => {
        this.screenshotPreview = null;
      });
  }
}
