package com.example.tms.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenRedisServiceTests {

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Test
    void isBlacklisted_returnsFalseWhenRedisFails() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenThrow(new RuntimeException("redis down"));

        RefreshTokenRedisService service = new RefreshTokenRedisService(redisTemplate);

        assertFalse(service.isBlacklisted("hash-abc"));
    }

    @Test
    void isBlacklisted_returnsTrueWhenKeyPresent() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("tms:rt:blacklist:hash-abc")).thenReturn("1");

        RefreshTokenRedisService service = new RefreshTokenRedisService(redisTemplate);

        assertTrue(service.isBlacklisted("hash-abc"));
    }

    @Test
    void blacklist_doesNotThrowWhenRedisFails() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RuntimeException("redis down"))
                .when(valueOperations)
                .set(anyString(), eq("1"), any(Duration.class));

        RefreshTokenRedisService service = new RefreshTokenRedisService(redisTemplate);

        assertDoesNotThrow(() -> service.blacklist("hash-abc", Duration.ofMinutes(5)));
    }

    @Test
    void blacklist_storesEntryWhenRedisAvailable() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        RefreshTokenRedisService service = new RefreshTokenRedisService(redisTemplate);
        service.blacklist("hash-abc", Duration.ofMinutes(5));

        verify(valueOperations).set("tms:rt:blacklist:hash-abc", "1", Duration.ofMinutes(5));
    }
}
