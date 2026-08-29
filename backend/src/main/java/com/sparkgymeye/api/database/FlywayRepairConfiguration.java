package com.sparkgymeye.api.database;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayRepairConfiguration {

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(
            @Value("${spark.flyway.repair-on-startup:false}") boolean repairOnStartup
    ) {
        return (Flyway flyway) -> {
            if (repairOnStartup) {
                flyway.repair();
            }
            flyway.migrate();
        };
    }
}
