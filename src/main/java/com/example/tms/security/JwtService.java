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
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";
    private static final long ACCESS_TOKEN_TTL_SECONDS = 3600L;
    private static final long REFRESH_TOKEN_TTL_SECONDS = 604800L;

    public JwtService(@Value("${app.security.jwt-secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UUID userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ACCESS_TOKEN_TTL_SECONDS)))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(UUID userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                // Ensure each refresh token is unique even for back-to-back issuance.
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(REFRESH_TOKEN_TTL_SECONDS)))
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

    public void validateRefreshToken(String token) {
        Claims claims = validateToken(token);
        String type = claims.get(TOKEN_TYPE_CLAIM, String.class);
        if (!REFRESH_TOKEN_TYPE.equals(type)) {
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
}
