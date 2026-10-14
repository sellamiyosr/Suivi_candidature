package com.pfetracker.dto.profile;

import java.util.ArrayList;
import java.util.List;

public class ProfileResponse {

    private String email;
    private String skills;
    private List<String> skillsList = new ArrayList<>();
    private boolean emailRemindersEnabled = true;
    private boolean mailConfigured;

    public ProfileResponse() {
    }

    public ProfileResponse(
            String email,
            String skills,
            List<String> skillsList,
            boolean emailRemindersEnabled,
            boolean mailConfigured
    ) {
        this.email = email;
        this.skills = skills;
        this.skillsList = skillsList != null ? skillsList : new ArrayList<>();
        this.emailRemindersEnabled = emailRemindersEnabled;
        this.mailConfigured = mailConfigured;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public List<String> getSkillsList() {
        return skillsList;
    }

    public void setSkillsList(List<String> skillsList) {
        this.skillsList = skillsList;
    }

    public boolean isEmailRemindersEnabled() {
        return emailRemindersEnabled;
    }

    public void setEmailRemindersEnabled(boolean emailRemindersEnabled) {
        this.emailRemindersEnabled = emailRemindersEnabled;
    }

    public boolean isMailConfigured() {
        return mailConfigured;
    }

    public void setMailConfigured(boolean mailConfigured) {
        this.mailConfigured = mailConfigured;
    }
}
