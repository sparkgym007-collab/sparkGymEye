package com.sparkgymeye.api.security;

import jakarta.transaction.Transactional;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();
    private static final Pattern INDIA_MOBILE = Pattern.compile("\\d{10}");

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
        String normalizedPhone = normalizePhone(phone);
        AppUser user = findByPhoneInput(phone)
                .filter(AppUser::isActive)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid phone number or password"));

        user.setPhone(normalizedPhone);
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
        String phone = normalizePhone(request.phone());
        if (findByPhoneInput(request.phone()).isPresent()) {
            throw new IllegalArgumentException("Phone number already exists");
        }
        AppUser user = new AppUser();
        user.setFullName(request.fullName());
        user.setPhone(phone);
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
        String phone = normalizePhone(request.phone());
        findByPhoneInput(request.phone())
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Phone number already exists");
                });
        user.setFullName(request.fullName());
        user.setPhone(phone);
        return appUserRepository.save(user);
    }

    @Transactional
    public void logout(String token) {
        authSessionRepository.deleteByTokenHash(Hashing.sha256(token));
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String normalizePhone(String phone) {
        String compact = phone == null ? "" : phone.trim().replaceAll("[\\s()-]", "");
        if (compact.startsWith("+")) {
            return compact;
        }
        if (compact.startsWith("91") && compact.length() == 12) {
            return "+" + compact;
        }
        if (INDIA_MOBILE.matcher(compact).matches()) {
            return "+91" + compact;
        }
        throw new IllegalArgumentException("Enter a valid phone number");
    }

    public Optional<AppUser> findByPhoneInput(String phone) {
        String normalized = normalizePhone(phone);
        Optional<AppUser> normalizedUser = appUserRepository.findByPhone(normalized);
        if (normalizedUser.isPresent()) {
            return normalizedUser;
        }
        String compact = phone == null ? "" : phone.trim().replaceAll("[\\s()-]", "");
        if (compact.startsWith("+91") && compact.length() == 13) {
            compact = compact.substring(3);
        } else if (compact.startsWith("91") && compact.length() == 12) {
            compact = compact.substring(2);
        }
        return INDIA_MOBILE.matcher(compact).matches() ? appUserRepository.findByPhone(compact) : Optional.empty();
    }

    public record LoginResult(AppUser user, String token) {
    }
}
