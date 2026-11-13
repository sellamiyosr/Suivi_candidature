import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'pfe_theme';
const ACCENT_KEY = 'pfe_accent';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'emerald' | 'indigo' | 'orange' | 'rose' | 'teal';

export const ACCENTS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Bleu', swatch: '#2563eb' },
  { id: 'emerald', label: 'Émeraude', swatch: '#059669' },
  { id: 'indigo', label: 'Indigo', swatch: '#4f46e5' },
  { id: 'orange', label: 'Orange', swatch: '#ea580c' },
  { id: 'rose', label: 'Framboise', swatch: '#e11d48' },
  { id: 'teal', label: 'Sarcelle', swatch: '#0f766e' }
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.readTheme());
  readonly accent = signal<AccentColor>(this.readAccent());

  constructor() {
    this.apply(this.theme());
    this.applyAccent(this.accent());
  }

  toggle(): void {
    const next: ThemeMode = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.save(THEME_KEY, next);
    this.apply(next);
  }

  setAccent(accent: AccentColor): void {
    this.accent.set(accent);
    this.save(ACCENT_KEY, accent);
    this.applyAccent(accent);
  }

  private readTheme(): ThemeMode {
    return this.load(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }

  private readAccent(): AccentColor {
    const saved = this.load(ACCENT_KEY);
    return ACCENTS.some((a) => a.id === saved) ? (saved as AccentColor) : 'blue';
  }

  private apply(theme: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private applyAccent(accent: AccentColor): void {
    document.documentElement.setAttribute('data-accent', accent);
  }

  private load(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* stockage indisponible : ignorer */
    }
  }
}
