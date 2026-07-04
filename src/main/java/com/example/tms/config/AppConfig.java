package com.example.tms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.ZoneId;

@Configuration
public class AppConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public ZoneId appZoneId() {
        return ZoneId.of("Asia/Ho_Chi_Minh");
    }

    /** Dedicated client for the vietqr.io bank catalog (used only by the admin sync action). */
    @Bean
    public RestClient vietQrRestClient(
            @Value("${app.vietqr.base-url:https://api.vietqr.io}") String baseUrl,
            @Value("${app.vietqr.timeout-ms:5000}") long timeoutMs
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }
}
