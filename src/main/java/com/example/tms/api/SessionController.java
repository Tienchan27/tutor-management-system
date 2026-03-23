package com.example.tms.api;

import com.example.tms.api.dto.session.CreateSessionRequest;
import com.example.tms.api.dto.session.UpdateSessionFinancialRequest;
import com.example.tms.entity.Session;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
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
    public Session create(@Valid @RequestBody CreateSessionRequest request) {
        return sessionService.create(currentUserResolver.requireUser(), request);
    }

    @PatchMapping("/{sessionId}/financial")
    public Session updateFinancial(
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpdateSessionFinancialRequest request
    ) {
        return sessionService.updateFinancial(currentUserResolver.requireUser(), sessionId, request);
    }

    @GetMapping
    public List<Session> byMonth(@RequestParam String payrollMonth) {
        return sessionService.getByPayrollMonth(payrollMonth);
    }
}
