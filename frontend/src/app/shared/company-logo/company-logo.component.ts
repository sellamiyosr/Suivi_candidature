import { Component, Input, OnChanges } from '@angular/core';

/** Logo de l'entreprise (URL captée par l'extension) avec repli sur l'initiale. */
@Component({
  selector: 'app-company-logo',
  standalone: true,
  template: `
    @if (url && !failed) {
      <img [src]="url" [alt]="name" [style.width.px]="size" [style.height.px]="size" (error)="failed = true" referrerpolicy="no-referrer" />
    } @else {
      <span class="fallback" [style.width.px]="size" [style.height.px]="size" [style.background]="color">{{ initial }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; flex-shrink: 0; }
    img {
      border-radius: 6px;
      object-fit: contain;
      background: #fff;
      border: 1px solid var(--border);
      padding: 2px;
    }
    .fallback {
      border-radius: 6px;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1;
    }
  `
})
export class CompanyLogoComponent implements OnChanges {
  @Input() url: string | null = null;
  @Input() name = '';
  @Input() size = 32;

  failed = false;
  initial = '?';
  color = '#0f766e';

  
  private static readonly PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#4f46e5', '#059669'];

  ngOnChanges(): void {
    this.failed = false;
    const n = (this.name || '?').trim();
    this.initial = n.charAt(0).toUpperCase() || '?';
    let hash = 0;
    for (const ch of n) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    this.color = CompanyLogoComponent.PALETTE[Math.abs(hash) % CompanyLogoComponent.PALETTE.length];
  }
}
