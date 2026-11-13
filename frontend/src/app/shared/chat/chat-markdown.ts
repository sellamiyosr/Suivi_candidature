/**
 * Mini rendu Markdown pour les réponses du chatbot, sans innerHTML (pas de risque d'injection).
 * Gère : titres (#), puces (-, *, 1.), **gras**, `code`, liens [texte](url).
 * Les liens "#/…" deviennent des liens internes Angular.
 */

export interface Inline {
  kind: 'text' | 'bold' | 'code' | 'route' | 'url';
  text: string;
  href?: string;
}

export interface Block {
  kind: 'p' | 'h' | 'ul' | 'ol';
  inlines?: Inline[];
  items?: Inline[][];
}

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: 'text', text: text.slice(last, idx) });
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push({ kind: 'bold', text: tok.slice(2, -2) });
    } else if (tok.startsWith('`')) {
      out.push({ kind: 'code', text: tok.slice(1, -1) });
    } else {
      const label = tok.slice(1, tok.indexOf(']('));
      const href = tok.slice(tok.indexOf('](') + 2, -1);
      if (href.startsWith('#/')) {
        out.push({ kind: 'route', text: label, href: href.slice(1) });
      } else if (/^https?:\/\//i.test(href)) {
        out.push({ kind: 'url', text: label, href });
      } else {
        out.push({ kind: 'text', text: label });
      }
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'p', inlines: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', inlines: parseInline(heading[1]) });
    } else if (bullet || numbered) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const item = parseInline((bullet ?? numbered)![1]);
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === kind) prev.items!.push(item);
      else blocks.push({ kind, items: [item] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
