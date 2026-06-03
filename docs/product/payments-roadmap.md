# Payments roadmap (Phase 2+)

Phase 1 prepares data models (`invoices`, `payments`) and a `PaymentConfirmationPort` stub only. No QR generation or webhooks are implemented for students yet.

## Student tuition flow (target)

1. Admin closes month → `invoices` rows `UNPAID`
2. Student sees invoice on **Student Invoices** page
3. Student pays via VietQR (aggregator: Casso, SePay, or bank-specific)
4. Webhook verifies signature + idempotency → `PaymentConfirmationPort` → invoice `PAID`

## Tutor payout flow (existing)

- Admin closes tutor payroll → `tutor_payouts` `LOCKED`
- QR payload on payout payment record (manual confirm today)

## Technical notes

- Store `qr_ref` on invoices when adding migration V2
- Webhook: HMAC signature, replay protection, amount match
- Separate idempotency keys per `externalReference`
- Timezone: `Asia/Ho_Chi_Minh` for due dates and schedulers

## Deferred

- Student in-app payment UI
- Bank webhook controllers
- Automatic reconciliation
