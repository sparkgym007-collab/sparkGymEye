package com.sparkgymeye.api.database;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayRepairConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(FlywayRepairConfiguration.class);

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(
            @Value("${spark.flyway.repair-on-startup:false}") boolean repairOnStartup
    ) {
        return (Flyway flyway) -> {
            if (repairOnStartup) {
                logger.warn("SPARK_FLYWAY_REPAIR_ON_STARTUP is enabled. Repairing Flyway schema history before migration.");
                flyway.repair();
            }
            try {
                flyway.migrate();
            } catch (FlywayValidateException exception) {
                if (!isChecksumMismatch(exception)) {
                    throw exception;
                }
                logger.warn("Flyway checksum mismatch detected. Repairing schema history and retrying migration once.");
                flyway.repair();
                flyway.migrate();
            }
        };
    }

    private boolean isChecksumMismatch(FlywayValidateException exception) {
        String message = exception.getMessage();
        return message != null && message.contains("Migration checksum mismatch");
    }
}
