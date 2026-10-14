package com.pfetracker.service;

import com.pfetracker.dto.cv.CvInfoResponse;
import com.pfetracker.entity.User;
import com.pfetracker.entity.UserCv;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.UserCvRepository;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import java.io.IOException;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CvService {

    private static final String UNREADABLE =
            "CV illisible par un ATS, utilise un PDF avec du texte sélectionnable";

    private final UserCvRepository userCvRepository;
    private final UserRepository userRepository;
    private final MatchService matchService;
    private final ProfileService profileService;

    public CvService(
            UserCvRepository userCvRepository,
            UserRepository userRepository,
            MatchService matchService,
            ProfileService profileService
    ) {
        this.userCvRepository = userCvRepository;
        this.userRepository = userRepository;
        this.matchService = matchService;
        this.profileService = profileService;
    }

    @Transactional
    public CvInfoResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fichier PDF requis");
        }
        String contentType = file.getContentType();
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "cv.pdf";
        if ((contentType != null && !contentType.equalsIgnoreCase("application/pdf"))
                && !originalName.toLowerCase().endsWith(".pdf")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Seul le format PDF est accepté");
        }

        Long userId = SecurityUtils.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lecture du fichier impossible");
        }

        String extracted = extractText(bytes);
        UserCv cv = userCvRepository.findByUserId(userId).orElseGet(UserCv::new);
        cv.setUser(user);
        cv.setFileName(originalName);
        cv.setPdfContent(bytes);
        cv.setExtractedText(extracted);
        cv.setUploadedAt(java.time.Instant.now());
        userCvRepository.save(cv);

        boolean ok = extracted != null && !extracted.isBlank();
        List<String> detected = ok ? matchService.extractKeywordsFromText(extracted) : List.of();
        if (!detected.isEmpty()) {
            profileService.setSkillsFromList(userId, detected);
        }

        return toInfo(cv, ok, detected);
    }

    @Transactional(readOnly = true)
    public CvInfoResponse info() {
        UserCv cv = userCvRepository.findByUserId(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Aucun CV enregistré"));
        boolean ok = cv.getExtractedText() != null && !cv.getExtractedText().isBlank();
        List<String> detected = ok
                ? matchService.extractKeywordsFromText(cv.getExtractedText())
                : List.of();
        return toInfo(cv, ok, detected);
    }

    @Transactional(readOnly = true)
    public UserCv getOwnedCvOrThrow() {
        return userCvRepository.findByUserId(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Aucun CV enregistré"));
    }

    @Transactional(readOnly = true)
    public String getExtractedTextForCurrentUser() {
        return userCvRepository.findByUserId(SecurityUtils.currentUserId())
                .map(UserCv::getExtractedText)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean hasCv() {
        return userCvRepository.existsByUserId(SecurityUtils.currentUserId());
    }

    @Transactional
    public void delete() {
        Long userId = SecurityUtils.currentUserId();
        if (!userCvRepository.existsByUserId(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Aucun CV enregistré");
        }
        userCvRepository.deleteByUserId(userId);
    }

    private CvInfoResponse toInfo(UserCv cv, boolean ok, List<String> detected) {
        return new CvInfoResponse(
                cv.getFileName(),
                cv.getUploadedAt(),
                ok,
                ok ? null : UNREADABLE,
                detected
        );
    }

    private String extractText(byte[] pdfBytes) {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return text != null ? text.trim() : "";
        } catch (IOException e) {
            return "";
        }
    }
}
