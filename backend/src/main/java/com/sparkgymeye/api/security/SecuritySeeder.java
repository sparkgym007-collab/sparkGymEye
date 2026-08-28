package com.sparkgymeye.api.security;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class SecuritySeeder implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public SecuritySeeder(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seed("SPARK Admin", "9876543210", "admin@sparkgym.in", Role.ADMIN);
        seed("SPARK Trainer", "9876543211", "trainer@sparkgym.in", Role.TRAINER);
        seed("SPARK Viewer", "9876543212", "viewer@sparkgym.in", Role.MEMBER);
    }

    private void seed(String name, String phone, String email, Role role) {
        AppUser user = appUserRepository.findByPhone(phone).orElseGet(AppUser::new);
        user.setFullName(name);
        user.setPhone(phone);
        user.setEmail(email);
        user.setRole(role);
        user.setActive(true);
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode("Spark@123"));
        }
        appUserRepository.save(user);
    }
}
