package com.pfetracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PfeTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(PfeTrackerApplication.class, args);
    }
}
