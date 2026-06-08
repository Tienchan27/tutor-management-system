# TMS Frontend UI Guidelines (Phase 1.5)

## Stack

- Create React App + semantic tokens in `frontend/src/styles/globals.css`
- Reusable components under `frontend/src/components/ui`, `layout`, `feedback`
- No Tailwind import in app code

## Copy

- **English only** for user-visible strings
- Sentence case for actions: `Close payroll`, `View month`
- Enum display: title case (`Unpaid`, `Pending`)

## Money

Use `formatVnd(amount)` from `frontend/src/utils/format.ts`:

- Output: `1,234,456 VND`
- Never render raw numbers in tables or cards

## Surfaces (max 2 tiers visible)

| Token | Use |
|-------|-----|
| `--bg-page` | Main canvas |
| `--bg-sidebar` | Sidebar (slightly darker than page) |
| `--bg-surface` | Cards, modals, inputs |
| `--bg-subtle` | Hover, active nav, table stripe |

Prefer `SectionBlock` (spacing only) over nested `.panel` boxes.

## Accent budget

Amber (`--brand-amber`) **only** for:

- Primary CTA buttons
- Focus rings
- Nav active left bar (3px)
- Underline tab active indicator
- Spinner accent

**Never** amber for: secondary hovers, user menu hovers, accordion headers, panel backgrounds, table row hovers.

Semantic colors (success/warning/danger) **only** via `StatusPill`, toasts, and `error-text` / `success-text`.

## Layout

- `PageHeader` — title + subtitle + actions per route
- `PageSection` — single card wrapper per logical block
- `SectionBlock` — subsection with title, no extra border box
- `AppShell` — nav spine + `AppUserMenu` in sidebar footer (desktop) and header (mobile)
- Role switch lives in user popover only (multi-role users)

## Components

- `Button` variants: `primary`, `secondary`, `ghost`, `danger` — avoid raw `btn-*` classes in pages
- `Tabs` — underline style
- `Stepper` — multi-step flows (e.g. publish class)
- `SlideOver` — drawers (tuition edit, roster, financials)
- `StudentChipList` — roster chips on publish flow

## Feedback

- Success/info: `useToast()`
- Destructive: `ConfirmDialog`
- Tables: `Spinner`, `EmptyState`, inline `error-text`

## Status

- `StatusPill` tones: `success`, `warning`, `danger`, `neutral`
- Shared mappers in `frontend/src/utils/statusTone.ts`

## Accessibility

- Popover/drawer: Escape to close, focus trap in `SlideOver`
- No dark patterns: sign out always visible in user menu
