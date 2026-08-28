package com.sparkgymeye.api.security;

import jakarta.validation.constraints.NotBlank;

public record SignupRequest(@NotBlank String fullName, @NotBlank String phone, @NotBlank String password) {
}
