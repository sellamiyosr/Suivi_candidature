import { Component, EventEmitter, Output, computed, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ACCENTS, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly accents = ACCENTS;
  readonly paletteOpen = signal(false);
  readonly currentSwatch = computed(
    () => ACCENTS.find((a) => a.id === this.theme.accent())?.swatch ?? '#2563eb'
  );

  /** "yosr.sellami.33@…" → "YS" */
  readonly initials = computed(() => {
    const local = (this.auth.email() ?? '').split('@')[0];
    const parts = local.split(/[._\-\d]+/).filter(Boolean);
    const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
    return (letters || '?').toUpperCase();
  });

  /** "yosr.sellami.33@…" → "Yosr Sellami" */
  readonly displayName = computed(() => {
    const local = (this.auth.email() ?? '').split('@')[0];
    const parts = local.split(/[._\-\d]+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || 'Mon compte';
  });

  readonly today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  constructor(
    readonly auth: AuthService,
    readonly theme: ThemeService
  ) {}
}
