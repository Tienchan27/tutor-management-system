package com.example.tms.security;

import com.example.tms.exception.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    private final SecretKey key;
    private static final String TOKEN_TYPE_CLAIM = "type";
    private static final String ACTIVE_ROLE_CLAIM = "activeRole";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final long ACCESS_TOKEN_TTL_SECONDS = 900L; //15 minutes
    private static final long REFRESH_TOKEN_TTL_SECONDS = 2592000L; //30 days

    public JwtService(@Value("${app.security.jwt-secret}") String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "app.security.jwt-secret must be at least 32 bytes; got " + keyBytes.length);
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(UUID userId, String email, String activeRole) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim(ACTIVE_ROLE_CLAIM, activeRole)
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ACCESS_TOKEN_TTL_SECONDS)))
                .signWith(key)
                .compact();
    }

    public long getRefreshTokenTtlSeconds() {
        return REFRESH_TOKEN_TTL_SECONDS;
    }

    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException ex) {
            throw new ApiException("Token expired");
        } catch (JwtException ex) {
            throw new ApiException("Invalid token");
        }
    }

    public void validateAccessToken(String token) {
        Claims claims = validateToken(token);
        String type = claims.get(TOKEN_TYPE_CLAIM, String.class);
        if (!ACCESS_TOKEN_TYPE.equals(type)) {
            throw new ApiException("Invalid token type");
        }
    }

    public UUID extractUserId(String token) {
        Claims claims = validateToken(token);
        return UUID.fromString(claims.getSubject());
    }

    public String extractEmail(String token) {
        Claims claims = validateToken(token);
        return claims.get("email", String.class);
    }

    public String extractActiveRole(String token) {
        Claims claims = validateToken(token);
        return claims.get(ACTIVE_ROLE_CLAIM, String.class);
    }
}
