package com.pfetracker.service;

import com.pfetracker.config.AppProperties;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.security.SecretCipher;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Locale;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Envoi d'e-mails.
 * Priorité au compte de l'utilisateur (e-mail + mot de passe d'application saisis dans Paramètres) ;
 * sinon, repli sur la configuration globale du serveur (MAIL_* en variables d'environnement).
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final AppProperties appProperties;
    private final JavaMailSender globalSender;
    private final SecretCipher cipher;

    public MailService(
            AppProperties appProperties,
            @Autowired(required = false) JavaMailSender globalSender,
            SecretCipher cipher
    ) {
        this.appProperties = appProperties;
        this.globalSender = globalSender;
        this.cipher = cipher;
    }

    /** L'utilisateur a configuré son propre compte d'envoi. */
    public boolean hasUserSmtp(User user) {
        return user != null
                && user.getSmtpEmail() != null
                && user.getSmtpPasswordEnc() != null
                && resolveHost(user) != null;
    }

    public boolean hasGlobalSmtp() {
        return appProperties.getMail().isEnabled() && globalSender != null;
    }

    public boolean canSendFor(User user) {
        return hasUserSmtp(user) || hasGlobalSmtp();
    }

    /** Rappel / notification vers l'utilisateur lui-même : compte perso, sinon serveur. */
    public void sendNotification(User user, String subject, String body) {
        if (hasUserSmtp(user)) {
            sendWithUserAccount(user, user.getEmail(), subject, body);
            return;
        }
        if (!hasGlobalSmtp()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Aucun compte e-mail configuré. Ajoute ton e-mail et ton mot de passe d'application dans Paramètres."
            );
        }
        try {
            MimeMessage message = globalSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(appProperties.getMail().getFrom());
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(body, false);
            globalSender.send(message);
            log.info("Notification envoyée (serveur) à l'utilisateur {}", user.getId());
        } catch (MessagingException | MailException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Échec de l'envoi : " + e.getMessage());
        }
    }

    /** E-mail vers un tiers (recruteur) : uniquement avec le compte de l'utilisateur. */
    public void sendWithUserAccount(User user, String to, String subject, String body) {
        if (!hasUserSmtp(user)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Configure ton adresse e-mail d'envoi et ton mot de passe d'application dans Paramètres."
            );
        }
        JavaMailSenderImpl sender = buildUserSender(user);
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(user.getSmtpEmail());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            sender.send(message);
            log.info("E-mail envoyé avec le compte de l'utilisateur {}", user.getId());
        } catch (MailAuthenticationException e) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Connexion refusée par le serveur e-mail : vérifie l'adresse et le mot de passe d'application."
            );
        } catch (MessagingException | MailException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Échec de l'envoi : " + e.getMessage());
        }
    }

    /** Vérifie les identifiants SMTP sans envoyer de message. */
    public void testUserConnection(User user) {
        if (!hasUserSmtp(user)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Renseigne d'abord l'adresse e-mail et le mot de passe d'application.");
        }
        try {
            buildUserSender(user).testConnection();
        } catch (MessagingException e) {
            String msg = e.getMessage() != null && e.getMessage().toLowerCase(Locale.ROOT).contains("auth")
                    ? "Identifiants refusés : vérifie l'adresse et le mot de passe d'application."
                    : "Connexion impossible au serveur " + resolveHost(user) + " : " + e.getMessage();
            throw new ApiException(HttpStatus.BAD_REQUEST, msg);
        }
    }

    private JavaMailSenderImpl buildUserSender(User user) {
        String password = cipher.decrypt(user.getSmtpPasswordEnc());
        if (password == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mot de passe e-mail illisible : enregistre-le à nouveau dans Paramètres.");
        }
        int port = user.getSmtpPort() != null ? user.getSmtpPort() : 587;

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(resolveHost(user));
        sender.setPort(port);
        sender.setUsername(user.getSmtpEmail());
        sender.setPassword(password);
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        if (port == 465) {
            props.put("mail.smtp.ssl.enable", "true");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        return sender;
    }

    /** Serveur SMTP saisi, sinon déduit du domaine de l'adresse (Gmail, Outlook, Yahoo). */
    public String resolveHost(User user) {
        if (user.getSmtpHost() != null && !user.getSmtpHost().isBlank()) {
            return user.getSmtpHost().trim();
        }
        return defaultHostFor(user.getSmtpEmail());
    }

    public static String defaultHostFor(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        String domain = email.substring(email.indexOf('@') + 1).toLowerCase(Locale.ROOT);
        if (domain.equals("gmail.com") || domain.equals("googlemail.com")) {
            return "smtp.gmail.com";
        }
        if (domain.matches("(outlook|hotmail|live|msn)\\.[a-z.]+")) {
            return "smtp-mail.outlook.com";
        }
        if (domain.startsWith("yahoo.")) {
            return "smtp.mail.yahoo.com";
        }
        return null;
    }
}
