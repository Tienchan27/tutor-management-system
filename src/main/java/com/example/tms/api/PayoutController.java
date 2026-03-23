package com.example.tms.api;

import com.example.tms.entity.TutorPayout;
import com.example.tms.entity.TutorPayoutPayment;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.PayoutService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    public List<TutorPayout> generate(@RequestParam String month) {
        return payoutService.generateMonthlyPayouts(
                currentUserResolver.requireUser(),
                YearMonth.parse(month)
        );
    }

    @PostMapping("/{payoutId}/qr")
    public TutorPayoutPayment generateQr(@PathVariable UUID payoutId) {
        return payoutService.generateQr(currentUserResolver.requireUser(), payoutId);
    }

    @PostMapping("/{payoutId}/confirm-paid")
    public TutorPayout confirmPaid(@PathVariable UUID payoutId) {
        return payoutService.confirmPaid(currentUserResolver.requireUser(), payoutId);
    }
}
