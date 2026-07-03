# TMS Frontend UI Guidelines

## Stack

- **Vite + React 19 + TypeScript 5**. Build: `npm run build` (`tsc && vite build`).
- **Tailwind CSS v4** is wired via `@tailwindcss/vite`; brand tokens live in `frontend/src/styles/theme.css` (`@theme`). Component styling currently lives in `frontend/src/styles/globals.css` (a `:root` token block + semantic classes) — this is a deliberate hybrid: tokens in Tailwind, component CSS in globals. Re-skins are done by editing the `:root` token values.
- Reusable components under `frontend/src/components/ui`, `layout`, `feedback`.

## Design direction — bright "Hands for Hands"

Bright, warm, friendly (education brand). Depth comes from **elevation and tint**, never from darkening.

- **Near-white warm canvas** (`--bg-page`), **white cards lifted by soft warm shadows**.
- **Light peach sidebar** with a **solid-orange active pill** (not a dark sidebar, not a 3px left bar).
- Vivid orange is the single interactive accent; components stand out via shadow + tinted fills + whitespace.

## Copy

- **English only** for user-visible strings
- Sentence case for actions: `Close payroll`, `Log session`
- Enum display: title case (`Unpaid`, `Pending`)

## Money

Use `formatVnd(amount)` from `frontend/src/utils/format.ts`:

- Output: `1,234,456 VND`
- Never render raw numbers in tables or cards

## Surfaces & elevation

| Token | Use |
|-------|-----|
| `--bg-page` | Near-white warm canvas |
| `--bg-surface` | White cards, modals (lifted by `--shadow`) |
| `--bg-subtle` | Recessed inputs, table headers, hover |
| `--sidebar-bg` | Light peach rail |

Cards use `--shadow` (soft warm) to lift off the canvas; inputs/table headers use `--bg-subtle` to recede. Prefer `SectionBlock` (spacing only) over nested `.panel` boxes.

## Accent budget

The interactive/brand accent is **action orange** (`--brand-amber`, now vivid orange) — used for:

- Primary CTA buttons (white text, subtle glow)
- Focus rings and links
- Sidebar **active nav pill** (solid orange, white text)

Stat cards use soft tinted fills (peach/violet/mint/rose) via `stat-card-accent-*`. Brand red (`--danger-red` family) is identity + destructive only.

**Never** the accent for: secondary hovers, user-menu hovers, panel backgrounds, table row hovers.

Semantic colors (success/warning/danger) via `StatusPill`, toasts, `error-text` / `success-text`, and targeted actions:

| Token | Use |
|-------|-----|
| `--success` / `btn-success` | Confirm paid, close payroll/tuition confirms |
| `--danger-red` / `btn-danger` | Revoke, delete, destructive confirms |
| `app-user-menu-item-danger` | Sign out in user menu |

Do not use semantic greens/reds for navigation hovers or table stripes.

## Layout

- `PageHeader` — title + subtitle + actions per route
- `PageSection` — single card wrapper per logical block
- `SectionBlock` — subsection with title, no extra border box
- `AppShell` — nav spine + `AppUserMenu` in sidebar footer (desktop) and header (mobile)
- Role switch lives in user popover only (multi-role users)

## Components

- `Button` variants: `primary` (orange), `secondary`, `ghost`, `danger`, `success` (green — e.g. Approve) — avoid raw `btn-*` in pages
- `Modal` — dialogs (publish/edit class, incl. live roster editing); `ConfirmDialog` for destructive confirms
- `SlideOver` — drawers (session edit incl. date/duration, class roster)
- `StudentChipList` — roster chips on the publish flow
- Class-management tabs use the local `.cm-tabs` styles (the old generic `Tabs`/`Badge`/`Stepper` components were removed as dead code)

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
