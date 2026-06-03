package com.example.tms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

@Component
public class StudentInvoiceScheduler {
    private static final Logger log = LoggerFactory.getLogger(StudentInvoiceScheduler.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final StudentInvoiceService studentInvoiceService;
    private final int autoDay;

    public StudentInvoiceScheduler(
            StudentInvoiceService studentInvoiceService,
            @Value("${app.invoice.auto-day:1}") int autoDay
    ) {
        this.studentInvoiceService = studentInvoiceService;
        this.autoDay = autoDay;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runAutoCloseIfConfiguredDay() {
        int today = LocalDate.now(ZONE).getDayOfMonth();
        if (today != autoDay) {
            return;
        }
        YearMonth targetMonth = YearMonth.now(ZONE).minusMonths(1);
        log.info("Student invoice auto-close triggered for {}", targetMonth);
        studentInvoiceService.generateForMonthInternal(targetMonth, false);
    }
}
