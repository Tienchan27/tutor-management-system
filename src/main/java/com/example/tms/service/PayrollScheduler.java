package com.example.tms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.time.ZoneId;

@Component
public class PayrollScheduler {
    private static final Logger log = LoggerFactory.getLogger(PayrollScheduler.class);

    private final PayoutService payoutService;

    public PayrollScheduler(PayoutService payoutService) {
        this.payoutService = payoutService;
    }

    @Scheduled(cron = "0 0 0 1 * *", zone = "Asia/Ho_Chi_Minh")
    public void runMonthlyPayrollPlaceholder() {
        YearMonth targetMonth = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(1);
        log.info("Monthly payroll scheduler triggered for {}", targetMonth);
        payoutService.generateMonthlyPayoutsInternal(targetMonth);
    }
}
