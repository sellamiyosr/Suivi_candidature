package com.pfetracker.service;

import com.pfetracker.dto.settings.IntegrationSettings;
import com.pfetracker.entity.AiProvider;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecretCipher;
import com.pfetracker.security.SecurityUtils;
import com.pfetracker.service.ai.AiClient;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IntegrationSettingsService {

    private final UserRepository userRepository;
    private final SecretCipher cipher;
    private final MailService mailService;
    private final AiClient aiClient;

    public IntegrationSettingsService(
            UserRepository userRepository, SecretCipher cipher, MailService mailService, AiClient aiClient
    ) {
        this.userRepository = userRepository;
        this.cipher = cipher;
        this.mailService = mailService;
        this.aiClient = aiClient;
    }

    @Transactional(readOnly = true)
    public IntegrationSettings get() {
        return toDto(currentUser());
    }

    @Transactional
    public IntegrationSettings update(IntegrationSettings req) {
        User user = currentUser();

        // ---- E-mail
        String email = trimToNull(req.getSmtpEmail());
        if (email != null && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Adresse e-mail d'envoi invalide.");
        }
        user.setSmtpEmail(email);
        user.setSmtpHost(trimToNull(req.getSmtpHost()));
        Integer port = req.getSmtpPort();
        if (port != null && (port < 1 || port > 65535)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Port SMTP invalide.");
        }
        user.setSmtpPort(port);
        if (req.getSmtpPassword() != null) {
            // Les mots de passe d'application Google s'affichent avec des espaces : on les retire.
            String pwd = req.getSmtpPassword().replaceAll("\\s+", "");
            user.setSmtpPasswordEnc(pwd.isEmpty() ? null : cipher.encrypt(pwd));
        }
        if (email == null) {
            user.setSmtpPasswordEnc(null);
        }

        // ---- IA
        AiProvider provider = parseProvider(req.getAiProvider());
        if (provider != user.getAiProvider()) {
            // Changement de fournisseur : l'ancienne clé ne sert plus à rien
            user.setAiApiKeyEnc(null);
        }
        user.setAiProvider(provider);
        user.setAiModel(trimToNull(req.getAiModel()));
        user.setAiBaseUrl(trimToNull(req.getAiBaseUrl()));
        if (req.getAiApiKey() != null) {
            String key = req.getAiApiKey().trim();
            user.setAiApiKeyEnc(key.isEmpty() ? null : cipher.encrypt(key));
        }
        if (provider == null) {
            user.setAiApiKeyEnc(null);
            user.setAiModel(null);
            user.setAiBaseUrl(null);
        }

        userRepository.save(user);
        return toDto(user);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> testMail(boolean sendEmail) {
        User user = currentUser();
        mailService.testUserConnection(user);
        if (sendEmail) {
            mailService.sendWithUserAccount(
                    user,
                    user.getSmtpEmail(),
                    "PFE Tracker — e-mail de test",
                    "Bonjour,\n\nTon compte d'envoi est bien configuré dans PFE Tracker.\n"
                            + "Tu peux maintenant envoyer tes relances directement depuis l'application.\n\n— PFE Tracker"
            );
            return Map.of("ok", true, "message", "Connexion réussie, e-mail de test envoyé à " + user.getSmtpEmail());
        }
        return Map.of("ok", true, "message", "Connexion au serveur e-mail réussie.");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> testAi() {
        User user = currentUser();
        long start = System.currentTimeMillis();
        String reply = aiClient.complete(
                user,
                "Tu réponds en une seule phrase courte, en français.",
                "Dis bonjour et confirme que tu es prêt à aider pour des candidatures."
        );
        long ms = System.currentTimeMillis() - start;
        return Map.of("ok", true, "message", reply, "durationMs", ms, "model", aiClient.resolveModel(user));
    }

    private IntegrationSettings toDto(User user) {
        IntegrationSettings dto = new IntegrationSettings();
        dto.setSmtpEmail(user.getSmtpEmail());
        dto.setSmtpHost(user.getSmtpHost());
        dto.setSmtpPort(user.getSmtpPort());
        dto.setSmtpPasswordConfigured(user.getSmtpPasswordEnc() != null);
        dto.setSmtpHostResolved(user.getSmtpEmail() == null ? null : mailService.resolveHost(user));
        dto.setMailReady(mailService.hasUserSmtp(user));

        dto.setAiProvider(user.getAiProvider() == null ? null : user.getAiProvider().name());
        dto.setAiModel(user.getAiModel());
        dto.setAiBaseUrl(user.getAiBaseUrl());
        dto.setAiApiKeyConfigured(user.getAiApiKeyEnc() != null);
        dto.setAiReady(aiClient.isConfigured(user));
        return dto;
    }

    private static AiProvider parseProvider(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return AiProvider.valueOf(value.trim());
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fournisseur IA inconnu : " + value);
        }
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
