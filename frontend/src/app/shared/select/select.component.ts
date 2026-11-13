import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  forwardRef,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
  /** Statut pour afficher un point coloré (EN_ATTENTE, ENTRETIEN…). */
  dot?: string;
  /** Couleur libre du point (ex. priorité). */
  color?: string;
}

/**
 * Liste déroulante maison, stylée comme le reste de l'app.
 * Compatible formControlName / ngModel, ou [value] + (valueChange).
 *
 * Variantes :
 *  - default : champ de formulaire pleine largeur
 *  - filter  : bouton compact, mis en avant quand une valeur est choisie
 *  - pill    : pastille de statut colorée (tableau)
 */
@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }
  ],
  host: {
    '[class.variant-default]': "variant === 'default'",
    '[class.variant-filter]': "variant === 'filter'",
    '[class.variant-pill]': "variant === 'pill'"
  }
})
export class SelectComponent implements ControlValueAccessor {
  /** Une seule liste ouverte à la fois dans toute l'app. */
  private static openInstance: SelectComponent | null = null;

  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Choisir…';
  @Input() variant: 'default' | 'filter' | 'pill' = 'default';
  @Input() ariaLabel = '';
  /** Valeur vide = "aucun filtre" : affiche le placeholder. */
  @Input() set value(v: string | null | undefined) {
    this.current.set(v ?? '');
  }
  @Input() set disabled(v: boolean) {
    this.isDisabled.set(!!v);
  }
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLButtonElement>;

  readonly current = signal('');
  readonly isDisabled = signal(false);
  readonly open = signal(false);
  readonly activeIndex = signal(-1);
  readonly panelStyle = signal<Record<string, string>>({});

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  get selected(): SelectOption | undefined {
    return this.options.find((o) => o.value === this.current());
  }

  get hasValue(): boolean {
    return this.current() !== '' && !!this.selected;
  }

  /* ---------- ControlValueAccessor ---------- */
  writeValue(v: string | null): void {
    this.current.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.isDisabled.set(d);
  }

  /* ---------- Ouverture / fermeture ---------- */
  toggle(event?: Event): void {
    // Pas de stopPropagation : les autres listes doivent voir ce clic pour se fermer.
    if (this.isDisabled()) return;
    this.open() ? this.close() : this.openPanel();
  }

  openPanel(): void {
    if (SelectComponent.openInstance && SelectComponent.openInstance !== this) {
      SelectComponent.openInstance.close();
    }
    SelectComponent.openInstance = this;

    const rect = this.trigger.nativeElement.getBoundingClientRect();
    // Largeur estimée d'après le libellé le plus long, pour ne rien couper
    const longest = Math.max(...this.options.map((o) => o.label.length), 0);
    const estimated = Math.min(320, longest * 8 + 64);
    const width = Math.max(rect.width, estimated);
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxHeight = 300;
    const openUp = spaceBelow < Math.min(maxHeight, this.options.length * 38 + 12) && rect.top > spaceBelow;
    const left = Math.min(rect.left, window.innerWidth - width - 8);

    this.panelStyle.set({
      left: `${Math.max(8, left)}px`,
      'min-width': `${width}px`,
      'max-width': '20rem',
      'max-height': `${maxHeight}px`,
      ...(openUp
        ? { bottom: `${window.innerHeight - rect.top + 6}px` }
        : { top: `${rect.bottom + 6}px` })
    });
    const idx = this.options.findIndex((o) => o.value === this.current());
    this.activeIndex.set(idx >= 0 ? idx : 0);
    this.open.set(true);
  }

  close(): void {
    if (SelectComponent.openInstance === this) {
      SelectComponent.openInstance = null;
    }
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
  }

  choose(option: SelectOption, event?: Event): void {
    event?.stopPropagation();
    if (option.value !== this.current()) {
      this.current.set(option.value);
      this.onChange(option.value);
      this.valueChange.emit(option.value);
    }
    this.close();
    this.trigger.nativeElement.focus();
  }

  /* ---------- Clavier ---------- */
  onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const n = this.options.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) this.openPanel();
        else this.activeIndex.set((this.activeIndex() + 1) % n);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) this.openPanel();
        else this.activeIndex.set((this.activeIndex() - 1 + n) % n);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) this.openPanel();
        else if (this.options[this.activeIndex()]) this.choose(this.options[this.activeIndex()]);
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  /* ---------- Fermeture automatique ---------- */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.close();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    // Ne pas fermer si on fait défiler la liste elle-même
    const target = event.target as HTMLElement | null;
    if (target && target.classList?.contains('panel')) return;
    this.close();
  }
}
