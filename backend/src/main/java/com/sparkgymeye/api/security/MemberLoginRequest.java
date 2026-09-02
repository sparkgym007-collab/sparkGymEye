package com.sparkgymeye.api.security;

import jakarta.validation.constraints.NotBlank;

public record MemberLoginRequest(@NotBlank String phone) {
}
