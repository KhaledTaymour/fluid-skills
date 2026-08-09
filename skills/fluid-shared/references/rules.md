# Fluid — the rules

The seven rules every `fluid-*` skill enforces. Self-contained: this file is the source of truth; the suite carries it (portable). Each rule = the idea, the do, the don't.

> One-line thesis: **describe the rule, don't enumerate the widths.** Layouts should adapt by design, not by a pile of width breakpoints — and be RTL-correct by default.

---

## 1. Intrinsic layout (no width breakpoints)

Let the layout fit the space. A grid that "fits as many ~Npx columns as it can" needs no `@media`.

- **CSS:** `display: grid; gap: …; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));`
- **Do:** use `auto-fit` (collapses empty tracks so items stretch); use `gap` (direction-agnostic); flex `flex-wrap` for simpler rows.
- **Don't:** enumerate breakpoints ("below 600 → 1 col, below 900 → 2"); hard-code column counts; use `margin-left` for spacing.

## 2. Fluid values with `clamp()`

Any value that just *scales* (font, padding, gap, radius) becomes one self-limiting line.

- **CSS:** `clamp(MIN, PREFERRED, MAX)` — floor, scaling term, ceiling.
- **2026 best practice:** floor/ceiling in `rem` (zoom-safe, respects the user's font setting); scaling term seeded with a `rem` plus a viewport/container unit, e.g. `clamp(1.25rem, 0.5rem + 4cqi, 2.5rem)`.
- **Do:** use `rem` bounds; use `cqi` (container) or `vw` (viewport) for the scaling term.
- **Don't:** raw `px` bounds (ignores zoom); a bare `vw`/`cqi` font-size with no `rem` (ignores the reader's font preference mid-scale).
- **Applies to any length** — not just `font-size` (padding, gap, margin, width, border-radius, line-height).

## 3. Container queries — component responds to its own box

A reused component should react to *its* container, not the window.

- **CSS:** mark the parent `container-type: inline-size`, then `@container (min-width: 380px) { … }`. Container units: `cqi` = 1% of the container's inline size.
- **Do:** use `@container` for component-local layout shifts; default to the small layout, enhance up.
- **Don't:** use `@media (width)` for component layout — that watches the window, not the box.

## 4. Media queries reframed — capability, not width

Width is solved by rules 1–3. Reserve `@media` for the *environment*.

- **Features:** `(hover: hover)`, `(pointer: fine|coarse)`, `(prefers-reduced-motion: no-preference|reduce)`, `(prefers-color-scheme)`, `(prefers-contrast)`.
- **Do:** gate hover effects behind `(hover: hover)`; size tap targets by `(pointer: coarse)`; gate motion behind `(prefers-reduced-motion: no-preference)` (or strip it under `reduce`).
- **Don't:** `@media (min-width|max-width)` for responsive layout.

## 5. Logical properties — RTL-safe by default

Name edges by role, not physical side, so the same CSS is correct in English and Arabic.

- **Map:** `margin-left`→`margin-inline-start`, `padding-right`→`padding-inline-end`, `border-left`→`border-inline-start`, `text-align:left`→`text-align:start`, `left:0`→`inset-inline-start:0`, `top/bottom`→`inset-block-start/end`.
- **Do:** write all layout/alignment/positioning logically by default.
- **Don't:** hard-code `left`/`right`/`top`/`bottom` or `[dir="rtl"]` override rules.
- **Test:** set `dir="rtl"`, change nothing else — it should mirror correctly.

## 6. No width media queries for layout

A consequence of 1–4, stated on its own because it's the most common anti-pattern: width adaptation belongs to grid intrinsics, `clamp()`, and container queries — not to `@media (min-width)`.

## 7. Describe the rule, not the widths

The meta-rule. Express *intent* ("fit as many as you can", "scale between these bounds", "switch when my box is wide enough") and let the browser compute every point. Fewer rules, correct at widths you never tested.

## 8. Mobile full-height — `svh` / `lvh` / `dvh`, never bare `100vh`

`100vh` on mobile is the *largest* viewport (toolbars hidden), so a `100vh` hero is taller than the screen — content/CTAs hide under the address bar. Use the dynamic viewport units (Baseline 2023):

- `svh` = small viewport (toolbars shown) · `lvh` = large (hidden) · `dvh` = dynamic (follows the toolbar live).
- **Do:** `min-height: 100svh` (safe — fits even with toolbars) or `100dvh` (resizes live). Tailwind: `min-h-svh` / `min-h-dvh` / `h-dvh` (v3.4+).
- **Don't:** `height: 100vh` / `min-height: 100vh` / Tailwind `h-screen` / `min-h-screen` for full-height mobile layouts.

## 9. Safe areas — under `viewport-fit=cover` the screen is not all yours

A notched phone reserves strips for the status bar, the home indicator, and — in landscape — the cut-out. `<meta name="viewport" content="…, viewport-fit=cover">` asks for all of them; in exchange **you** must keep content out. Read them with `env(safe-area-inset-top | right | bottom | left)`.

- **Always floor it:** `padding-bottom: max(env(safe-area-inset-bottom), 1rem)`. A bare `env()` is `0` off-device, so it *deletes* spacing you already had. (The old `padding: 48px; padding: env(…)` redeclaration idiom is worse still — on a phone it *lowers* 48px to 34px.)
- **Add to a fixed height; never pad into one.** Under `border-box`, `height: 3.5rem; padding-top: env(safe-area-inset-top)` shrinks the bar's interior rather than moving it down, and centred controls then spill back into the notch. Use `height: calc(3.5rem + env(safe-area-inset-top))`.
- **Every viewport-edge-anchored surface owns its own insets.** Padding the app shell cannot reach a `position: fixed` overlay portalled to `<body>` — it isn't a descendant.
- **`inset-left`/`-right` are physical.** CSS ships no `-start`/`-end` variants. Define your own and swap them under `[dir="rtl"]`, then use `ps-`/`pe-` as normal — see `rtl-checklist.md`.
- **DevTools cannot show you this.** Device emulation does not simulate safe areas, and a Safari tab hides it because the browser insets for you. Route insets through custom properties so you can override them to fake a device — `env()` itself cannot be faked.

> Why it matters: this class of bug is invisible in dev, in review, and in emulation. It appears only once the app is installed.

---

### Mobile-first + RTL defaults (how these combine)
- Start from the smallest layout; let intrinsic rules and container queries enhance upward. No desktop-down overrides.
- Spacing via `gap` and logical properties only. Flip `dir="rtl"` as the acceptance test for every component.
- Full-height regions use `svh`/`dvh`, not `100vh`/`h-screen` (mobile address-bar safe).
