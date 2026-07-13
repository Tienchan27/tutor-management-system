package com.example.tms.security;

import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserStatus;
import com.example.tms.entity.enums.UserRoleStatus;
import com.example.tms.repository.UserRepository;
import com.example.tms.repository.UserRoleRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserRoleRepository userRoleRepository,
            UserRepository userRepository
    ) {
        this.jwtService = jwtService;
        this.userRoleRepository = userRoleRepository;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String token = extractBearerToken(request);
        if (token == null) {
            token = extractCookieToken(request);
        }

        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            jwtService.validateAccessToken(token);

            UUID userId = jwtService.extractUserId(token);
            boolean isActiveUser = userRepository.findById(userId)
                    .map(user -> user.getStatus() == UserStatus.ACTIVE)
                    .orElse(false);
            if (!isActiveUser) {
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }
            RoleName activeRole = parseActiveRole(jwtService.extractActiveRole(token));
            if (activeRole == null || !userRoleRepository.hasRole(userId, activeRole, UserRoleStatus.ACTIVE)) {
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            List<GrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + activeRole.name())
            );

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    authorities
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (RuntimeException ex) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    private String extractCookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if ("accessToken".equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value != null && !value.isBlank()) ? value : null;
            }
        }
        return null;
    }

    private RoleName parseActiveRole(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return RoleName.valueOf(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
