package com.pfetracker.dto.application;

import com.pfetracker.entity.ApplicationStatus;
import com.pfetracker.entity.ContractType;
import com.pfetracker.entity.Priority;
import com.pfetracker.entity.WorkMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class ApplicationRequest {

    @NotBlank
    @Size(max = 255)
    private String company;

    @NotBlank
    @Size(max = 255)
    private String jobTitle;

    @Size(max = 1000)
    private String jobUrl;

    @Size(max = 100)
    private String reference;

    @Size(max = 100)
    private String platform;

    @Size(max = 255)
    private String location;

    private ContractType contractType;
    private WorkMode workMode;

    @Size(max = 100)
    private String startDate;

    @Size(max = 100)
    private String duration;

    @Size(max = 255)
    private String domain;

    @Size(max = 1000)
    private String companyLogoUrl;

    private String description;
    private String importantElements;

    @Size(max = 1000)
    private String skills;

    @Size(max = 255)
    private String contactName;

    @Size(max = 255)
    private String contactEmail;

    @Size(max = 500)
    private String contactLinkedin;

    private LocalDate applicationDate;
    private ApplicationStatus status;
    private Priority priority;

    private LocalDate followUp1Date;
    private LocalDate followUp2Date;

    private String notes;

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

    public ContractType getContractType() {
        return contractType;
    }

    public void setContractType(ContractType contractType) {
        this.contractType = contractType;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public void setWorkMode(WorkMode workMode) {
        this.workMode = workMode;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getCompanyLogoUrl() {
        return companyLogoUrl;
    }

    public void setCompanyLogoUrl(String companyLogoUrl) {
        this.companyLogoUrl = companyLogoUrl;
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

    public LocalDate getFollowUp1Date() {
        return followUp1Date;
    }

    public void setFollowUp1Date(LocalDate followUp1Date) {
        this.followUp1Date = followUp1Date;
    }

    public LocalDate getFollowUp2Date() {
        return followUp2Date;
    }

    public void setFollowUp2Date(LocalDate followUp2Date) {
        this.followUp2Date = followUp2Date;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
