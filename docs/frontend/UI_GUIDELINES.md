# TMS Frontend UI Guidelines (Phase 1)

## Stack

- Create React App + shared tokens in `frontend/src/styles/globals.css`
- Reusable components under `frontend/src/components/ui`, `layout`, `feedback`
- No Tailwind import in Phase 1

## Copy

- **English only** for user-visible strings (labels, buttons, toasts, empty states)
- Sentence case for actions: `Close payroll`, `View month`
- Enum display: title case (`Unpaid`, `Pending`)

## Money

Use `formatVnd(amount)` from `frontend/src/utils/format.ts`:

- Output: `1,234,456 VND` (en-US grouping, space before `VND`)
- Never render raw numbers in tables or cards

## Layout

- `PageHeader` — title + optional subtitle + actions per route
- `PageSection` — card wrapper with section header
- `AppShell` — sidebar nav; hybrid role switch:
  - Desktop (≥768px): `RoleSegmented` in sidebar footer
  - Mobile: drawer nav + `AppUserMenu` in header (“View as”, Account, Sign out)

## Feedback

- Success/info: `useToast()`
- Destructive actions: `ConfirmDialog`
- Tables: loading `Spinner`, empty `EmptyState`, inline `error-text`

## Status

- Use `StatusPill` with tones: `success`, `warning`, `danger`, `neutral`

## Tabs

- Use `Tabs` for multi-panel pages (sessions, class assignment)
