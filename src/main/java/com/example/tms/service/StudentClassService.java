package com.example.tms.service;

import com.example.tms.api.dto.invoice.StudentClassResponse;
import com.example.tms.api.mapper.InvoiceMapper;
import com.example.tms.entity.User;
import com.example.tms.entity.enums.EnrollmentStatus;
import com.example.tms.repository.EnrollmentRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StudentClassService {
    private final EnrollmentRepository enrollmentRepository;

    public StudentClassService(EnrollmentRepository enrollmentRepository) {
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('STUDENT')")
    public List<StudentClassResponse> listActiveClasses(User student) {
        return enrollmentRepository.findByStudentIdAndStatus(student.getId(), EnrollmentStatus.ACTIVE).stream()
                .map(InvoiceMapper::toClassResponse)
                .toList();
    }
}
