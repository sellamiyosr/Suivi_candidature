package com.pfetracker.dto.application;

import java.util.LinkedHashMap;
import java.util.Map;

public class StatisticsResponse {

    private long total;
    private long pendingFollowUps;
    private Map<String, Long> byStatus = new LinkedHashMap<>();
    private Map<String, Long> byPlatform = new LinkedHashMap<>();
    private Map<String, Long> byMonth = new LinkedHashMap<>();

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public long getPendingFollowUps() {
        return pendingFollowUps;
    }

    public void setPendingFollowUps(long pendingFollowUps) {
        this.pendingFollowUps = pendingFollowUps;
    }

    public Map<String, Long> getByStatus() {
        return byStatus;
    }

    public void setByStatus(Map<String, Long> byStatus) {
        this.byStatus = byStatus;
    }

    public Map<String, Long> getByPlatform() {
        return byPlatform;
    }

    public void setByPlatform(Map<String, Long> byPlatform) {
        this.byPlatform = byPlatform;
    }

    public Map<String, Long> getByMonth() {
        return byMonth;
    }

    public void setByMonth(Map<String, Long> byMonth) {
        this.byMonth = byMonth;
    }
}
