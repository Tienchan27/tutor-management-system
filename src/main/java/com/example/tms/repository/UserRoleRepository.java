package com.example.tms.repository;

import com.example.tms.entity.UserRole;
import com.example.tms.entity.enums.RoleName;
import com.example.tms.entity.enums.UserRoleStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {
    @Query("""
           select ur from UserRole ur
           join fetch ur.role r
           where ur.user.id = :userId and ur.status = :status
           """)
    List<UserRole> findByUserIdAndStatus(UUID userId, UserRoleStatus status);

    @Query("""
           select case when count(ur) > 0 then true else false end
           from UserRole ur
           where ur.user.id = :userId and ur.role.name = :role and ur.status = :status
           """)
    boolean hasRole(UUID userId, RoleName role, UserRoleStatus status);

    @Query("""
           select ur from UserRole ur
           where ur.role.name = :role and ur.status = :status
           """)
    List<UserRole> findByRoleAndStatus(RoleName role, UserRoleStatus status);

    @Query("""
           select ur from UserRole ur
           join fetch ur.user u
           where ur.role.name = :role and ur.status = :status
           """)
    Slice<UserRole> findByRoleAndStatus(RoleName role, UserRoleStatus status, Pageable pageable);

    @Query("""
           select ur from UserRole ur
           where ur.user.id = :userId and ur.role.name = :role
           """)
    Optional<UserRole> findByUserIdAndRole(UUID userId, RoleName role);

    @Query("""
           select count(ur) from UserRole ur
           where ur.role.name = :role and ur.status = :status
           """)
    long countByRoleAndStatus(@Param("role") RoleName role, @Param("status") UserRoleStatus status);
}
