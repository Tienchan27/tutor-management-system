-- At most one successful tuition payment per invoice (DB seatbelt for concurrent confirm paths).
CREATE UNIQUE INDEX uk_payments_one_success_per_invoice
    ON payments(invoice_id)
    WHERE status = 'SUCCESS';
