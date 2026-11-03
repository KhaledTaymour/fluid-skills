---
name: fluid-rtl
description: RTL-only conformance check: find physical-direction CSS/Tailwind (left/right, ml-/mr-, text-left, border-l, etc.), convert it to logical equivalents, and apply the "flip dir, change nothing" test. Use when the user types /fluid-rtl, asks to make UI code RTL-safe or Arabic-ready, or asks whether a component mirrors in RTL. Do not use for translation or copy work, or for the full responsive review (that is fluid-review).
model: sonnet
user-invocable: true
argument-hint: "<file or directory path> [--fix]"
---

# fluid-rtl — RTL conformance (physical → logical)

## Overview
A focused pass: make a component correct in Arabic (right-to-left) by replacing physical-direction declarations with logical ones, so one stylesheet serves both directions. Map + test: `../fluid-shared/references/rtl-checklist.md`.

## When to use
- A component must support Arabic/RTL.
- You want only the direction audit, not the full `/fluid-review`.

## Process
1. **Gather the target** (file or directory).
2. **Find physical-direction usage** — run `node ../fluid-shared/scripts/scan.mjs <files>` (the `rtl-*` findings) — path is relative to *this skill's own directory*; resolve it to an absolute path first and read for anything it misses. Look for: `ml-/mr- pl-/pr- left-/right- text-left/right border-l/r rounded-l/r`; raw `margin-left/right`, `padding-left/right`, `border-left/right`, `left:`/`right:`, `text-align: left/right`; camelCase inline styles (`marginLeft`…); and any `[dir="rtl"]` override rules.
3. **Convert to logical** using the map in `rtl-checklist.md` (`ms-/me- ps-/pe- start-/end- text-start/end border-s/border-e`; `margin-inline-start`, `inset-inline-start`, `text-align: start`…). Prefer `gap` over `space-x-*`.
4. **Apply the test:** confirm that setting `dir="rtl"` on an ancestor mirrors the layout with **no other change**. Delete any `[dir=rtl]` overrides made redundant.
5. **Fix mode:** apply with `--fix` (or on request); else propose.

## Red flags / rationalizations
- "Add `[dir=rtl]:` overrides" → no; that's the brittle old way. Use logical properties.
- "`mx-`/`px-` are physical" → no; symmetric utilities are direction-safe. Only the single-side ones (`ml-`, `pr-`, …) are footguns.
- Flagging block-axis (`top-`/`bottom-`, `mt-`/`mb-`) as RTL issues — those don't mirror horizontally; leave them.
- Treating bidi text/numeral shaping as layout — that's i18n, out of scope here.

## Verification
Zero physical-direction declarations remain (scanner `rtl-*` clean), and the component mirrors correctly under `dir="rtl"` with no extra rules. Report: found / converted / remaining.
