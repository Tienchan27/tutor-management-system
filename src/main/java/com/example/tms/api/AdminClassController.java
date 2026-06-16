package com.example.tms.api;

import com.example.tms.api.dto.classes.ClassReviewRequest;
import com.example.tms.api.dto.classes.PublishClassRequest;
import com.example.tms.api.dto.classes.PublishedClassResponse;
import com.example.tms.api.dto.classes.StudentLookupResponse;
import com.example.tms.api.dto.classes.SubjectOptionResponse;
import com.example.tms.api.dto.classes.TutorClassApplicationResponse;
import com.example.tms.api.dto.classes.UpdateClassDisplayNameRequest;
import com.example.tms.api.dto.classes.UpdateClassRequest;
import com.example.tms.api.dto.common.SliceResponse;
import com.example.tms.api.util.PageableGuard;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.ClassAssignmentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.Set;

@RestController
@RequestMapping("/admin/classes")
public class AdminClassController {
    private final ClassAssignmentService classAssignmentService;
    private final CurrentUserResolver currentUserResolver;

    public AdminClassController(ClassAssignmentService classAssignmentService, CurrentUserResolver currentUserResolver) {
        this.classAssignmentService = classAssignmentService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/subjects")
    public List<SubjectOptionResponse> subjects() {
        return classAssignmentService.listSubjects();
    }

    @GetMapping("/students/lookup")
    public StudentLookupResponse lookupStudent(@RequestParam String email) {
        return classAssignmentService.lookupStudent(currentUserResolver.requireUser(), email);
    }

    @PostMapping("/publish")
    public PublishedClassResponse publish(@Valid @RequestBody PublishClassRequest request) {
        return classAssignmentService.publishClass(currentUserResolver.requireUser(), request);
    }

    @GetMapping("/published")
    public SliceResponse<PublishedClassResponse> published(Pageable pageable) {
        Pageable guarded = PageableGuard.guard(
                pageable,
                50,
                Sort.by(Sort.Direction.DESC, "createdAt"),
                Set.of("createdAt", "pricePerHour")
        );
        Slice<PublishedClassResponse> slice = classAssignmentService.listPublishedClasses(currentUserResolver.requireUser(), guarded);
        return new SliceResponse<>(
                slice.getContent(),
                slice.hasNext(),
                guarded.getPageNumber(),
                guarded.getPageSize(),
                PageableGuard.sortToString(guarded.getSort())
        );
    }

    @GetMapping("/{classId}/applications")
    public SliceResponse<TutorClassApplicationResponse> applications(@PathVariable UUID classId, Pageable pageable) {
        Pageable guarded = PageableGuard.guard(
                pageable,
                50,
                Sort.by(Sort.Direction.ASC, "appliedAt"),
                Set.of("appliedAt")
        );
        Slice<TutorClassApplicationResponse> slice = classAssignmentService.listClassApplications(currentUserResolver.requireUser(), classId, guarded);
        return new SliceResponse<>(
                slice.getContent(),
                slice.hasNext(),
                guarded.getPageNumber(),
                guarded.getPageSize(),
                PageableGuard.sortToString(guarded.getSort())
        );
    }

    @PostMapping("/applications/{applicationId}/approve")
    public PublishedClassResponse approve(@PathVariable UUID applicationId) {
        return classAssignmentService.approveApplication(currentUserResolver.requireUser(), applicationId);
    }

    @PostMapping("/applications/{applicationId}/reject")
    public TutorClassApplicationResponse reject(
            @PathVariable UUID applicationId,
            @RequestBody(required = false) ClassReviewRequest request
    ) {
        return classAssignmentService.rejectApplication(
                currentUserResolver.requireUser(),
                applicationId,
                request == null ? null : request.reason()
        );
    }

    @PutMapping("/{classId}")
    public PublishedClassResponse updateClass(
            @PathVariable UUID classId,
            @Valid @RequestBody UpdateClassRequest request
    ) {
        return classAssignmentService.updateClass(currentUserResolver.requireUser(), classId, request);
    }

    @DeleteMapping("/{classId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClass(@PathVariable UUID classId) {
        classAssignmentService.deleteClass(currentUserResolver.requireUser(), classId);
    }

    @PatchMapping("/{classId}/display-name")
    public PublishedClassResponse updateDisplayName(
            @PathVariable UUID classId,
            @Valid @RequestBody UpdateClassDisplayNameRequest request
    ) {
        return classAssignmentService.updateClassDisplayName(currentUserResolver.requireUser(), classId, request.displayName());
    }
}
