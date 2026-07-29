# Concept → Tailwind (version-aware)

Maps each rule in `rules.md` to its Tailwind utility. **Verify utility names against the project's installed Tailwind version with context7** (`/tailwindlabs/tailwindcss.com`) before emitting — this table is a cross-check, not a substitute. Detect the version from `package.json` (`tailwindcss` dependency).

Key version facts (verified):
- **Logical utilities** (`ms-`/`me-`, `ps-`/`pe-`, `text-start`/`text-end`, `start-`/`end-`) — **v3.3+ and v4**, native, no plugin.
- **Container queries** — **native in v4** (`@container`, `@sm:`/`@lg:`, `@max-*` ranges, `cqi`/`cqw` arbitrary units). **v3 needs the `@tailwindcss/container-queries` plugin** (gives `@container` + `@md:` etc.).
- **Arbitrary values** (`text-[clamp(...)]`, `p-[clamp(...)]`) — both v3 and v4.

| Rule | Raw CSS | Tailwind v3 (3.4.x) | Tailwind v4 |
|---|---|---|---|
| Intrinsic grid | `grid-template-columns: repeat(auto-fit, minmax(180px,1fr))` | `grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4` | same |
| Flex wrap row | `display:flex; flex-wrap:wrap; gap` | `flex flex-wrap gap-4` | same |
| Fluid value | `font-size: clamp(1.25rem, 0.5rem + 4cqi, 2.5rem)` | `text-[clamp(1.25rem,0.5rem+4cqi,2.5rem)]` | same (also fluid `text-(length:--x)` w/ a var) |
| Fluid spacing | `padding: clamp(1rem, 4cqi, 2rem)` | `p-[clamp(1rem,4cqi,2rem)]` | same |
| Container (mark) | `container-type: inline-size` | `@container` (needs `@tailwindcss/container-queries` plugin) | `@container` (native) |
| Container query | `@container (min-width:380px){…}` | `@md:flex-row` (plugin) | `@md:flex-row` (native); ranges via `@max-md:` |
| Container unit | `5cqi` | `text-[5cqi]` (arbitrary) | `text-[5cqi]` |
| Mobile full-height | `min-height: 100dvh` (or `100svh`) | `min-h-dvh` / `min-h-svh` / `h-dvh` (v3.4+) | same |
| (avoid) full-height | `height: 100vh` | ~~`h-screen` / `min-h-screen`~~ → use `*-dvh`/`*-svh` | same |
| Capability media | `@media (hover:hover)` | `[@media(hover:hover)]:…` *(arbitrary variant)* | same; v4 also `hover:` is pointer-aware-ish — prefer the arbitrary media variant for true gating |
| Pointer coarse | `@media (pointer:coarse)` | `[@media(pointer:coarse)]:p-4` | same |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` | `motion-reduce:transition-none` / `motion-safe:transition` | same |
| Dark / contrast | `prefers-color-scheme` / `prefers-contrast` | `dark:…` / `contrast-more:…` | same |
| margin-inline-start | `margin-inline-start` | `ms-4` | `ms-4` |
| margin-inline-end | `margin-inline-end` | `me-4` | `me-4` |
| padding-inline-start/end | `padding-inline-start/end` | `ps-4` / `pe-4` | same |
| border-inline-start | `border-inline-start` | `border-s` (+ `border-s-4`) | same |
| text-align start/end | `text-align: start` | `text-start` / `text-end` | same |
| inset-inline-start/end | `inset-inline-start` | `start-0` / `end-0` | same |

## Notes & gotchas
- **v3 container queries are NOT built in.** If the repo is on v3 and `@tailwindcss/container-queries` is absent, `@container`/`@md:` utilities won't work. Options: (a) add the plugin, (b) drop to a raw-CSS `@container` block / arbitrary `[@container]` variant, (c) for layout-only switches, prefer an intrinsic grid that needs no query at all. `fluid-setup` reports which.
- **`motion-safe:`/`motion-reduce:`** are the idiomatic Tailwind reduced-motion gates (both versions) — prefer them over an arbitrary `[@media(prefers-reduced-motion…)]` variant.
- **True hover gating** (`(hover:hover)`) needs the arbitrary media variant in both versions — Tailwind's `hover:` alone is not capability-gated.
- **Arbitrary values can't contain spaces** — write `clamp(1.25rem,0.5rem+4cqi,2.5rem)` (no spaces) inside `[...]`, or use a CSS var.
- **Mobile full-height:** Tailwind's `h-screen`/`min-h-screen` = `100vh` = the *largest* mobile viewport → content hides under the address bar. Prefer `min-h-dvh`/`min-h-svh`/`h-dvh` (v3.4+; native `*vh` units are Baseline 2023).
- Always re-confirm exact names via context7 for the detected version; Tailwind utility names do shift between majors.
