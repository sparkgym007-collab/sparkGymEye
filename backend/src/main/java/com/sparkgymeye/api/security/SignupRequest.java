package com.sparkgymeye.api.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(@NotBlank String fullName, @NotBlank String phone, @NotBlank @Size(min = 6, max = 72) String password) {
}
