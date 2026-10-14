package com.pfetracker.dto.match;

public class MatchPreviewRequest {

    private String jobTitle;
    private String description;
    private String skills;
    private String importantElements;

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getImportantElements() {
        return importantElements;
    }

    public void setImportantElements(String importantElements) {
        this.importantElements = importantElements;
    }
}
