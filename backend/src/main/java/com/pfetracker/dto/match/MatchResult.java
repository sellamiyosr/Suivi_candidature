package com.pfetracker.dto.match;

import java.util.ArrayList;
import java.util.List;

public class MatchResult {

    private Integer score;
    private List<String> matchedKeywords = new ArrayList<>();
    private List<String> missingKeywords = new ArrayList<>();
    private boolean insufficient;
    private String message;

    public static MatchResult insufficient() {
        MatchResult result = new MatchResult();
        result.insufficient = true;
        result.message = "Description insuffisante pour calculer un score fiable";
        return result;
    }

    public static MatchResult noCv() {
        MatchResult result = new MatchResult();
        result.message = "Aucun CV enregistré";
        return result;
    }

    public static MatchResult unreadableCv() {
        MatchResult result = new MatchResult();
        result.message = "CV illisible par un ATS, utilise un PDF avec du texte sélectionnable";
        return result;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public List<String> getMatchedKeywords() {
        return matchedKeywords;
    }

    public void setMatchedKeywords(List<String> matchedKeywords) {
        this.matchedKeywords = matchedKeywords;
    }

    public List<String> getMissingKeywords() {
        return missingKeywords;
    }

    public void setMissingKeywords(List<String> missingKeywords) {
        this.missingKeywords = missingKeywords;
    }

    public boolean isInsufficient() {
        return insufficient;
    }

    public void setInsufficient(boolean insufficient) {
        this.insufficient = insufficient;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
