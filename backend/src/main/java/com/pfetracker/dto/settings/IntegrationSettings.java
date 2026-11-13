package com.pfetracker.dto.settings;

/**
 * Réglages e-mail + IA de l'utilisateur.
 * En lecture, les secrets ne sont jamais renvoyés : seuls les indicateurs *Configured le sont.
 * En écriture : secret null = inchangé ; chaîne vide = supprimer ; sinon = remplacer.
 */
public class IntegrationSettings {

    // E-mail
    private String smtpEmail;
    private String smtpPassword;
    private String smtpHost;
    private Integer smtpPort;
    private boolean smtpPasswordConfigured;
    private String smtpHostResolved;
    private boolean mailReady;

    // IA
    private String aiProvider;
    private String aiModel;
    private String aiBaseUrl;
    private String aiApiKey;
    private boolean aiApiKeyConfigured;
    private boolean aiReady;

    public String getSmtpEmail() { return smtpEmail; }
    public void setSmtpEmail(String smtpEmail) { this.smtpEmail = smtpEmail; }

    public String getSmtpPassword() { return smtpPassword; }
    public void setSmtpPassword(String smtpPassword) { this.smtpPassword = smtpPassword; }

    public String getSmtpHost() { return smtpHost; }
    public void setSmtpHost(String smtpHost) { this.smtpHost = smtpHost; }

    public Integer getSmtpPort() { return smtpPort; }
    public void setSmtpPort(Integer smtpPort) { this.smtpPort = smtpPort; }

    public boolean isSmtpPasswordConfigured() { return smtpPasswordConfigured; }
    public void setSmtpPasswordConfigured(boolean v) { this.smtpPasswordConfigured = v; }

    public String getSmtpHostResolved() { return smtpHostResolved; }
    public void setSmtpHostResolved(String smtpHostResolved) { this.smtpHostResolved = smtpHostResolved; }

    public boolean isMailReady() { return mailReady; }
    public void setMailReady(boolean mailReady) { this.mailReady = mailReady; }

    public String getAiProvider() { return aiProvider; }
    public void setAiProvider(String aiProvider) { this.aiProvider = aiProvider; }

    public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }

    public String getAiBaseUrl() { return aiBaseUrl; }
    public void setAiBaseUrl(String aiBaseUrl) { this.aiBaseUrl = aiBaseUrl; }

    public String getAiApiKey() { return aiApiKey; }
    public void setAiApiKey(String aiApiKey) { this.aiApiKey = aiApiKey; }

    public boolean isAiApiKeyConfigured() { return aiApiKeyConfigured; }
    public void setAiApiKeyConfigured(boolean v) { this.aiApiKeyConfigured = v; }

    public boolean isAiReady() { return aiReady; }
    public void setAiReady(boolean aiReady) { this.aiReady = aiReady; }
}
