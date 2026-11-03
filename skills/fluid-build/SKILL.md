---
name: fluid-build
description: Build a UI component from a design (a Figma URL, a mockup image or file, or a written spec) as mobile-first, RTL-safe, version-correct Tailwind using breakpoint-free CSS. Use when the user types /fluid-build, shares a Figma link or mockup and asks for it to be built or implemented, or asks to build a component mobile-first or RTL-ready. Do not use for small style tweaks to existing code, non-UI work, or questions about a design that do not ask for code.
model: opus
user-invocable: true
argument-hint: "<figma-url | file/image path | text description>"
---

# fluid-build — design → responsive, RTL-safe component

## Overview
Produce a component that is mobile-first, breakpoint-free (intrinsic + fluid + container queries), and RTL-correct by default — expressed in the Tailwind version this repo actually uses. Rules: `../fluid-shared/references/rules.md`.

## When to use
- A Figma frame / screenshot / description needs to become a real component.
- An existing component must be rebuilt to be responsive + RTL.

## Process
1. **Identify the input.**
   - Figma URL → use the figma MCP (`get_design_context`, `get_screenshot`, `get_variable_defs`) to read layout, spacing, type, and tokens.
   - Image/file path → read it. Text description → use as the spec.
2. **Detect the Tailwind version** (`package.json`) and the component conventions in the target file/area (the repo's own UI primitives / design-system package, class style). Reuse existing primitives over hand-rolling.
3. **Plan the structure mobile-first** against `rules.md`:
   - Layout → intrinsic (grid `auto-fit`/`minmax`, flex-wrap). No width `@media`.
   - Scalar values (type, padding, gap, radius) → `clamp(rem, …cqi/vw, rem)`.
   - Component-local layout shifts → container query (`@container`); mark the parent a container.
   - Direction/spacing → logical utilities + `gap` only (no physical sides).
   - Interaction/preference → capability media (`hover`, `pointer`, motion).
4. **Translate to Tailwind for the detected version** via `/fluid-tailwind` (or `../fluid-shared/references/concept-to-tailwind.md`), confirming exact utility names with context7. If a container query is needed on v3 and the plugin is absent, prefer an intrinsic grid or a small raw `@container` block, and say so.
5. **Emit the component.** Match the repo's file conventions (TS/TSX, dark-mode, its design-system package).
6. **Self-verify** against `../fluid-shared/references/rtl-checklist.md` (mentally flip `dir="rtl"`), then run **`/fluid-rtl`** and **`/fluid-review`** on the output and fix anything they flag.

## Red flags / rationalizations
- "I'll add an `@media (max-width)` for mobile" → no; use intrinsic/clamp/container.
- "`ml-`/`text-left` is fine" → no; logical utilities (`ms-`/`text-start`).
- "I'll guess the Tailwind utility" → confirm via context7 for the detected version.
- "Container queries everywhere" → only for genuine component-local shifts; an intrinsic grid often needs none.
- Design sources named here are *examples*; never hard-depend on repo-internal docs.

## Verification
The component must: render sensibly at narrow and wide widths with no width `@media`; contain no physical-direction utilities/properties; mirror correctly when an ancestor is `dir="rtl"`; and pass `/fluid-review` clean. State which checks you ran and their result.
