package com.pfetracker.entity;

/** Fournisseurs d'IA pris en charge. */
public enum AiProvider {
    /** Modèle open-source local via Ollama (gratuit, sans clé). */
    OLLAMA,
    /** API Groq (modèles open-source hébergés, offre gratuite). */
    GROQ,
    /** OpenRouter (accès à de nombreux modèles, certains gratuits). */
    OPENROUTER,
    /** Claude (Anthropic) via le SDK officiel. */
    ANTHROPIC,
    /** N'importe quelle API compatible "chat/completions" (URL personnalisée). */
    OPENAI_COMPATIBLE
}
