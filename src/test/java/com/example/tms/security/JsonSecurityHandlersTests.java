package com.example.tms.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonSecurityHandlersTests {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void authenticationEntryPointWritesUnauthenticatedJson() throws Exception {
        JsonAuthenticationEntryPoint entryPoint = new JsonAuthenticationEntryPoint(objectMapper);
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(
                new MockHttpServletRequest(),
                response,
                new InsufficientAuthenticationException("full authentication is required")
        );

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentType().startsWith("application/json"));
        JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
        assertEquals("UNAUTHENTICATED", body.get("code").asText());
        assertEquals("Authentication required", body.get("message").asText());
        assertTrue(body.has("timestamp"));
    }

    @Test
    void accessDeniedHandlerWritesForbiddenJson() throws Exception {
        JsonAccessDeniedHandler handler = new JsonAccessDeniedHandler(objectMapper);
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(
                new MockHttpServletRequest(),
                response,
                new AccessDeniedException("denied")
        );

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentType().startsWith("application/json"));
        JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
        assertEquals("FORBIDDEN", body.get("code").asText());
        assertEquals("You are not allowed to perform this action", body.get("message").asText());
        assertTrue(body.has("timestamp"));
    }
}
