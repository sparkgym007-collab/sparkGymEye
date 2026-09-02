package com.sparkgymeye.api.security;

public record AuthResponse(Long id, String fullName, String phone, Role role) {
    static AuthResponse from(AppUser user) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getPhone(), user.getRole());
    }

    static AuthResponse from(AppUser user, Role role) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getPhone(), role);
    }
}
