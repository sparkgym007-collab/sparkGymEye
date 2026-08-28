package com.sparkgymeye.api.security;

import jakarta.transaction.Transactional;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            AppUserRepository appUserRepository,
            AuthSessionRepository authSessionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.appUserRepository = appUserRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResult login(String phone, String password) {
        AppUser user = appUserRepository.findByPhone(phone)
                .filter(AppUser::isActive)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid phone number or password"));

        String token = randomToken();
        AuthSession session = new AuthSession();
        session.setAppUser(user);
        session.setTokenHash(Hashing.sha256(token));
        session.setExpiresAt(Instant.now().plus(14, ChronoUnit.DAYS));
        authSessionRepository.save(session);

        user.setLastLoginAt(Instant.now());
        return new LoginResult(user, token);
    }

    @Transactional
    public LoginResult signup(SignupRequest request) {
        if (appUserRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("Phone number already exists");
        }
        AppUser user = new AppUser();
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setRole(Role.MEMBER);
        user.setActive(true);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        appUserRepository.save(user);

        String token = randomToken();
        AuthSession session = new AuthSession();
        session.setAppUser(user);
        session.setTokenHash(Hashing.sha256(token));
        session.setExpiresAt(Instant.now().plus(14, ChronoUnit.DAYS));
        authSessionRepository.save(session);

        return new LoginResult(user, token);
    }

    public AppUser requireUserByToken(String token) {
        return authSessionRepository.findByTokenHash(Hashing.sha256(token))
                .filter(session -> session.getExpiresAt().isAfter(Instant.now()))
                .map(AuthSession::getAppUser)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new BadCredentialsException("Session expired"));
    }

    @Transactional
    public AppUser updateProfile(String token, UpdateProfileRequest request) {
        AppUser user = requireUserByToken(token);
        appUserRepository.findByPhone(request.phone())
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Phone number already exists");
                });
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        return appUserRepository.save(user);
    }

    @Transactional
    public void logout(String token) {
        authSessionRepository.deleteByTokenHash(Hashing.sha256(token));
    }

    @Transactional
    public String forgotPassword(String phone) {
        return appUserRepository.findByPhone(phone)
                .map(user -> {
                    String token = randomToken();
                    user.setResetTokenHash(Hashing.sha256(token));
                    user.setResetTokenExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
                    return token;
                })
                .orElse(null);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        AppUser user = appUserRepository.findByResetTokenHash(Hashing.sha256(token))
                .filter(candidate -> candidate.getResetTokenExpiresAt() != null)
                .filter(candidate -> candidate.getResetTokenExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BadCredentialsException("Invalid or expired reset token"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetTokenHash(null);
        user.setResetTokenExpiresAt(null);
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record LoginResult(AppUser user, String token) {
    }
}
