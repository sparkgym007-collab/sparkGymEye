package com.sparkgymeye.api.security;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(@NotBlank String fullName, @NotBlank String phone) {
}
