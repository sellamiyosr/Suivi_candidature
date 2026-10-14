package com.pfetracker.dto.application;

import com.pfetracker.entity.Application;
import com.pfetracker.entity.ApplicationStatus;
import com.pfetracker.entity.Priority;
import java.time.Instant;
import java.time.LocalDate;

public class ApplicationResponse {

    private Long id;
    private String company;
    private String jobTitle;
    private String jobUrl;
    private String reference;
    private String platform;
    private String location;
    private String description;
    private String importantElements;
    private String skills;
    private String contactName;
    private String contactEmail;
    private String contactLinkedin;
    private LocalDate applicationDate;
    private ApplicationStatus status;
    private Priority priority;
    private boolean hasScreenshot;
    private LocalDate followUp1Date;
    private boolean followUp1Done;
    private LocalDate followUp1DoneDate;
    private LocalDate followUp2Date;
    private boolean followUp2Done;
    private LocalDate followUp2DoneDate;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;

    public static ApplicationResponse from(Application application) {
        ApplicationResponse response = new ApplicationResponse();
        response.id = application.getId();
        response.company = application.getCompany();
        response.jobTitle = application.getJobTitle();
        response.jobUrl = application.getJobUrl();
        response.reference = application.getReference();
        response.platform = application.getPlatform();
        response.location = application.getLocation();
        response.description = application.getDescription();
        response.importantElements = application.getImportantElements();
        response.skills = application.getSkills();
        response.contactName = application.getContactName();
        response.contactEmail = application.getContactEmail();
        response.contactLinkedin = application.getContactLinkedin();
        response.applicationDate = application.getApplicationDate();
        response.status = application.getStatus();
        response.priority = application.getPriority();
        response.hasScreenshot = application.getScreenshotContentType() != null;
        response.followUp1Date = application.getFollowUp1Date();
        response.followUp1Done = application.isFollowUp1Done();
        response.followUp1DoneDate = application.getFollowUp1DoneDate();
        response.followUp2Date = application.getFollowUp2Date();
        response.followUp2Done = application.isFollowUp2Done();
        response.followUp2DoneDate = application.getFollowUp2DoneDate();
        response.notes = application.getNotes();
        response.createdAt = application.getCreatedAt();
        response.updatedAt = application.getUpdatedAt();
        return response;
    }

    public Long getId() {
        return id;
    }

    public String getCompany() {
        return company;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public String getJobUrl() {
        return jobUrl;
    }

    public String getReference() {
        return reference;
    }

    public String getPlatform() {
        return platform;
    }

    public String getLocation() {
        return location;
    }

    public String getDescription() {
        return description;
    }

    public String getImportantElements() {
        return importantElements;
    }

    public String getSkills() {
        return skills;
    }

    public String getContactName() {
        return contactName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactLinkedin() {
        return contactLinkedin;
    }

    public LocalDate getApplicationDate() {
        return applicationDate;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public Priority getPriority() {
        return priority;
    }

    public boolean isHasScreenshot() {
        return hasScreenshot;
    }

    public LocalDate getFollowUp1Date() {
        return followUp1Date;
    }

    public boolean isFollowUp1Done() {
        return followUp1Done;
    }

    public LocalDate getFollowUp1DoneDate() {
        return followUp1DoneDate;
    }

    public LocalDate getFollowUp2Date() {
        return followUp2Date;
    }

    public boolean isFollowUp2Done() {
        return followUp2Done;
    }

    public LocalDate getFollowUp2DoneDate() {
        return followUp2DoneDate;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
