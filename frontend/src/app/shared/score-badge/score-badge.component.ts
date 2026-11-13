import { Component, Input } from '@angular/core';

/** Score de compatibilité : chiffre + barre fine. */
@Component({
  selector: 'app-score-badge',
  standalone: true,
  template: `
    @if (insufficient) {
      <span class="score empty" title="Description insuffisante pour un score fiable">n/a</span>
    } @else if (score === null || score === undefined) {
      <span class="score empty">—</span>
    } @else {
      <span class="score" [attr.data-level]="level" [title]="'Compatibilité estimée : ' + score + '%'">
        <span class="value">{{ score }}<small>%</small></span>
        <span class="bar"><span class="fill" [style.width.%]="score"></span></span>
      </span>
    }
  `,
  styles: `
    .score {
      display: inline-flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 2.6rem;
    }
    .value {
      font-size: 0.85rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text);
    }
    small {
      font-size: 0.7rem;
      color: var(--muted);
      font-weight: 500;
    }
    .bar {
      display: block;
      width: 2.6rem;
      height: 3px;
      border-radius: 2px;
      background: var(--surface-2);
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--c-grey);
    }
    .score[data-level='low'] .fill { background: var(--c-red); }
    .score[data-level='mid'] .fill { background: var(--c-amber); }
    .score[data-level='high'] .fill { background: var(--c-green); }
    .score.empty {
      color: var(--faint);
      font-size: 0.82rem;
    }
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
