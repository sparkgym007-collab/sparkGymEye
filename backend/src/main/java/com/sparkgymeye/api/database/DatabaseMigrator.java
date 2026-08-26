package com.sparkgymeye.api.database;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;

public class DatabaseMigrator {

    public static void main(String[] args) {
        String url = DatabaseUrlNormalizer.toJdbcUrl(requiredEnv("DATABASE_URL"));
        String username = requiredEnv("DATABASE_USERNAME");
        String password = requiredEnv("DATABASE_PASSWORD");

        Flyway flyway = Flyway.configure()
                .dataSource(url, username, password)
                .baselineOnMigrate(true)
                .locations("classpath:db/migration")
                .load();

        MigrateResult result = flyway.migrate();
        System.out.printf("Flyway complete. Database=%s, migrations=%d, success=%s%n",
                result.database, result.migrationsExecuted, result.success);
    }

    private static String requiredEnv(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(key + " is required");
        }
        return value;
    }
}
