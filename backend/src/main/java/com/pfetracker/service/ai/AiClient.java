package com.pfetracker.service.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.NotFoundException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.errors.UnauthorizedException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.fasterxml.jackson.databind.JsonNode;
import com.pfetracker.entity.AiProvider;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.security.SecretCipher;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Appel générique "prompt -> texte" vers le fournisseur choisi par l'utilisateur.
 * - Ollama / Groq / OpenRouter / URL perso : API compatible chat/completions (HTTP).
 * - Claude : SDK officiel Anthropic.
 */
@Component
public class AiClient {

    private static final Logger log = LoggerFactory.getLogger(AiClient.class);

    private final SecretCipher cipher;
    private final RestClient http;

    public AiClient(SecretCipher cipher) {
        this.cipher = cipher;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);
        factory.setReadTimeout(180_000); // un modèle local peut être lent
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    /** Valeurs par défaut proposées pour chaque fournisseur (modifiables dans Paramètres). */
    public static String defaultBaseUrl(AiProvider provider) {
        return switch (provider) {
            case OLLAMA -> "http://localhost:11434/v1";
            case GROQ -> "https://api.groq.com/openai/v1";
            case OPENROUTER -> "https://openrouter.ai/api/v1";
            case ANTHROPIC, OPENAI_COMPATIBLE -> null;
        };
    }

    public static String defaultModel(AiProvider provider) {
        return switch (provider) {
            case OLLAMA -> "qwen2.5:7b";
            case GROQ -> "openai/gpt-oss-120b";
            case OPENROUTER -> "google/gemma-4-31b-it:free";
            case ANTHROPIC -> "claude-opus-5-5";
            case OPENAI_COMPATIBLE -> null;
        };
    }

    public static boolean requiresKey(AiProvider provider) {
        return provider != AiProvider.OLLAMA && provider != AiProvider.OPENAI_COMPATIBLE;
    }

    public boolean isConfigured(User user) {
        AiProvider provider = user.getAiProvider();
        if (provider == null) {
            return false;
        }
        if (requiresKey(provider) && user.getAiApiKeyEnc() == null) {
            return false;
        }
        return resolveModel(user) != null
                && (provider == AiProvider.ANTHROPIC || resolveBaseUrl(user) != null);
    }

    /** Un tour de conversation : role = "user" ou "assistant". */
    public record Turn(String role, String content) {
    }

    /** Question unique (relance, analyse…). */
    public String complete(User user, String system, String prompt) {
        return chat(user, system, List.of(new Turn("user", prompt)));
    }

    /** Conversation multi-tours (chatbot). Le dernier tour doit venir de l'utilisateur. */
    public String chat(User user, String system, List<Turn> turns) {
        AiProvider provider = user.getAiProvider();
        if (provider == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Aucun assistant IA configuré. Choisis un fournisseur dans Paramètres.");
        }
        String apiKey = cipher.decrypt(user.getAiApiKeyEnc());
        if (requiresKey(provider) && apiKey == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Clé API manquante : ajoute-la dans Paramètres.");
        }
        String model = resolveModel(user);
        if (model == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Nom du modèle manquant : renseigne-le dans Paramètres.");
        }
        return provider == AiProvider.ANTHROPIC
                ? completeWithClaude(apiKey, model, system, turns)
                : completeOpenAiCompatible(provider, resolveBaseUrl(user), apiKey, model, system, turns);
    }

    /* ------------------------------------------------------------ Claude (SDK officiel) */

