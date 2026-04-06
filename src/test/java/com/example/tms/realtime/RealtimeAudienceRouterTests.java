package com.example.tms.realtime;

import com.example.tms.entity.enums.RoleName;
import com.example.tms.realtime.core.RealtimeAudienceRouter;
import com.example.tms.realtime.security.RealtimeAuthorizationService;
import com.example.tms.realtime.sse.SseConnectionRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class RealtimeAudienceRouterTests {

    @Test
    void resolveRecipientsUserScope() {
        SseConnectionRegistry registry = new SseConnectionRegistry();
        RealtimeAuthorizationService authz = mock(RealtimeAuthorizationService.class);
        RealtimeAudienceRouter router = new RealtimeAudienceRouter(registry, authz);

        UUID userId = UUID.randomUUID();
        assertEquals(List.of(userId), router.resolveRecipients("user:" + userId));
    }

    @Test
    void resolveRecipientsRoleScopeFiltersConnectedUsersByRole() {
        SseConnectionRegistry registry = new SseConnectionRegistry();
        RealtimeAuthorizationService authz = mock(RealtimeAuthorizationService.class);
        RealtimeAudienceRouter router = new RealtimeAudienceRouter(registry, authz);

        UUID allowed = UUID.randomUUID();
        UUID denied = UUID.randomUUID();

        registry.add(allowed, new SseEmitter(), 10);
        registry.add(denied, new SseEmitter(), 10);

        when(authz.hasActiveRole(allowed, RoleName.TUTOR)).thenReturn(true);
        when(authz.hasActiveRole(denied, RoleName.TUTOR)).thenReturn(false);

        assertEquals(List.of(allowed), router.resolveRecipients("role:TUTOR"));
    }
}

