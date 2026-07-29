---
name: fluid-tailwind
description: Map a modern-CSS responsive/RTL concept to the correct Tailwind utility for the project's installed Tailwind version (v3 vs v4 differ, especially on container queries). Use when the user types /fluid-tailwind, asks "what's the Tailwind class for clamp / container query / logical margin", "how do I write this in Tailwind here", or another fluid skill needs the version-correct utility.
model: sonnet
user-invocable: true
disable-model-invocation: true
argument-hint: "<concept | 'all'> [tailwind version]"
---

# fluid-tailwind — concept → Tailwind (version-aware)

## Overview
Given a concept (intrinsic grid, fluid clamp, container query, logical property, capability media…), return the **exact Tailwind utility for the version this repo uses**. Utility names shift between majors — this skill is version-aware and verifies against ground truth.

## When to use
- You know the CSS rule but need the Tailwind class here.
- `fluid-build` / `fluid-review` need the version-correct utility.

## Process
1. **Determine the version.** Use the arg if given; else detect from `package.json` (`tailwindcss`). State which.
2. **Look up the mapping** in `../fluid-shared/references/concept-to-tailwind.md` for that version.
3. **Verify with context7** (`/tailwindlabs/tailwindcss.com`) for the detected version before emitting — confirm the utility exists and is spelled correctly (names do change between v3 and v4). Never emit a guessed class.
4. **Return** the utility, an example, and any version caveat. Most important caveats:
   - **Container queries:** native in v4 (`@container`, `@sm:`, `@max-*`, `cqi`); **v3 needs `@tailwindcss/container-queries`** — if absent, give the raw-CSS `@container` fallback or suggest an intrinsic grid.
   - **Logical utilities** (`ms-/me- ps-/pe- start-/end- text-start/end border-s/border-e`): v3.3+ and v4.
   - **Fluid values:** arbitrary `text-[clamp(...)]` / `p-[clamp(...)]` (no spaces inside `[...]`), both versions.

## Red flags / rationalizations
- Emitting a class without naming the version it's for.
- Assuming v4 container-query syntax works on a v3 repo.
- Spaces inside arbitrary values (`text-[clamp(1rem, 4cqi, 2rem)]` breaks — remove the spaces).

## Verification
Every mapping returned names the version it applies to and was confirmed against context7. For "all", output the full table for the detected version.
