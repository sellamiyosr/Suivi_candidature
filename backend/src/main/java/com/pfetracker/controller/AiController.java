package com.pfetracker.controller;

import com.pfetracker.dto.application.ApplicationResponse;
import com.pfetracker.entity.Application;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.ApplicationRepository;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import com.pfetracker.service.ApplicationService;
import com.pfetracker.service.MailService;
import com.pfetracker.service.ai.AiAssistantService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/applications/{id}")
public class AiController {

    private final AiAssistantService assistant;
    private final MailService mailService;
    private final ApplicationService applicationService;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    public AiController(
            AiAssistantService assistant,
            MailService mailService,
            ApplicationService applicationService,
            UserRepository userRepository,
            ApplicationRepository applicationRepository
    ) {
        this.assistant = assistant;
        this.mailService = mailService;
        this.applicationService = applicationService;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
    }

    /** Rédige la prochaine relance avec l'IA : { subject, body, to }. */
    @PostMapping("/ai/follow-up")
    public Map<String, String> followUp(@PathVariable Long id) {
        return assistant.generateFollowUp(id);
    }

    /** Analyse de l'offre vs profil : { analysis (Markdown), usedCv }. */
    @PostMapping("/ai/analysis")
    public Map<String, String> analysis(@PathVariable Long id) {
        return assistant.analyzeOffer(id);
    }

    /**
     * Envoie la relance au recruteur depuis le compte e-mail de l'utilisateur.
     * Corps : { to, subject, body, markDone }.
     */
    @PostMapping("/follow-up/send")
    public ApplicationResponse send(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        User user = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        Application app = applicationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Application not found"));

        String to = str(req.get("to"));
        String subject = str(req.get("subject"));
        String body = str(req.get("body"));
        if (to == null || !to.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Adresse du destinataire invalide.");
        }
        if (subject == null || body == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Objet et message sont obligatoires.");
        }

        mailService.sendWithUserAccount(user, to, subject, body);

        boolean markDone = Boolean.TRUE.equals(req.get("markDone"));
        if (markDone && (!app.isFollowUp1Done() || !app.isFollowUp2Done())) {
            int number = !app.isFollowUp1Done() ? 1 : 2;
            return applicationService.markFollowUp(id, number);
        }
        return applicationService.findByIdForCurrentUser(id);
    }

    private static String str(Object o) {
        return o == null || o.toString().isBlank() ? null : o.toString().trim();
    }
}
