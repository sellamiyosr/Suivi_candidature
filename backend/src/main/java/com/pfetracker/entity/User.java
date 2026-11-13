package com.pfetracker.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Compétences / mots-clés du profil (souvent remplis depuis le CV). */
    @Column(columnDefinition = "TEXT")
    private String skills;

    /** Rappels e-mail pour les relances dues (vers l'email du compte). */
    @Column(name = "email_reminders_enabled", nullable = false)
    private boolean emailRemindersEnabled = true;

    /* ---------- Envoi d'e-mails avec le compte de l'utilisateur (SMTP) ---------- */

    @Column(name = "smtp_email", length = 255)
    private String smtpEmail;

    /** Mot de passe d'application, chiffré (AES-GCM). Jamais renvoyé au client. */
    @Column(name = "smtp_password_enc", columnDefinition = "TEXT")
    private String smtpPasswordEnc;

    @Column(name = "smtp_host", length = 255)
    private String smtpHost;

    @Column(name = "smtp_port")
    private Integer smtpPort;

    /* ---------- Assistant IA ---------- */

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_provider", length = 30)
    private AiProvider aiProvider;

    @Column(name = "ai_model", length = 120)
    private String aiModel;

    @Column(name = "ai_base_url", length = 500)
    private String aiBaseUrl;

    /** Clé API chiffrée (AES-GCM). Jamais renvoyée au client. */
    @Column(name = "ai_api_key_enc", columnDefinition = "TEXT")
    private String aiApiKeyEnc;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public boolean isEmailRemindersEnabled() {
        return emailRemindersEnabled;
    }

    public void setEmailRemindersEnabled(boolean emailRemindersEnabled) {
        this.emailRemindersEnabled = emailRemindersEnabled;
    }

    public String getSmtpEmail() {
        return smtpEmail;
    }

    public void setSmtpEmail(String smtpEmail) {
        this.smtpEmail = smtpEmail;
    }

    public String getSmtpPasswordEnc() {
        return smtpPasswordEnc;
    }

    public void setSmtpPasswordEnc(String smtpPasswordEnc) {
        this.smtpPasswordEnc = smtpPasswordEnc;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(Integer smtpPort) {
        this.smtpPort = smtpPort;
    }

    public AiProvider getAiProvider() {
        return aiProvider;
    }

    public void setAiProvider(AiProvider aiProvider) {
        this.aiProvider = aiProvider;
    }

    public String getAiModel() {
        return aiModel;
    }

    public void setAiModel(String aiModel) {
        this.aiModel = aiModel;
    }

    public String getAiBaseUrl() {
        return aiBaseUrl;
    }

    public void setAiBaseUrl(String aiBaseUrl) {
        this.aiBaseUrl = aiBaseUrl;
    }

    public String getAiApiKeyEnc() {
        return aiApiKeyEnc;
    }

    public void setAiApiKeyEnc(String aiApiKeyEnc) {
        this.aiApiKeyEnc = aiApiKeyEnc;
    }
}
