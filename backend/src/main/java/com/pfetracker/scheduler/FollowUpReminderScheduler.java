package com.pfetracker.scheduler;

import com.pfetracker.service.FollowUpReminderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class FollowUpReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(FollowUpReminderScheduler.class);

    private final FollowUpReminderService reminderService;

    public FollowUpReminderScheduler(FollowUpReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @Scheduled(cron = "${app.reminder.cron:0 0 8 * * *}", zone = "${app.reminder.zone:Europe/Paris}")
    public void dailyReminders() {
        int sent = reminderService.sendDueReminders();
        if (sent > 0) {
            log.info("Rappels e-mail envoyés à {} utilisateur(s)", sent);
        }
    }
}