    private String completeWithClaude(String apiKey, String model, String system, List<Turn> turns) {
        AnthropicClient client = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
        try {
            MessageCreateParams.Builder builder = MessageCreateParams.builder()
                    .model(model)
                    .maxTokens(16000L)
                    .system(system);
            for (Turn turn : turns) {
                if ("assistant".equals(turn.role())) {
                    builder.addAssistantMessage(turn.content());
                } else {
                    builder.addUserMessage(turn.content());
                }
            }
            MessageCreateParams params = builder.build();
            Message response = client.messages().create(params);

            String stop = response.stopReason().map(Object::toString).orElse("");
            if ("refusal".equalsIgnoreCase(stop)) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Le modèle a refusé de répondre à cette demande.");
            }
            String text = response.content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(t -> t.text())
                    .collect(Collectors.joining("\n"))
                    .trim();
            if (text.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Réponse vide du modèle.");
            }
            return text;
        } catch (UnauthorizedException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Clé API Anthropic invalide.");
        } catch (NotFoundException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Modèle introuvable : vérifie le nom du modèle (ex. claude-opus-5-5).");
        } catch (RateLimitException e) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Limite de requêtes atteinte, réessaie dans un instant.");
        } catch (AnthropicServiceException e) {
            log.warn("Erreur API Anthropic: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Erreur du service Claude : " + e.getMessage());
        } catch (AnthropicIoException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Impossible de joindre l'API Claude (réseau).");
        } finally {
            client.close();
        }
    }

    /* ------------------------------------------------------------ API compatible chat/completions */

    private String completeOpenAiCompatible(
            AiProvider provider, String baseUrl, String apiKey, String model, String system, List<Turn> turns
    ) {
        if (baseUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "URL de l'API manquante : renseigne-la dans Paramètres.");
        }
        List<Map<String, String>> messages = new java.util.ArrayList<>();
        messages.add(Map.of("role", "system", "content", system));
        for (Turn turn : turns) {
            messages.add(Map.of("role", "assistant".equals(turn.role()) ? "assistant" : "user", "content", turn.content()));
        }
        // Marge large : certains modèles (ex. gpt-oss) comptent aussi leur raisonnement dans ce budget
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "max_tokens", 4000,
                "stream", false
        );
        try {
            JsonNode json = http.post()
                    .uri(stripSlash(baseUrl) + "/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> {
                        if (apiKey != null) {
                            h.setBearerAuth(apiKey);
                        }
                    })
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String text = json == null ? "" : json.path("choices").path(0).path("message").path("content").asText("").trim();
            if (text.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Réponse vide du modèle.");
            }
            return text;
        } catch (RestClientResponseException e) {
            int code = e.getStatusCode().value();
            log.warn("Erreur IA {} ({}): {}", provider, code, e.getResponseBodyAsString());
            String msg = switch (code) {
                case 401, 403 -> "Clé API refusée par " + label(provider) + ".";
                case 404 -> "Modèle « " + model + " » introuvable chez " + label(provider) + ". Vérifie son nom.";
                case 429 -> "Limite de requêtes atteinte chez " + label(provider) + ", réessaie plus tard.";
                default -> "Erreur " + code + " de " + label(provider) + ".";
            };
            throw new ApiException(code == 429 ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_REQUEST, msg);
        } catch (ResourceAccessException e) {
            String msg = provider == AiProvider.OLLAMA
                    ? "Ollama ne répond pas sur " + baseUrl + ". Lance l'application Ollama puis « ollama pull " + model + " »."
                    : "Impossible de joindre " + label(provider) + " (" + baseUrl + ").";
            throw new ApiException(HttpStatus.BAD_GATEWAY, msg);
        }
    }

    public String resolveModel(User user) {
        String model = user.getAiModel();
        if (model != null && !model.isBlank()) {
            return model.trim();
        }
        return user.getAiProvider() == null ? null : defaultModel(user.getAiProvider());
    }

    public String resolveBaseUrl(User user) {
        String url = user.getAiBaseUrl();
        if (url != null && !url.isBlank()) {
            return url.trim();
        }
        return user.getAiProvider() == null ? null : defaultBaseUrl(user.getAiProvider());
    }

    private static String stripSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String label(AiProvider provider) {
        return switch (provider) {
            case OLLAMA -> "Ollama";
            case GROQ -> "Groq";
            case OPENROUTER -> "OpenRouter";
            case ANTHROPIC -> "Claude";
            case OPENAI_COMPATIBLE -> "l'API";
        };
    }
}
