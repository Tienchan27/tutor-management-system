package com.example.tms.api;

import com.example.tms.api.dto.common.SliceResponse;
import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.SessionListItemResponse;
import com.example.tms.api.dto.session.TutorSessionClassOptionResponse;
import com.example.tms.api.dto.session.UpdateSessionRequest;
import com.example.tms.api.util.PageableGuard;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/sessions")
public class SessionController {
    private final SessionService sessionService;
    private final CurrentUserResolver currentUserResolver;

    public SessionController(SessionService sessionService, CurrentUserResolver currentUserResolver) {
        this.sessionService = sessionService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public SessionListItemResponse create(@Valid @RequestBody CreateSessionRequest request) {
        return sessionService.create(currentUserResolver.requireUser(), request);
    }

    @PatchMapping("/{sessionId}")
    public SessionListItemResponse updateSession(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpdateSessionRequest request
    ) {
        return sessionService.updateSession(currentUserResolver.requireUser(), sessionId, request);
    }

    @DeleteMapping("/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(@PathVariable UUID sessionId) {
        sessionService.deleteSession(currentUserResolver.requireUser(), sessionId);
    }

    @GetMapping
    public SliceResponse<SessionListItemResponse> byMonth(@RequestParam String payrollMonth, Pageable pageable) {
        Pageable guarded = PageableGuard.guard(
                pageable,
                50,
                Sort.by(Sort.Direction.DESC, "date"),
                Set.of("date", "createdAt")
        );
        Slice<SessionListItemResponse> slice = sessionService.getByPayrollMonth(currentUserResolver.requireUser(), payrollMonth, guarded);
        return new SliceResponse<>(
                slice.getContent(),
                slice.hasNext(),
                guarded.getPageNumber(),
                guarded.getPageSize(),
                PageableGuard.sortToString(guarded.getSort())
        );
    }

    @GetMapping("/my-classes")
    public List<TutorSessionClassOptionResponse> myClasses() {
        return sessionService.getTutorClasses(currentUserResolver.requireUser());
    }
}
