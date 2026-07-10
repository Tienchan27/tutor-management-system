package com.example.tms.util;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;

@Service
public class AdvisoryLockService {
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Acquires a transaction-scoped advisory lock (released on commit/rollback).
     * Serializes month-close style jobs across admin UI, schedulers, and multiple app instances.
     */
    public void acquireTransactionLock(String key) {
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:key))")
                .setParameter("key", key)
                .getSingleResult();
    }
}
