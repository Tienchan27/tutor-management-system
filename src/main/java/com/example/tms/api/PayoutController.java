package com.example.tms.api;

import com.example.tms.api.dto.payout.OverrideNetSalaryRequest;
import com.example.tms.api.dto.payout.TutorPayoutPaymentResponse;
import com.example.tms.api.dto.payout.TutorPayoutResponse;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.PayoutService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/payouts")
public class PayoutController {
    private final PayoutService payoutService;
    private final CurrentUserResolver currentUserResolver;

    public PayoutController(PayoutService payoutService, CurrentUserResolver currentUserResolver) {
        this.payoutService = payoutService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping("/generate")
    public List<TutorPayoutResponse> generate(@RequestParam String month) {
        return payoutService.generateMonthlyPayouts(
                currentUserResolver.requireUser(),
                YearMonth.parse(month)
        );
    }

    @PostMapping("/{payoutId}/qr")
    public TutorPayoutPaymentResponse generateQr(@PathVariable UUID payoutId) {
        return payoutService.generateQr(currentUserResolver.requireUser(), payoutId);
    }

    @PostMapping("/{payoutId}/confirm-paid")
    public TutorPayoutResponse confirmPaid(@PathVariable UUID payoutId) {
        return payoutService.confirmPaid(currentUserResolver.requireUser(), payoutId);
    }

    @PatchMapping("/{payoutId}/override-net-salary")
    public TutorPayoutResponse overrideNetSalary(
            @PathVariable UUID payoutId,
            @Valid @RequestBody OverrideNetSalaryRequest request
    ) {
        return payoutService.overrideNetSalary(currentUserResolver.requireUser(), payoutId, request.netSalary());
    }
}
