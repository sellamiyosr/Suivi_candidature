import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IntegrationsService } from '../../core/services/integrations.service';
import { Block, parseMarkdown } from './chat-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  blocks?: Block[];
  error?: boolean;
}

const STORAGE_KEY = 'pfe_chat_history';

/** Assistant conversationnel flottant, disponible sur toutes les pages. */
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent implements AfterViewChecked {
  private readonly integrations = inject(IntegrationsService);

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;
  @ViewChild('input') input?: ElementRef<HTMLTextAreaElement>;

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly aiReady = signal<boolean | null>(null);
  readonly messages = signal<ChatMessage[]>(this.restore());
  draft = '';
  private shouldScroll = false;

  readonly suggestions = [
    'Quelles relances dois-je faire aujourd’hui ?',
    'Résume l’état de mes candidatures',
    'Quelles offres correspondent le mieux à mon profil ?',
    'Comment préparer un entretien de stage ?'
  ];

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      this.checkReady();
      this.shouldScroll = true;
      setTimeout(() => this.input?.nativeElement.focus(), 50);
    }
  }

  close(): void {
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }

  ask(text: string): void {
    this.draft = text;
    this.send();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.sending()) return;

    // Retire une éventuelle erreur précédente avant de relancer
    const history = this.messages().filter((m) => !m.error);
    const next: ChatMessage[] = [...history, { role: 'user', content: text }];
    this.messages.set(next);
    this.draft = '';
    this.sending.set(true);
    this.shouldScroll = true;
    this.persist();

    this.integrations
      .chat(next.map((m) => ({ role: m.role, content: m.content })))
      .subscribe({
        next: (r) => {
          this.messages.update((list) => [
            ...list,
            { role: 'assistant', content: r.reply, blocks: parseMarkdown(r.reply) }
          ]);
          this.sending.set(false);
          this.shouldScroll = true;
          this.persist();
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Le service IA ne répond pas. Réessaie dans un instant.';
          this.messages.update((list) => [
            ...list,
            { role: 'assistant', content: msg, blocks: parseMarkdown(msg), error: true }
          ]);
          this.sending.set(false);
          this.shouldScroll = true;
        }
      });
  }

  clear(): void {
    this.messages.set([]);
    this.persist();
  }

  /** Ferme le panneau quand on suit un lien interne sur petit écran. */
  onRouteLink(): void {
    if (window.innerWidth < 700) this.close();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scroller) {
      const el = this.scroller.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  private checkReady(): void {
    this.integrations.get().subscribe({
      next: (s) => this.aiReady.set(!!s.aiReady),
      error: () => this.aiReady.set(false)
    });
  }

  private persist(): void {
    try {
      const plain = this.messages()
        .filter((m) => !m.error)
        .slice(-30)
        .map(({ role, content }) => ({ role, content }));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    } catch {
      /* stockage indisponible : ignorer */
    }
  }

  private restore(): ChatMessage[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw) as { role: 'user' | 'assistant'; content: string }[];
      return list.map((m) => ({
        ...m,
        blocks: m.role === 'assistant' ? parseMarkdown(m.content) : undefined
      }));
    } catch {
      return [];
    }
  }
}
