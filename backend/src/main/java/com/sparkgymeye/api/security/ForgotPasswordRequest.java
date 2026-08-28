package com.sparkgymeye.api.security;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(@NotBlank String phone) {
}
