# RTL checklist

The acceptance test and the physical→logical map. A component is RTL-safe when you can set `dir="rtl"` on an ancestor and change **nothing else** and it mirrors correctly.

## The one test
1. Render the component in LTR.
2. Set `dir="rtl"` on a wrapping element (or `<html>`).
3. Change no CSS. If the accent, alignment, icons, and spacing all mirror correctly → pass. If anything stays glued to a physical side → fail.

## Physical → logical map (raw CSS)
| Physical (avoid) | Logical (use) |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `left:` / `right:` | `inset-inline-start:` / `inset-inline-end:` |
| `top:` / `bottom:` | `inset-block-start:` / `inset-block-end:` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `float: left` / `right` | `float: inline-start` / `inline-end` |
| `border-top-left-radius` etc. | `border-start-start-radius` etc. |

## Physical → logical map (Tailwind)
| Physical (avoid) | Logical (use) |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `border-l*` / `border-r*` | `border-s*` / `border-e*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `rounded-l*` / `rounded-r*` | `rounded-s*` / `rounded-e*` |
| `space-x-*` | prefer `gap-*` (flex/grid) — direction-agnostic |

## Safe-area insets — the one case with no logical equivalent
`env(safe-area-inset-left)` / `-right` are **physical**, deliberately: they describe the hardware, not the text direction. There is no `-start`/`-end` form. So build the logical pair yourself, once:

```css
:root      { --safe-s: env(safe-area-inset-left,  0px); --safe-e: env(safe-area-inset-right, 0px); }
[dir="rtl"]{ --safe-s: env(safe-area-inset-right, 0px); --safe-e: env(safe-area-inset-left,  0px); }
```

Then components use `ps-[var(--safe-s)]` / `pe-[var(--safe-e)]` and mirror for free — the swap lives in one place instead of an `rtl:` override on every surface. `top`/`bottom` need no such treatment. (Rule 9 in `rules.md`.)

## Things that are already direction-safe (no change needed)
- `gap`, `gap-x`/`gap-y`, `flex`/`grid` flow, `justify-*`/`items-*` (logical), `mx-*`/`px-*` (symmetric).

## Beyond layout (note, usually out of scope here)
- Directional **icons** (arrows, chevrons, back/next) should flip — mirror via a transform under `[dir=rtl]` or swap the glyph.
- Numerals, dates, and bidi text shaping are content/i18n concerns, not layout — handled elsewhere.
