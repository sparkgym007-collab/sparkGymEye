package com.sparkgymeye.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class SparkGymEyeApplication {

    public static void main(String[] args) {
        SpringApplication.run(SparkGymEyeApplication.class, args);
    }
}
