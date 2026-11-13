import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application } from '../models/application.model';

export type AiProviderId = 'OLLAMA' | 'GROQ' | 'OPENROUTER' | 'ANTHROPIC' | 'OPENAI_COMPATIBLE';

export interface IntegrationSettings {
  smtpEmail: string | null;
  smtpPassword?: string | null; // écriture seule
  smtpHost: string | null;
  smtpPort: number | null;
  smtpPasswordConfigured?: boolean;
  smtpHostResolved?: string | null;
  mailReady?: boolean;

  aiProvider: AiProviderId | null;
  aiModel: string | null;
  aiBaseUrl: string | null;
  aiApiKey?: string | null; // écriture seule
  aiApiKeyConfigured?: boolean;
  aiReady?: boolean;
}

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  tag: string;
  description: string;
  needsKey: boolean;
  needsBaseUrl: boolean;
  defaultModel: string;
  defaultBaseUrl: string;
  keyUrl?: string;
  keyHint?: string;
  /** Page listant les modèles disponibles (les noms changent souvent). */
  modelsUrl?: string;
}

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'OLLAMA',
    label: 'Ollama (local)',
    tag: 'Gratuit · open-source',
    description: 'Le modèle tourne sur ton PC. Aucune clé, rien ne sort de ta machine. Installe Ollama puis « ollama pull qwen2.5:7b ».',
    needsKey: false,
    needsBaseUrl: true,
    defaultModel: 'qwen2.5:7b',
    defaultBaseUrl: 'http://localhost:11434/v1',
    keyUrl: 'https://ollama.com/download',
    keyHint: 'Télécharger Ollama'
  },
  {
    id: 'GROQ',
    label: 'Groq',
    tag: 'Offre gratuite · open-source',
    description: 'Modèles open-source (GPT-OSS, Llama, Qwen…) hébergés, très rapides. Clé gratuite avec limites quotidiennes.',
    needsKey: true,
    needsBaseUrl: false,
    defaultModel: 'openai/gpt-oss-120b',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'Créer une clé Groq',
    modelsUrl: 'https://console.groq.com/docs/models'
  },
  {
    id: 'OPENROUTER',
    label: 'OpenRouter',
    tag: 'Modèles « :free »',
    description: 'Accès à de nombreux modèles ; ceux dont le nom finit par « :free » sont gratuits (avec limites). La liste change souvent.',
    needsKey: true,
    needsBaseUrl: false,
    defaultModel: 'google/gemma-4-31b-it:free',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'Créer une clé OpenRouter',
    modelsUrl: 'https://openrouter.ai/models?q=free'
  },
  {
    id: 'ANTHROPIC',
    label: 'Claude (Anthropic)',
    tag: 'Payant · meilleure qualité',
    description: 'Rédaction et analyse de meilleure qualité en français. Facturé à l’usage, nécessite une clé API.',
    needsKey: true,
    needsBaseUrl: false,
    defaultModel: 'claude-opus-5-5',
    defaultBaseUrl: '',
    keyUrl: 'https://platform.claude.com',
    keyHint: 'Console Anthropic'
  },
  {
    id: 'OPENAI_COMPATIBLE',
    label: 'Autre (compatible OpenAI)',
    tag: 'Personnalisé',
    description: 'N’importe quel service exposant /chat/completions (LM Studio, serveur perso…). Indique l’URL et le modèle.',
    needsKey: false,
    needsBaseUrl: true,
    defaultModel: '',
    defaultBaseUrl: 'http://localhost:1234/v1'
  }
];

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private readonly api = `${environment.apiUrl}/settings/integrations`;
  private readonly appsApi = `${environment.apiUrl}/applications`;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<IntegrationSettings> {
    return this.http.get<IntegrationSettings>(this.api);
  }

  update(payload: IntegrationSettings): Observable<IntegrationSettings> {
    return this.http.put<IntegrationSettings>(this.api, payload);
  }

  testMail(send = true): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(`${this.api}/mail/test?send=${send}`, {});
  }

  testAi(): Observable<{ ok: boolean; message: string; durationMs: number; model: string }> {
    return this.http.post<{ ok: boolean; message: string; durationMs: number; model: string }>(`${this.api}/ai/test`, {});
  }

  /* ---------- Chatbot ---------- */

  chat(messages: { role: 'user' | 'assistant'; content: string }[]): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(`${environment.apiUrl}/ai/chat`, { messages });
  }

  /* ---------- Fonctions IA sur une candidature ---------- */

  aiFollowUp(id: number): Observable<{ subject: string; body: string; to: string }> {
    return this.http.post<{ subject: string; body: string; to: string }>(`${this.appsApi}/${id}/ai/follow-up`, {});
  }

  aiAnalysis(id: number): Observable<{ analysis: string; usedCv: string }> {
    return this.http.post<{ analysis: string; usedCv: string }>(`${this.appsApi}/${id}/ai/analysis`, {});
  }

  sendFollowUp(
    id: number,
    payload: { to: string; subject: string; body: string; markDone: boolean }
  ): Observable<Application> {
    return this.http.post<Application>(`${this.appsApi}/${id}/follow-up/send`, payload);
  }
}
