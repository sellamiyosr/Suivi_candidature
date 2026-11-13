package com.pfetracker.controller;

import com.pfetracker.dto.settings.IntegrationSettings;
import com.pfetracker.service.IntegrationSettingsService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/integrations")
public class IntegrationSettingsController {

    private final IntegrationSettingsService service;

    public IntegrationSettingsController(IntegrationSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public IntegrationSettings get() {
        return service.get();
    }

    @PutMapping
    public IntegrationSettings update(@RequestBody IntegrationSettings request) {
        return service.update(request);
    }

    @PostMapping("/mail/test")
    public Map<String, Object> testMail(@RequestParam(defaultValue = "true") boolean send) {
        return service.testMail(send);
    }

    @PostMapping("/ai/test")
    public Map<String, Object> testAi() {
        return service.testAi();
    }
}
