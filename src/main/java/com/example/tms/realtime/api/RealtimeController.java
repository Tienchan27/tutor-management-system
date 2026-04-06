package com.example.tms.realtime.api;

import com.example.tms.realtime.sse.SseConnectionRegistry;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.realtime.config.RealtimeProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/events")
@ConditionalOnProperty(prefix = "app.realtime", name = "enabled", havingValue = "true", matchIfMissing = false)
public class RealtimeController {
    private static final Logger log = LoggerFactory.getLogger(RealtimeController.class);

    private final CurrentUserResolver currentUserResolver;
    private final SseConnectionRegistry registry;
    private final Duration emitterTimeout;
    private final int maxConnectionsPerUser;
    private final int connectLimitPerMinute;
    private final com.example.tms.realtime.security.SseConnectRateLimiter rateLimiter;

    public RealtimeController(
            CurrentUserResolver currentUserResolver,
            SseConnectionRegistry registry,
            RealtimeProperties props,
            com.example.tms.realtime.security.SseConnectRateLimiter rateLimiter
    ) {
        this.currentUserResolver = currentUserResolver;
        this.registry = registry;
        this.emitterTimeout = Duration.ofMillis(props.sse().emitterTimeoutMs());
        this.maxConnectionsPerUser = props.sse().maxConnectionsPerUser();
        this.connectLimitPerMinute = props.sse().connectLimitPerMinute();
        this.rateLimiter = rateLimiter;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(HttpServletRequest request) {
        UUID userId = currentUserResolver.requireUserId();
        String ip = clientIp(request);
        if (!rateLimiter.allow(userId, ip, connectLimitPerMinute)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many realtime connections");
        }
        SseEmitter emitter = new SseEmitter(emitterTimeout.toMillis());

        registry.add(userId, emitter, maxConnectionsPerUser);
        log.info("SSE connected userId={} activeConnections={}", userId, registry.getActiveConnections());

        emitter.onCompletion(() -> {
            registry.remove(userId, emitter);
            log.info("SSE completed userId={} activeConnections={}", userId, registry.getActiveConnections());
        });
        emitter.onTimeout(() -> {
            registry.remove(userId, emitter);
            log.info("SSE timeout userId={} activeConnections={}", userId, registry.getActiveConnections());
        });
        emitter.onError(ex -> {
            registry.remove(userId, emitter);
            log.info("SSE error userId={} activeConnections={} msg={}", userId, registry.getActiveConnections(), ex.getMessage());
        });

        return emitter;
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "";
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

