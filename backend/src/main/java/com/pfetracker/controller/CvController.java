package com.pfetracker.controller;

import com.pfetracker.dto.cv.CvInfoResponse;
import com.pfetracker.entity.UserCv;
import com.pfetracker.service.CvService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/cv")
public class CvController {

    private final CvService cvService;

    public CvController(CvService cvService) {
        this.cvService = cvService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CvInfoResponse upload(@RequestParam("file") MultipartFile file) {
        return cvService.upload(file);
    }

    @GetMapping
    public CvInfoResponse info() {
        return cvService.info();
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> download() {
        UserCv cv = cvService.getOwnedCvOrThrow();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + cv.getFileName() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(cv.getPdfContent());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete() {
        cvService.delete();
    }
}
