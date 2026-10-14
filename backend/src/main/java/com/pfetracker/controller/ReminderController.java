package com.pfetracker.controller;

import com.pfetracker.service.FollowUpReminderService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final FollowUpReminderService reminderService;

    public ReminderController(FollowUpReminderService reminderService) {
        this.reminderService = reminderService;
    }

    /**
     * Envoie maintenant le rappel des relances dues (ou un e-mail de test si aucune).
     * @param test si true, envoie un e-mail de test même sans relance due
     */
    @PostMapping("/send-now")
    public Map<String, Object> sendNow(@RequestParam(defaultValue = "true") boolean test) {
        return reminderService.sendNowForCurrentUser(test);
    }
}
