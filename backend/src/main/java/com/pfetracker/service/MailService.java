package com.pfetracker.service;

import com.pfetracker.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final AppProperties appProperties;
    private final JavaMailSender mailSender;

    public MailService(
            AppProperties appProperties,
            @Autowired(required = false) JavaMailSender mailSender
    ) {
        this.appProperties = appProperties;
        this.mailSender = mailSender;
    }

    public boolean canSend() {
        return appProperties.getMail().isEnabled() && mailSender != null;
    }

    public void send(String to, String subject, String body) {
        if (!canSend()) {
            throw new IllegalStateException(
                    "E-mail désactivé. Configure MAIL_ENABLED=true et MAIL_HOST / MAIL_USERNAME / MAIL_PASSWORD."
            );
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(appProperties.getMail().getFrom());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
        log.info("E-mail envoyé à {}", to);
    }
}
