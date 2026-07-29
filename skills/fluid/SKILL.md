---
name: fluid
description: Index and router for the "fluid" modern-responsive + RTL skill suite. Use when the user types /fluid, asks "which fluid skill do I want", "what can fluid do", or wants an overview of the responsive/RTL tooling for this repo. Points to fluid-setup, fluid-build, fluid-tailwind, fluid-review, fluid-rtl, and fluid-explain.
model: haiku
user-invocable: true
disable-model-invocation: true
---

# fluid — suite index

The **fluid** suite makes UI here mobile-first and Arabic-RTL-correct by default, using modern breakpoint-free CSS expressed as Tailwind. Self-contained and portable; rules live in `../fluid-shared/references/`.

## Overview

The thesis: **describe the rule, don't enumerate the widths** — and be RTL-safe by default. Full rules: `../fluid-shared/references/rules.md`. Why the suite is shaped this way: `../fluid-shared/DECISIONS.md`.

## Which skill do I want?

| If you want to… | Use | Phase |
|---|---|---|
| Check this repo is ready (Tailwind version, container queries, logical utils) | **`/fluid-setup`** | gate |
| Turn a Figma frame / file / description into a component | **`/fluid-build`** | build |
| Get the Tailwind utility for a concept (this repo's version) | **`/fluid-tailwind`** | build helper |
| Audit + fix a file or diff against all the rules | **`/fluid-review`** | review |
| Check/fix RTL conformance only (physical → logical) | **`/fluid-rtl`** | review |
| Learn a rule, plainly, with its Tailwind mapping | **`/fluid-explain`** | learn |

## Real-world examples (how to trigger)

Type the `/command`, or just describe the task — these are the kinds of phrasings each skill answers.

**`/fluid-setup`** — toolchain readiness
- "Is this repo ready for container queries / logical utilities?"
- "Set up fluid here" / "why don't `@container` classes work?"
- *Scenario:* a new dev runs it once before touching UI and gets "Tailwind v3.4 detected ✅ logical utils — ⚠️ no container-query plugin → add `@tailwindcss/container-queries` or use an intrinsic grid."

**`/fluid-build`** — design → component
- "`/fluid-build https://figma.com/file/…?node-id=…` — build the mobile insights panel."
- "Implement this card mobile-first and RTL-ready" (paste a screenshot or describe it).
- "Turn `docs/design/mobile-insights.png` into a component."
- *Scenario:* converting a mobile design frame into a component styled with the repo's primitives, reflowing with no breakpoints and mirroring in Arabic.

**`/fluid-tailwind`** — concept → Tailwind (this repo's version)
- "What's the Tailwind class for a fluid font between 1.25rem and 2.5rem here?"
- "How do I write a container query in our Tailwind version?"
- "Give me the logical-margin utility instead of `ml-4`."

**`/fluid-review`** — audit + fix (the quality gate)
- "`/fluid-review src/components/ui/conversation-insights-panel.tsx`"
- "Review the diff before I open a PR" / "`/fluid-review diff --fix`"
- "What will break on mobile or in Arabic in this component?"
- *Scenario:* pre-PR pass that flags `md:grid-cols-3` stacks, `pl-4`, a width `@media`, and proposes the version-correct fixes.

**`/fluid-rtl`** — RTL-only conformance
- "Make `Sidebar.tsx` RTL-safe" / "will this mirror correctly in Arabic?"
- "`/fluid-rtl src/components/chat --fix`"
- *Scenario:* an Arabic-launch sweep converting `ml-/text-left/border-l` to `ms-/text-start/border-s` across a folder.

**`/fluid-explain`** — learn a rule
- "Why `clamp()` instead of media queries?" / "explain auto-fit vs auto-fill."
- "How should I make a card grid responsive here, and what's the Tailwind?"
- "What are logical properties and why do they matter for RTL?"

## Typical flow

1. `/fluid-setup` once (per repo) → confirm the toolchain.
2. `/fluid-build <figma|file|description>` → component.
3. `/fluid-review <file>` and `/fluid-rtl <file>` → verify before commit.
4. `/fluid-explain <topic>` any time you're unsure why.

A **PostToolUse hook** also runs `../fluid-shared/scripts/scan.mjs` after edits to `.tsx/.css` files and warns (never blocks) on responsive/RTL anti-patterns.

## Process
1. Read the user's intent; map it to the table above.
2. Name the single best skill and what it will do, in one line.
3. If they want the rationale, point them to `../fluid-shared/DECISIONS.md`.

## Verification
You've succeeded when the user knows exactly which `/fluid-*` to run next (one named skill), or has the overview they asked for.

## Overriding models
Each skill pins a model (`model:` frontmatter, turn-scoped). There is no per-invocation override in Claude Code. To change one, set that skill's `model:` to `inherit` and pick via `/model`, or edit the line. See `../fluid-shared/DECISIONS.md` → "Overriding a skill's model".
