package com.pfetracker.service;

import com.pfetracker.entity.Application;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.ApplicationRepository;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowUpReminderService {

    private static final Logger log = LoggerFactory.getLogger(FollowUpReminderService.class);

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    public FollowUpReminderService(
            ApplicationRepository applicationRepository,
            UserRepository userRepository,
            MailService mailService
    ) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.mailService = mailService;
    }

    /** Job quotidien : un digest par utilisateur ayant des relances dues non notifiées. */
    @Transactional
    public int sendDueReminders() {
        if (!mailService.canSend()) {
            log.debug("Rappels e-mail ignorés (mail non configuré)");
            return 0;
        }

        LocalDate today = LocalDate.now();
        List<Application> due = applicationRepository.findFollowUpsDueForReminder(today);
        Map<Long, List<Application>> byUser = new LinkedHashMap<>();
        for (Application app : due) {
            User user = app.getUser();
            if (user == null || !user.isEmailRemindersEnabled()) {
                continue;
            }
            byUser.computeIfAbsent(user.getId(), id -> new ArrayList<>()).add(app);
        }

        int sent = 0;
        for (Map.Entry<Long, List<Application>> entry : byUser.entrySet()) {
            List<Application> apps = entry.getValue();
            if (apps.isEmpty()) {
                continue;
            }
            User user = apps.get(0).getUser();
            try {
                sendDigest(user, apps, today, false);
                markRemindersSent(apps, today);
                sent++;
            } catch (Exception e) {
                log.warn("Échec envoi rappel à {}: {}", user.getEmail(), e.getMessage());
            }
        }
        return sent;
    }

    /** Envoi immédiat pour l'utilisateur connecté (test ou manuel). */
    @Transactional
    public Map<String, Object> sendNowForCurrentUser(boolean forceTest) {
        if (!mailService.canSend()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "E-mail non configuré. Définis MAIL_ENABLED=true, MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM."
            );
        }

        User user = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!user.isEmailRemindersEnabled() && !forceTest) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Les rappels e-mail sont désactivés dans ton profil");
        }

        LocalDate today = LocalDate.now();
        List<Application> due = applicationRepository.findFollowUpsDue(user.getId(), today);

        if (due.isEmpty() && forceTest) {
            String subject = "PFE Tracker — test de rappel";
            String body = """
                    Bonjour,

                    Ceci est un e-mail de test depuis PFE Tracker.
                    Aucune relance n'est due aujourd'hui, mais la configuration SMTP fonctionne.

                    Tu recevras un rappel automatique le jour où une relance est prévue.

                    — PFE Tracker
                    """;
            mailService.send(user.getEmail(), subject, body);
            return Map.of(
                    "sent", true,
                    "test", true,
                    "count", 0,
                    "message", "E-mail de test envoyé à " + user.getEmail()
            );
        }

        if (due.isEmpty()) {
            return Map.of(
                    "sent", false,
                    "test", false,
                    "count", 0,
                    "message", "Aucune relance due aujourd'hui"
            );
        }

        sendDigest(user, due, today, true);
        markRemindersSent(due, today);
        return Map.of(
                "sent", true,
                "test", false,
                "count", due.size(),
                "message", "Rappel envoyé à " + user.getEmail() + " (" + due.size() + " relance(s))"
        );
    }

    private void sendDigest(User user, List<Application> apps, LocalDate today, boolean includeAllDue) {
        StringBuilder lines = new StringBuilder();
        int n = 0;
        for (Application app : apps) {
            String label = resolveFollowUpLabel(app, today);
            if (label == null && !includeAllDue) {
                continue;
            }
            if (label == null) {
                label = !app.isFollowUp1Done() ? "Relance 1" : "Relance 2";
            }
            n++;
            lines.append(n)
                    .append(". ")
                    .append(app.getCompany())
                    .append(" — ")
                    .append(app.getJobTitle())
                    .append(" (")
                    .append(label)
                    .append(")\n");
        }

        String subject = "PFE Tracker — " + n + " relance(s) à faire";
        String body = """
                Bonjour,

                Tu as %d relance(s) à faire aujourd'hui (ou en retard) :

                %s
                Ouvre ton tableau de bord PFE Tracker pour marquer les relances et générer le message.

                Astuce : tu peux désactiver ces e-mails dans Paramètres.

                — PFE Tracker
                """.formatted(n, lines);

        mailService.send(user.getEmail(), subject, body);
    }

    private void markRemindersSent(List<Application> apps, LocalDate today) {
        for (Application app : apps) {
            if (!app.isFollowUp1Done()
                    && app.getFollowUp1Date() != null
                    && !app.getFollowUp1Date().isAfter(today)) {
                app.setFollowUp1ReminderSent(true);
            }
            if (app.isFollowUp1Done()
                    && !app.isFollowUp2Done()
                    && app.getFollowUp2Date() != null
                    && !app.getFollowUp2Date().isAfter(today)) {
                app.setFollowUp2ReminderSent(true);
            }
        }
        applicationRepository.saveAll(apps);
    }

    private String resolveFollowUpLabel(Application app, LocalDate today) {
        if (!app.isFollowUp1Done()
                && app.getFollowUp1Date() != null
                && !app.getFollowUp1Date().isAfter(today)) {
            return app.getFollowUp1Date().isEqual(today) ? "Relance 1 aujourd'hui" : "Relance 1 en retard";
        }
        if (app.isFollowUp1Done()
                && !app.isFollowUp2Done()
                && app.getFollowUp2Date() != null
                && !app.getFollowUp2Date().isAfter(today)) {
            return app.getFollowUp2Date().isEqual(today) ? "Relance 2 aujourd'hui" : "Relance 2 en retard";
        }
        return null;
    }
}
