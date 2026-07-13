package com.example.tms;

import com.example.tms.exception.ApiException;
import com.example.tms.service.OtpRedisService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OtpRedisServiceTests {

    @Mock private RedisTemplate<String, String> redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    private OtpRedisService service() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        return new OtpRedisService(redisTemplate);
    }

    @Test
    void getOtpHash_redisReadFailureReturnsDependencyError() {
        when(valueOperations.get(anyString())).thenThrow(new IllegalStateException("redis down"));

        ApiException ex = assertThrows(ApiException.class,
                () -> service().getOtpHash("student@example.com", "REGISTER"));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
    }

    @Test
    void incrementAttempts_nullRedisIncrementReturnsDependencyError() {
        when(valueOperations.increment(anyString())).thenReturn(null);

        ApiException ex = assertThrows(ApiException.class,
                () -> service().incrementAttempts("student@example.com", "REGISTER", Duration.ofMinutes(5)));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
    }

    @Test
    void incrementSendCount_nullRedisIncrementReturnsDependencyError() {
        when(valueOperations.increment(anyString())).thenReturn(null);

        ApiException ex = assertThrows(ApiException.class,
                () -> service().incrementSendCount("student@example.com", "REGISTER", Duration.ofMinutes(5)));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
    }
}
