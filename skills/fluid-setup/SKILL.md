---
name: fluid-setup
description: Readiness gate — check that a Tailwind repo can support the fluid responsive+RTL patterns (logical-property utilities, container queries, fluid clamp via arbitrary values) and report what's ready vs missing with the minimal fix. Use when the user types /fluid-setup, asks "is this repo ready for container queries / logical utilities", "set up fluid", or before the first /fluid-build in a repo.
model: sonnet
user-invocable: true
disable-model-invocation: true
---

# fluid-setup — toolchain readiness gate

## Overview
Before building breakpoint-free, RTL-safe components, confirm the repo's Tailwind toolchain can express them. This skill **reports** readiness and the minimal fix; it does not install anything without asking. Generic/portable — no project-specific assumptions.

## When to use
- First time using `fluid` in a repo.
- After a Tailwind upgrade.
- When `@container` / `@md:` utilities silently don't work.

## Process
1. **Detect the Tailwind version.** Read `package.json` → `dependencies`/`devDependencies` → `tailwindcss`. Note major (v3 vs v4). Read `tailwind.config.*` and `postcss.config.*` for plugins/presets.
2. **Confirm utility availability** — cross-check `../fluid-shared/references/concept-to-tailwind.md`, then **verify against context7** (`/tailwindlabs/tailwindcss.com`) for the detected version:
   - Logical utilities (`ms-/me- ps-/pe- start-/end- text-start/end border-s/border-e`): native in v3.3+ and v4 → expect ✅.
   - Container queries (`@container`, `@md:`): **native in v4**; **v3 requires the `@tailwindcss/container-queries` plugin** — check `package.json` + the `plugins` array in `tailwind.config`.
   - Arbitrary values (`text-[clamp(...)]`): both versions → ✅.
3. **Check for a shared preset** (e.g. a design-system config) that may already add plugins; note it rather than duplicating.
4. **Report a readiness checklist** — ✅ ready / ⚠️ missing, each with the one-line fix (e.g. "v3 detected, no container-query plugin → `pnpm add -D @tailwindcss/container-queries` and add it to `plugins`, OR use raw `@container` blocks / an intrinsic grid that needs no query").
5. **Offer the fix; don't apply silently.** If the user says go, make the minimal change.

## Red flags / rationalizations
- "Container queries don't work" on v3 without the plugin → that's the gate, not a bug.
- Don't add the plugin "just in case" — only if a component actually needs a container query (an intrinsic grid often removes the need).
- Don't assume v4 conventions on a v3 repo (and vice-versa) — detect first.

## Verification
Output is a checklist naming the detected Tailwind version and, per capability, ✅/⚠️ with a concrete next step. The user can act on it without further questions.
