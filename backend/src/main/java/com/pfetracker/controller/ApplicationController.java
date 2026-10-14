package com.pfetracker.controller;

import com.pfetracker.dto.application.ApplicationRequest;
import com.pfetracker.dto.application.ApplicationResponse;
import com.pfetracker.dto.application.StatisticsResponse;
import com.pfetracker.dto.application.StatusUpdateRequest;
import com.pfetracker.entity.Application;
import com.pfetracker.service.ApplicationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    public List<ApplicationResponse> list() {
        return applicationService.findAllForCurrentUser();
    }

    @GetMapping("/follow-ups/today")
    public List<ApplicationResponse> followUpsToday() {
        return applicationService.findFollowUpsDueToday();
    }

    @GetMapping("/statistics")
    public StatisticsResponse statistics() {
        return applicationService.statistics();
    }

    @GetMapping("/{id}")
    public ApplicationResponse getById(@PathVariable Long id) {
        return applicationService.findByIdForCurrentUser(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse create(@Valid @RequestBody ApplicationRequest request) {
        return applicationService.create(request);
    }

    @PutMapping("/{id}")
    public ApplicationResponse update(@PathVariable Long id, @Valid @RequestBody ApplicationRequest request) {
        return applicationService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        applicationService.delete(id);
    }

    @PatchMapping("/{id}/status")
    public ApplicationResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        return applicationService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/follow-up/1")
    public ApplicationResponse markFollowUp1(@PathVariable Long id) {
        return applicationService.markFollowUp(id, 1);
    }

    @PatchMapping("/{id}/follow-up/2")
    public ApplicationResponse markFollowUp2(@PathVariable Long id) {
        return applicationService.markFollowUp(id, 2);
    }

    @PostMapping("/match/all")
    public List<ApplicationResponse> recalculateAllMatches() {
        return applicationService.recalculateAllMatches();
    }

    @PostMapping("/{id}/match")
    public ApplicationResponse recalculateMatch(@PathVariable Long id) {
        return applicationService.recalculateMatch(id);
    }

    @PostMapping(value = "/{id}/screenshot", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApplicationResponse uploadScreenshot(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file
    ) {
        return applicationService.uploadScreenshot(id, file);
    }

    @GetMapping("/{id}/screenshot")
    public ResponseEntity<byte[]> getScreenshot(@PathVariable Long id) {
        Application application = applicationService.getOwnedApplicationWithScreenshot(id);
        MediaType mediaType = MediaType.parseMediaType(
                application.getScreenshotContentType() != null
                        ? application.getScreenshotContentType()
                        : MediaType.IMAGE_PNG_VALUE
        );
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"screenshot-" + id + "\"")
                .contentType(mediaType)
                .body(application.getScreenshot());
    }
}
