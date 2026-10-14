package com.pfetracker.controller;

import com.pfetracker.dto.match.KeywordsResponse;
import com.pfetracker.dto.match.MatchPreviewRequest;
import com.pfetracker.dto.match.MatchResult;
import com.pfetracker.service.CvService;
import com.pfetracker.service.MatchService;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/match")
public class MatchController {

    private final MatchService matchService;
    private final CvService cvService;

    public MatchController(MatchService matchService, CvService cvService) {
        this.matchService = matchService;
        this.cvService = cvService;
    }

    @PostMapping("/preview")
    public MatchResult preview(@RequestBody MatchPreviewRequest request) {
        String cvText = cvService.getExtractedTextForCurrentUser();
        if (cvText == null) {
            return MatchResult.noCv();
        }
        if (cvText.isBlank()) {
            return MatchResult.unreadableCv();
        }
        return matchService.compute(
                request.getJobTitle(),
                request.getDescription(),
                request.getSkills(),
                request.getImportantElements(),
                cvText
        );
    }

    /** Détecte les mots-clés / compétences d'une offre (dictionnaire ATS). */
    @PostMapping("/keywords")
    public KeywordsResponse keywords(@RequestBody MatchPreviewRequest request) {
        String text = Stream.of(
                        request.getJobTitle(),
                        request.getSkills(),
                        request.getImportantElements(),
                        request.getDescription()
                )
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining("\n"));
        return new KeywordsResponse(matchService.extractKeywordsFromText(text));
    }
}
