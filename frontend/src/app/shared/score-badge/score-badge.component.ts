import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-score-badge',
  standalone: true,
  template: `
    @if (insufficient) {
      <span class="score insufficient" title="Description insuffisante pour un score fiable">N/A</span>
    } @else if (score === null || score === undefined) {
      <span class="score empty">—</span>
    } @else {
      <span class="score" [attr.data-level]="level">{{ score }}%</span>
    }
  `,
  styles: `
    .score {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .score.empty, .score.insufficient { background: var(--surface-2); color: var(--muted); }
    .score[data-level='low'] { background: #fee2e2; color: #b91c1c; }
    .score[data-level='mid'] { background: #ffedd5; color: #c2410c; }
    .score[data-level='high'] { background: #dcfce7; color: #166534; }
    :host-context([data-theme='dark']) .score[data-level='low'] { background: #7f1d1d; color: #fecaca; }
    :host-context([data-theme='dark']) .score[data-level='mid'] { background: #7c2d12; color: #fed7aa; }
    :host-context([data-theme='dark']) .score[data-level='high'] { background: #14532d; color: #bbf7d0; }
  `
})
export class ScoreBadgeComponent {
  @Input() score: number | null | undefined;
  @Input() insufficient = false;

  get level(): 'low' | 'mid' | 'high' {
    const s = this.score ?? 0;
    if (s < 40) return 'low';
    if (s < 70) return 'mid';
    return 'high';
  }
}
