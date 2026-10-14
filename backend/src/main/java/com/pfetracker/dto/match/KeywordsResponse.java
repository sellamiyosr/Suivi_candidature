package com.pfetracker.dto.match;

import java.util.ArrayList;
import java.util.List;

public class KeywordsResponse {

    private List<String> keywords = new ArrayList<>();
    private String skills;

    public KeywordsResponse() {
    }

    public KeywordsResponse(List<String> keywords) {
        this.keywords = keywords != null ? keywords : new ArrayList<>();
        this.skills = this.keywords.isEmpty() ? null : String.join(", ", this.keywords);
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public void setKeywords(List<String> keywords) {
        this.keywords = keywords;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }
}
