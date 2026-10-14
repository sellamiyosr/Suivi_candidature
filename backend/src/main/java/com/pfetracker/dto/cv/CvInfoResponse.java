package com.pfetracker.dto.cv;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class CvInfoResponse {

    private String fileName;
    private Instant uploadedAt;
    private boolean textExtracted;
    private String warning;
    private List<String> detectedSkills = new ArrayList<>();

    public CvInfoResponse() {
    }

    public CvInfoResponse(
            String fileName,
            Instant uploadedAt,
            boolean textExtracted,
            String warning,
            List<String> detectedSkills
    ) {
        this.fileName = fileName;
        this.uploadedAt = uploadedAt;
        this.textExtracted = textExtracted;
        this.warning = warning;
        this.detectedSkills = detectedSkills != null ? detectedSkills : new ArrayList<>();
    }

    public String getFileName() {
        return fileName;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public boolean isTextExtracted() {
        return textExtracted;
    }

    public String getWarning() {
        return warning;
    }

    public List<String> getDetectedSkills() {
        return detectedSkills;
    }

    public void setDetectedSkills(List<String> detectedSkills) {
        this.detectedSkills = detectedSkills;
    }
}
