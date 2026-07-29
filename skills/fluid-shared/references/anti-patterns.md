# Anti-patterns (what review + the scanner flag)

Each entry: what it looks like, why it's wrong, the fix. The hook scanner (`scripts/scan.mjs`) flags the high-signal subset automatically (marked 🔎). `fluid-review` covers all of them with judgment.

## 🔎 Physical-direction utilities/properties (RTL footgun) — highest value
- **Looks like:** `ml-4 mr-2 pl-3 pr-3 left-0 right-0 text-left text-right border-l border-r rounded-l rounded-r`; raw `margin-left/right`, `padding-left/right`, `border-left/right`, `left:`/`right:`, `text-align: left/right`.
- **Why:** doesn't mirror under `dir="rtl"` — breaks Arabic.
- **Fix:** logical equivalents — `ms-/me- ps-/pe- start-/end- text-start/end border-s/border-e rounded-s/rounded-e`; or `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`. (Full map: `rtl-checklist.md`.)

## 🔎 Width media queries for layout
- **Looks like:** `@media (min-width: …)` / `@media (max-width: …)` in `.css`/`.scss`.
- **Why:** breakpoints are guesses; they watch the window, not the component; duplicated rules; awkward between steps.
- **Fix:** intrinsic grid (`repeat(auto-fit, minmax())`), `clamp()` for scalar changes, or a container query (`@container`) for component-local layout shifts.

## 🔎 Fixed `px` font-size (and other obviously-scalar px values)
- **Looks like:** `font-size: 32px` in a style block; `text-[32px]`.
- **Why:** doesn't scale with space; ignores user zoom/font setting.
- **Fix:** `clamp(rem, …cqi/vw, rem)` → `text-[clamp(1.25rem,0.5rem+4cqi,2.5rem)]`.

## 🔎 Full-viewport-height with `100vh` / `h-screen` (mobile footgun)
- **Looks like:** `height: 100vh` / `min-height: 100vh` in CSS; `h-screen` / `min-h-screen` in Tailwind.
- **Why:** `100vh` is the *largest* mobile viewport (toolbars hidden), so the region is taller than the visible screen — content/CTAs get hidden under the address bar.
- **Fix:** dynamic viewport units (Baseline 2023) — `min-height: 100svh` (safe) or `100dvh` (live); Tailwind `min-h-svh` / `min-h-dvh` / `h-dvh`. Flagged **soft** (some desktop-only full-height uses are fine).

## Hard-coded column counts / breakpoint-stepped grids (review only)
- **Looks like:** `grid-cols-3` with `sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3` stacks; or `repeat(3, 1fr)` fixed.
- **Why:** enumerates widths instead of describing the rule; cramps in narrow containers.
- **Fix:** `grid-cols-[repeat(auto-fit,minmax(180px,1fr))]`.

## `:hover` effects not gated by capability (review only)
- **Looks like:** hover styles with no `(hover: hover)` guard.
- **Why:** sticky hover states on touch devices.
- **Fix:** gate behind `[@media(hover:hover)]:` / a `(hover:hover)` media block.

## Animation without motion-preference gate (review only)
- **Looks like:** `transition`/`animate-*` with no `motion-safe`/`prefers-reduced-motion`.
- **Why:** ignores users who asked for less motion (accessibility).
- **Fix:** `motion-safe:transition` (add) or `motion-reduce:transition-none` (strip).

## `[dir="rtl"]` override rules (review only)
- **Looks like:** a second rule block keyed on `[dir="rtl"]` to undo physical sides.
- **Why:** the old, brittle two-stylesheet approach; logical properties make it unnecessary.
- **Fix:** delete the override; use logical properties so one rule serves both directions.

---

### Scanner scope & tuning
The scanner is **warn-only** and conservative to stay high-signal:
- Acts only on `.tsx/.jsx/.css/.scss`.
- Flags the 🔎 items above.
- **Does not** flag Tailwind responsive prefixes (`sm:/md:/lg:`) — too common and not always wrong; `fluid-review` raises those case-by-case.
- Skips matches inside comments where cheap to detect.
