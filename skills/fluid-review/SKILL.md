---
name: fluid-review
description: Audit a UI file or diff for responsive/RTL anti-patterns (width media queries, physical left/right, fixed px sizing, breakpoint-stepped grids, ungated hover/animation) and propose or apply version-correct Tailwind fixes. Use when the user types /fluid-review, asks to review a component or diff for responsive or RTL problems, asks what will break in Arabic or on mobile, or wants the fluid quality gate before committing UI changes. Do not use for general code review, logic bugs, or files with no markup or styles.
model: opus
user-invocable: true
argument-hint: "<file path | 'diff'> [--fix]"
---

# fluid-review — responsive/RTL audit + fix

## Overview
The quality gate. Catches breakpoint-soup and RTL footguns and turns each into a version-correct fix. Rule list with fixes: `../fluid-shared/references/anti-patterns.md`.

## When to use
- Before committing a component.
- Reviewing a PR/diff for mobile + RTL correctness.
- After `/fluid-build`, as the verification pass.

## Process
1. **Gather the target.** A file path → that file. `diff` or no arg → `git diff` (fall back to `git diff --staged`). Multiple changed files → review each.
2. **Fast pass (deterministic):** run `node ../fluid-shared/scripts/scan.mjs <files>` — path is relative to *this skill's own directory*, so resolve it to an absolute path before running (works whether the suite is vendored in `.claude/skills/` or installed as a plugin). This surfaces the high-signal anti-patterns (physical utilities/props, width `@media`, fixed-px font). These are starting points, not the whole review.
3. **Nuanced pass (judgment):** read the code against `anti-patterns.md` for what the scanner can't safely flag — breakpoint-stepped grids (`sm:grid-cols-1 md:… lg:…` that should be `auto-fit`), `:hover` not gated by `(hover:hover)`, animation without a motion-preference gate, `[dir="rtl"]` override rules.
4. **For each finding:** report `file:line` → why it's wrong → the **version-correct fix** (detect Tailwind version; confirm utility via `/fluid-tailwind` / context7).
5. **Fix mode:** if `--fix` (or the user asks), apply the fixes to the working tree; otherwise propose them.
   When started by the model rather than a user `/command`, report findings only; apply `--fix` only if the user or the ticket asked for edits.
6. **Re-scan** to confirm the fast-pass findings clear.

## Red flags / rationalizations
- "The scanner found nothing, so it's clean" → the scanner is the floor; do the nuanced pass.
- "`sm:`/`md:` prefixes are everywhere, leave them" → flag the *layout* breakpoints that should be intrinsic; don't blanket-rewrite every responsive prefix.
- Proposing a fix without confirming the utility exists in the repo's Tailwind version.
- Don't "fix" by adding `[dir=rtl]` overrides — convert to logical properties instead.

## Verification
Every reported issue has a concrete, version-correct fix. After fixes (or applying `--fix`), the `scan.mjs` fast pass returns clean and the nuanced issues are resolved or explicitly accepted. State counts: found / fixed / remaining.
