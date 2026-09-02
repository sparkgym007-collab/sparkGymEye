package com.sparkgymeye.api.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
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

    @PostMapping("/member-login")
    public AuthResponse memberLogin(@Valid @RequestBody MemberLoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        AuthService.LoginResult result = authService.memberLogin(request.phone());
        addSessionCookie(response, servletRequest, result.token(), 14 * 24 * 60 * 60);
        return AuthResponse.from(result.user(), Role.MEMBER);
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        AuthService.LoginResult result = authService.signup(request);
        addSessionCookie(response, servletRequest, result.token(), 14 * 24 * 60 * 60);
        return AuthResponse.from(result.user());
    }

    @GetMapping("/me")
    public AuthResponse me(@CookieValue(SESSION_COOKIE) String token) {
        AuthService.SessionIdentity identity = authService.requireSessionByToken(token);
        return AuthResponse.from(identity.user(), identity.role());
    }

    @PutMapping("/me")
    public AuthResponse updateMe(@CookieValue(SESSION_COOKIE) String token, @Valid @RequestBody UpdateProfileRequest request) {
        return AuthResponse.from(authService.updateProfile(token, request));
    }

    private void addSessionCookie(HttpServletResponse response, HttpServletRequest servletRequest, String token, int maxAge) {
        boolean secure = isSecureRequest(servletRequest);
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE, token)
                .httpOnly(true)
                .secure(secure)
                .sameSite(secure ? "None" : "Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
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
        boolean secure = isSecureRequest(servletRequest);
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(secure ? "None" : "Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.noContent().build();
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        return request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
    }

}
