package com.example.tms.repository;

import com.example.tms.entity.User;
import com.example.tms.entity.UserProvider;
import com.example.tms.entity.enums.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserProviderRepository extends JpaRepository<UserProvider, UUID> {
    /**
     * Find OAuth provider by provider type and provider user ID
     * Used for OAuth login to check if user has logged in with this provider before
     */
    Optional<UserProvider> findByProviderAndProviderId(ProviderType provider, String providerId);

    /**
     * Find OAuth provider by user and provider type
     * Used to check if user has linked a specific OAuth provider
     */
    Optional<UserProvider> findByUserAndProvider(User user, ProviderType provider);

    /**
     * Check if OAuth provider exists
     * Used to prevent duplicate OAuth account linking
     */
    boolean existsByProviderAndProviderId(ProviderType provider, String providerId);

    /**
     * Check if user has already linked this provider type
     * Prevents multiple accounts of same provider per user
     */
    boolean existsByUserAndProvider(User user, ProviderType provider);
}
