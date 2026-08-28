package com.sparkgymeye.api.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String SESSION_COOKIE = "SPARK_SESSION";
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(request.phone(), request.password());
        addSessionCookie(response, servletRequest, result.token(), 14 * 24 * 60 * 60);
        return AuthResponse.from(result.user());
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        AuthService.LoginResult result = authService.signup(request);
        addSessionCookie(response, servletRequest, result.token(), 14 * 24 * 60 * 60);
        return AuthResponse.from(result.user());
    }

    @GetMapping("/me")
    public AuthResponse me(@CookieValue(SESSION_COOKIE) String token) {
        return AuthResponse.from(authService.requireUserByToken(token));
    }

    @PutMapping("/me")
    public AuthResponse updateMe(@CookieValue(SESSION_COOKIE) String token, @Valid @RequestBody UpdateProfileRequest request) {
        return AuthResponse.from(authService.updateProfile(token, request));
    }

    private void addSessionCookie(HttpServletResponse response, HttpServletRequest servletRequest, String token, int maxAge) {
        Cookie cookie = new Cookie(SESSION_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(isSecureRequest(servletRequest));
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(value = SESSION_COOKIE, required = false) String token,
            HttpServletRequest servletRequest,
            HttpServletResponse response
    ) {
        if (token != null) {
            authService.logout(token);
        }
        Cookie cookie = new Cookie(SESSION_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(isSecureRequest(servletRequest));
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.noContent().build();
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        return request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
    }

}
