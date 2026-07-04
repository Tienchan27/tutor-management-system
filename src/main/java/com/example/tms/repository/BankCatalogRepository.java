package com.example.tms.repository;

import com.example.tms.entity.BankCatalogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankCatalogRepository extends JpaRepository<BankCatalogEntry, String> {
    List<BankCatalogEntry> findAllByOrderByShortNameAsc();
}
