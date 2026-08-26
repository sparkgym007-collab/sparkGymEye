package com.sparkgymeye.api.database;

import java.net.URI;
import java.net.URISyntaxException;

public final class DatabaseUrlNormalizer {

    private DatabaseUrlNormalizer() {
    }

    public static String toJdbcUrl(String databaseUrl) {
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return databaseUrl;
        }
        if (databaseUrl.startsWith("jdbc:postgresql://")) {
            return databaseUrl;
        }
        if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
            return databaseUrl;
        }

        try {
            URI uri = new URI(databaseUrl);
            StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
            if (uri.getPort() > 0) {
                jdbcUrl.append(":").append(uri.getPort());
            }
            if (uri.getRawPath() != null) {
                jdbcUrl.append(uri.getRawPath());
            }
            if (uri.getRawQuery() != null) {
                jdbcUrl.append("?").append(uri.getRawQuery());
            }
            return jdbcUrl.toString();
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Invalid PostgreSQL database URL", exception);
        }
    }
}
