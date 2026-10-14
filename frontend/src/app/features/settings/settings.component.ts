import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  readonly settings = inject(SettingsService);
  readonly theme = inject(ThemeService);

  fullName = this.settings.fullName();
  saved = false;

  save(): void {
    this.settings.setFullName(this.fullName);
    this.saved = true;
    setTimeout(() => (this.saved = false), 2000);
  }
}
