package com.example.tms.api;

import com.example.tms.api.dto.classes.ApplyClassResponse;
import com.example.tms.api.dto.classes.AvailableClassResponse;
import com.example.tms.api.dto.common.SliceResponse;
import com.example.tms.api.util.PageableGuard;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.ClassAssignmentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.Set;

@RestController
@RequestMapping("/classes")
public class ClassMarketplaceController {
    private final ClassAssignmentService classAssignmentService;
    private final CurrentUserResolver currentUserResolver;

    public ClassMarketplaceController(ClassAssignmentService classAssignmentService, CurrentUserResolver currentUserResolver) {
        this.classAssignmentService = classAssignmentService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/available")
    public SliceResponse<AvailableClassResponse> available(Pageable pageable) {
        Pageable guarded = PageableGuard.guard(
                pageable,
                50,
                Sort.by(Sort.Direction.DESC, "createdAt"),
                Set.of("createdAt", "pricePerHour")
        );
        Slice<AvailableClassResponse> slice = classAssignmentService.listAvailableClasses(currentUserResolver.requireUser(), guarded);
        return new SliceResponse<>(
                slice.getContent(),
                slice.hasNext(),
                guarded.getPageNumber(),
                guarded.getPageSize(),
                PageableGuard.sortToString(guarded.getSort())
        );
    }

    @PostMapping("/{classId}/apply")
    public ApplyClassResponse apply(@PathVariable UUID classId) {
        return classAssignmentService.applyClass(currentUserResolver.requireUser(), classId);
    }
}
