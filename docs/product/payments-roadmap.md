# Payments roadmap

Context: payments in Vietnam are done by opening a banking app, scanning a **VietQR** code, and confirming a transfer. We optimize for **convenience + zero fees** (no card/gateway). Foreign payers and card payments are out of scope for now.

## Two money flows (opposite directions)

- **Tuition (inbound):** student → the **center's** receiving account. QR encodes the center account.
- **Payout (outbound):** center → the **tutor's** account. QR encodes the tutor's account.

Two independent concerns:
1. **Generating the QR** — easy, free, done in-app. No third-party API.
2. **Knowing it was paid (reconciliation)** — the real decision; deferred (see Phase 2).

## VietQR generation (self-generated, free)

VietQR is Vietnam's national QR standard (NAPAS, EMVCo-based). We build the QR string ourselves — no dependency on any QR API:
- Backend `VietQrGenerator`: build the EMVCo TLV payload (NAPAS AID `A000000727`, bank BIN + account in tag `38`, service `QRIBFTTA`, currency `704`, amount `54`, description in `62/08`) + `CRC16/CCITT-FALSE`.
- Frontend renders the string with `qrcode.react`. Any VN banking app scans it and pre-fills a normal (free) Napas 24/7 transfer.

### Bank catalog + BIN
- Source: `https://api.vietqr.io/v2/banks` (free, public) → `bin`, `code`, `shortName`, `name`, `logo`, `transferSupported`, `lookupSupported`.
- Catalog is **not** Flyway-seeded. First time a bank picker needs data, the app calls `POST /bank-catalog/ensure` (authenticated; syncs only if empty). Admins can force-refresh via `POST /admin/bank-catalog/sync`. Do not call vietqr.io on every request.
- In any **receiving-account picker**, **disable** banks with `transferSupported = 0` (show them with a `*` + tooltip, but block selection — picking one produces a QR nobody can pay).

### Center receiving account
- A dedicated `center_bank_account` config (bank code + account number + holder name).
- **Not auto-saved.** Fresh installs use a setup gate: admin configures Center account in Settings. Optional UI prefill from the admin's primary personal bank account (review + Save). Decoupled afterward — changing the admin's personal account does not silently change the center account.

### Reference code (the reconciliation key)
- Each invoice/payout gets a unique, short, **alphanumeric-only (no spaces/diacritics)** `qr_ref` (e.g. `HP<shortId>` for tuition, `LUONG<shortId>` for payout), embedded in the QR description (`62/08`).
- Used today for eyeball matching on manual confirm; later as the auto-match key for webhooks.

## Phase 1 — self-generated VietQR + manual confirmation (free, no signup) ← current plan

Data model (Flyway migrations; `V1` remains the immutable baseline and later migrations extend it):
- Bank catalog table (populated via ensure/sync from vietqr.io), storing all fields.
- `center_bank_account` config (admin-editable; setup gate until configured).
- Add `bank_code`/BIN to `tutor_bank_accounts` (bank chosen from the catalog, not free text).
- Add `qr_ref` to `invoices` and `tutor_payout_payments` (amounts already exist: `invoice.totalAmount`, `payout.netSalary`).

Backend:
- `VietQrGenerator` + `BankCatalog` (+ CRC unit tests).
- Tuition: expose a VietQR for an invoice (center account + amount + ref); `POST /admin/invoices/{id}/confirm-paid` → create `Payment(SUCCESS)` + invoice `PAID` + notify.
- Payout: `PayoutService.generateQr` builds a real VietQR from the tutor's primary account + `netSalary` + ref.
- Payout QR lifecycle:
  - QR generation is allowed only while the payout is `LOCKED`.
  - If a `PENDING` QR already exists, generating again returns the existing QR instead of creating another payment row.
  - Once a `PENDING` QR exists, admin net-salary override is blocked because the QR amount has already been issued.
  - Manual `confirm-paid` remains allowed without a QR. If a pending QR exists, confirmation marks that QR `SUCCESS`.
- `PaymentConfirmationPort` interface — manual confirmation is one implementation; webhook is a future one.

Frontend:
- `VietQrView` component (renders the string, shows bank/account/holder/amount/description + copy).
- Student Invoices: "Pay" → modal with VietQR + "open your banking app to scan".
- Admin Student tuition page: "Confirm received" per unpaid invoice.
- Admin Settings: manage the center receiving account.
- Bank forms (tutor + admin): bank **dropdown** from the catalog (BIN required for VietQR).
- Payout page: "Show QR" (admin scans to pay the tutor) + "Confirm paid".

Tutor bank-account `isVerified` is currently auto-set by the tutor bank-account flow. There is no admin bank-verification workflow in the MVP; tutors are responsible for checking their own payout details before relying on them.

## Phase 2 — automatic reconciliation (deferred)

When money arrives, a watcher notifies the backend so status flips automatically (no manual step). Options considered:
- **MB Bank direct API** (preferred if the center uses an MB business/merchant account with an official free transaction API) — verify terms with MB.
- **SePay / Casso** aggregator free tiers (SePay promo ~500 tx/month for a year; Casso ~30/month). Only the **center's own** bank needs to be supported — payers can send from any bank.
- Avoid unofficial bank API wrappers / SMS-forwarding for real money (ToS-gray, fragile).

Webhook handler requirements (reuse `PaymentConfirmationPort`):
- Auth (API key / HMAC signature), reject unauthorized.
- Idempotency by the provider's transaction id (providers retry).
- Match by `qr_ref` in the transfer description; verify amount; then apply Payment → `PAID`/`PARTIALLY_PAID`.
- Unmatched/mismatched transfers go to a manual-review fallback (manual confirm stays available).

## Notes
- Manual confirmation remains the always-free, unlimited fallback even after Phase 2.
- Timezone `Asia/Ho_Chi_Minh` for due dates and schedulers.
