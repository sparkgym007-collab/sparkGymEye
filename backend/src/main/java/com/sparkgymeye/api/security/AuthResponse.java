package com.sparkgymeye.api.security;

public record AuthResponse(Long id, String fullName, String phone, Role role, String sessionToken) {
    static AuthResponse from(AppUser user) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getPhone(), user.getRole(), null);
    }

    static AuthResponse from(AppUser user, Role role) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getPhone(), role, null);
    }

    static AuthResponse from(AppUser user, String sessionToken) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getPhone(), user.getRole(), sessionToken);
    }

    static AuthResponse from(AppUser user, Role role, String sessionToken) {
        return new AuthResponse(user.getId(), user.getFullName(), user.getPhone(), role, sessionToken);
    }
}
