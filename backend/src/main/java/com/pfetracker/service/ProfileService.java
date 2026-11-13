package com.pfetracker.service;

import com.pfetracker.dto.profile.ProfileResponse;
import com.pfetracker.dto.profile.ProfileUpdateRequest;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final MailService mailService;

    public ProfileService(UserRepository userRepository, MailService mailService) {
        this.userRepository = userRepository;
        this.mailService = mailService;
    }

    @Transactional(readOnly = true)
    public ProfileResponse get() {
        return toResponse(currentUser());
    }

    @Transactional
    public ProfileResponse update(ProfileUpdateRequest request) {
        User user = currentUser();
        if (request != null) {
            if (request.getSkills() != null) {
                user.setSkills(normalizeSkills(request.getSkills()));
            }
            if (request.getEmailRemindersEnabled() != null) {
                user.setEmailRemindersEnabled(request.getEmailRemindersEnabled());
            }
            userRepository.save(user);
        }
        return toResponse(user);
    }

    @Transactional
    public void setSkillsFromList(Long userId, List<String> skills) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        String joined = skills == null || skills.isEmpty()
                ? null
                : String.join(", ", skills);
        user.setSkills(joined);
        userRepository.save(user);
    }

    private ProfileResponse toResponse(User user) {
        List<String> list = parseSkills(user.getSkills());
        return new ProfileResponse(
                user.getEmail(),
                user.getSkills(),
                list,
                user.isEmailRemindersEnabled(),
                mailService.canSendFor(user)
        );
    }

    public static List<String> parseSkills(String skills) {
        if (skills == null || skills.isBlank()) {
            return List.of();
        }
        return Arrays.stream(skills.split("[,;\\n]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    private static String normalizeSkills(String skills) {
        List<String> list = parseSkills(skills);
        return list.isEmpty() ? null : String.join(", ", list);
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
