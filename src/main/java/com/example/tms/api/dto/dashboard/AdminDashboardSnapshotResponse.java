package com.example.tms.api.dto.dashboard;

public record AdminDashboardSnapshotResponse(
        long activeClasses,
        long awaitingTutor,
        long pendingApplications,
        long tutorCount,
        long openPayouts,
        long paidPayouts,
        long payoutTotal,
        long unpaidInvoices,
        long invoiceTotal
) {
}
