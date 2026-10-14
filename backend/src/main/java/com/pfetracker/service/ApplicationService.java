package com.pfetracker.service;

import com.pfetracker.dto.application.ApplicationRequest;
import com.pfetracker.dto.application.ApplicationResponse;
import com.pfetracker.dto.application.StatisticsResponse;
import com.pfetracker.dto.application.StatusUpdateRequest;
import com.pfetracker.entity.Application;
import com.pfetracker.entity.ApplicationStatus;
import com.pfetracker.entity.Priority;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.ApplicationRepository;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import java.io.IOException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ApplicationService {

    private static final int FOLLOW_UP_1_DAYS = 14;
    private static final int FOLLOW_UP_2_DAYS = 21;

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public ApplicationService(ApplicationRepository applicationRepository, UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> findAllForCurrentUser() {
        Long userId = SecurityUtils.currentUserId();
        return applicationRepository.findByUserIdOrderByApplicationDateDescCreatedAtDesc(userId).stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse findByIdForCurrentUser(Long id) {
        return ApplicationResponse.from(getOwnedApplication(id));
    }

    @Transactional
    public ApplicationResponse create(ApplicationRequest request) {
        User user = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

        Application application = new Application();
        application.setUser(user);
        applyRequest(application, request, true);
        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional
    public ApplicationResponse update(Long id, ApplicationRequest request) {
        Application application = getOwnedApplication(id);
        applyRequest(application, request, false);
        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional
    public void delete(Long id) {
        Application application = getOwnedApplication(id);
        applicationRepository.delete(application);
    }

    @Transactional
    public ApplicationResponse updateStatus(Long id, StatusUpdateRequest request) {
        Application application = getOwnedApplication(id);
        application.setStatus(request.getStatus());
        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional
    public ApplicationResponse markFollowUp(Long id, int followUpNumber) {
        if (followUpNumber != 1 && followUpNumber != 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up number must be 1 or 2");
        }

        Application application = getOwnedApplication(id);
        LocalDate today = LocalDate.now();

        if (followUpNumber == 1) {
            if (application.isFollowUp1Done()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up 1 is already done");
            }
            application.setFollowUp1Done(true);
            application.setFollowUp1DoneDate(today);
            application.setStatus(ApplicationStatus.RELANCE_1);
        } else {
            if (!application.isFollowUp1Done()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up 1 must be done before follow-up 2");
            }
            if (application.isFollowUp2Done()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up 2 is already done");
            }
            application.setFollowUp2Done(true);
            application.setFollowUp2DoneDate(today);
            application.setStatus(ApplicationStatus.RELANCE_2);
        }

        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> findFollowUpsDueToday() {
        Long userId = SecurityUtils.currentUserId();
        return applicationRepository.findFollowUpsDue(userId, LocalDate.now()).stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public StatisticsResponse statistics() {
        Long userId = SecurityUtils.currentUserId();
        StatisticsResponse stats = new StatisticsResponse();
        stats.setTotal(applicationRepository.countByUserId(userId));
        stats.setPendingFollowUps(applicationRepository.findFollowUpsDue(userId, LocalDate.now()).size());

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (ApplicationStatus status : ApplicationStatus.values()) {
            byStatus.put(status.name(), 0L);
        }
        for (Object[] row : applicationRepository.countGroupedByStatus(userId)) {
            byStatus.put(((ApplicationStatus) row[0]).name(), (Long) row[1]);
        }
        stats.setByStatus(byStatus);

        Map<String, Long> byPlatform = new LinkedHashMap<>();
        for (Object[] row : applicationRepository.countGroupedByPlatform(userId)) {
            byPlatform.put(String.valueOf(row[0]), (Long) row[1]);
        }
        stats.setByPlatform(byPlatform);

        Map<String, Long> byMonth = new LinkedHashMap<>();
        for (Object[] row : applicationRepository.countGroupedByMonth(userId)) {
            byMonth.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        stats.setByMonth(byMonth);

        return stats;
    }

    @Transactional
    public ApplicationResponse uploadScreenshot(Long id, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Screenshot file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File must be an image");
        }

        Application application = getOwnedApplication(id);
        try {
            application.setScreenshot(file.getBytes());
            application.setScreenshotContentType(contentType);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded file");
        }

        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public Application getOwnedApplicationWithScreenshot(Long id) {
        Application application = getOwnedApplication(id);
        if (!application.hasScreenshot()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Screenshot not found");
        }
        return application;
    }

    private Application getOwnedApplication(Long id) {
        return applicationRepository.findByIdAndUserId(id, SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Application not found"));
    }

    private void applyRequest(Application application, ApplicationRequest request, boolean creating) {
        application.setCompany(request.getCompany().trim());
        application.setJobTitle(request.getJobTitle().trim());
        application.setJobUrl(trimToNull(request.getJobUrl()));
        application.setReference(trimToNull(request.getReference()));
        application.setPlatform(trimToNull(request.getPlatform()));
        application.setLocation(trimToNull(request.getLocation()));
        application.setDescription(trimToNull(request.getDescription()));
        application.setImportantElements(trimToNull(request.getImportantElements()));
        application.setSkills(trimToNull(request.getSkills()));
        application.setContactName(trimToNull(request.getContactName()));
        application.setContactEmail(trimToNull(request.getContactEmail()));
        application.setContactLinkedin(trimToNull(request.getContactLinkedin()));
        application.setApplicationDate(request.getApplicationDate());
        application.setNotes(trimToNull(request.getNotes()));

        if (request.getStatus() != null) {
            application.setStatus(request.getStatus());
        } else if (creating) {
            application.setStatus(ApplicationStatus.EN_ATTENTE);
        }

        if (request.getPriority() != null) {
            application.setPriority(request.getPriority());
        } else if (creating) {
            application.setPriority(Priority.MOYENNE);
        }

        if (creating) {
            applyFollowUpDatesOnCreate(application, request.getApplicationDate());
        } else {
            application.setFollowUp1Date(request.getFollowUp1Date());
            application.setFollowUp2Date(request.getFollowUp2Date());
        }
    }

    private void applyFollowUpDatesOnCreate(Application application, LocalDate applicationDate) {
        if (applicationDate == null) {
            application.setFollowUp1Date(null);
            application.setFollowUp2Date(null);
            return;
        }
        LocalDate followUp1 = applicationDate.plusDays(FOLLOW_UP_1_DAYS);
        application.setFollowUp1Date(followUp1);
        application.setFollowUp2Date(followUp1.plusDays(FOLLOW_UP_2_DAYS));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
