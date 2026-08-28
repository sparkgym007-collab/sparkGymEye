package com.sparkgymeye.api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class SecuritySeeder implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final boolean seedEnabled;
    private final String adminPhone;
    private final String adminPassword;
    private final String trainerPhone;
    private final String trainerPassword;

    public SecuritySeeder(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            AuthService authService,
            @Value("${spark.security.seed.enabled:true}") boolean seedEnabled,
            @Value("${spark.security.seed.admin-phone:+919091423566}") String adminPhone,
            @Value("${spark.security.seed.admin-password:Spark@123}") String adminPassword,
            @Value("${spark.security.seed.trainer-phone:+919876543211}") String trainerPhone,
            @Value("${spark.security.seed.trainer-password:Spark@123}") String trainerPassword
    ) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.seedEnabled = seedEnabled;
        this.adminPhone = adminPhone;
        this.adminPassword = adminPassword;
        this.trainerPhone = trainerPhone;
        this.trainerPassword = trainerPassword;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        seed("SPARK Admin", adminPhone, "admin@sparkgym.in", Role.ADMIN, adminPassword);
        seed("SPARK Trainer", trainerPhone, "trainer@sparkgym.in", Role.TRAINER, trainerPassword);
    }

    private void seed(String name, String phone, String email, Role role, String password) {
        String normalizedPhone = authService.normalizePhone(phone);
        AppUser user = authService.findByPhoneInput(phone).orElseGet(AppUser::new);
        if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(name);
        }
        user.setPhone(normalizedPhone);
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(email);
        }
        user.setRole(role);
        user.setActive(true);
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        appUserRepository.save(user);
    }
}
