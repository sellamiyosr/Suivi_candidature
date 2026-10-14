import { Injectable, signal } from '@angular/core';

const FULL_NAME_KEY = 'pfe_full_name';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly fullName = signal<string>(localStorage.getItem(FULL_NAME_KEY) ?? '');

  setFullName(name: string): void {
    const value = name.trim();
    localStorage.setItem(FULL_NAME_KEY, value);
    this.fullName.set(value);
  }
}
