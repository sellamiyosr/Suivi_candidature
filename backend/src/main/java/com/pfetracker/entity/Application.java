package com.pfetracker.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String company;

    @Column(name = "job_title", nullable = false, length = 255)
    private String jobTitle;

    @Column(name = "job_url", length = 1000)
    private String jobUrl;

    @Column(length = 100)
    private String reference;

    @Column(length = 100)
    private String platform;

    @Column(length = 255)
    private String location;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    @Lob
    @Column(name = "important_elements", columnDefinition = "TEXT")
    private String importantElements;

    @Column(length = 1000)
    private String skills;

    @Column(name = "contact_name", length = 255)
    private String contactName;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "contact_linkedin", length = 500)
    private String contactLinkedin;

    @Column(name = "application_date")
    private LocalDate applicationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.EN_ATTENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Priority priority = Priority.MOYENNE;

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] screenshot;

    @Column(name = "screenshot_content_type", length = 100)
    private String screenshotContentType;

    @Column(name = "follow_up1_date")
    private LocalDate followUp1Date;

    @Column(name = "follow_up1_done", nullable = false)
    private boolean followUp1Done = false;

    @Column(name = "follow_up1_done_date")
    private LocalDate followUp1DoneDate;

    @Column(name = "follow_up2_date")
    private LocalDate followUp2Date;

    @Column(name = "follow_up2_done", nullable = false)
    private boolean followUp2Done = false;

    @Column(name = "follow_up2_done_date")
    private LocalDate followUp2DoneDate;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getJobUrl() {
        return jobUrl;
    }

    public void setJobUrl(String jobUrl) {
        this.jobUrl = jobUrl;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImportantElements() {
        return importantElements;
    }

    public void setImportantElements(String importantElements) {
        this.importantElements = importantElements;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getContactLinkedin() {
        return contactLinkedin;
    }

    public void setContactLinkedin(String contactLinkedin) {
        this.contactLinkedin = contactLinkedin;
    }

    public LocalDate getApplicationDate() {
        return applicationDate;
    }

    public void setApplicationDate(LocalDate applicationDate) {
        this.applicationDate = applicationDate;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public byte[] getScreenshot() {
        return screenshot;
    }

    public void setScreenshot(byte[] screenshot) {
        this.screenshot = screenshot;
    }

    public String getScreenshotContentType() {
        return screenshotContentType;
    }

    public void setScreenshotContentType(String screenshotContentType) {
        this.screenshotContentType = screenshotContentType;
    }

    public LocalDate getFollowUp1Date() {
        return followUp1Date;
    }

    public void setFollowUp1Date(LocalDate followUp1Date) {
        this.followUp1Date = followUp1Date;
    }

    public boolean isFollowUp1Done() {
        return followUp1Done;
    }

    public void setFollowUp1Done(boolean followUp1Done) {
        this.followUp1Done = followUp1Done;
    }

    public LocalDate getFollowUp1DoneDate() {
        return followUp1DoneDate;
    }

    public void setFollowUp1DoneDate(LocalDate followUp1DoneDate) {
        this.followUp1DoneDate = followUp1DoneDate;
    }

    public LocalDate getFollowUp2Date() {
        return followUp2Date;
    }

    public void setFollowUp2Date(LocalDate followUp2Date) {
        this.followUp2Date = followUp2Date;
    }

    public boolean isFollowUp2Done() {
        return followUp2Done;
    }

    public void setFollowUp2Done(boolean followUp2Done) {
        this.followUp2Done = followUp2Done;
    }

    public LocalDate getFollowUp2DoneDate() {
        return followUp2DoneDate;
    }

    public void setFollowUp2DoneDate(LocalDate followUp2DoneDate) {
        this.followUp2DoneDate = followUp2DoneDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean hasScreenshot() {
        return screenshotContentType != null
                || (screenshot != null && screenshot.length > 0);
    }
}
