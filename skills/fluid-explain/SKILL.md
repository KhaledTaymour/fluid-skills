---
name: fluid-explain
description: Teach a modern responsive/RTL CSS rule in plain English with its Tailwind equivalent for this repo's version, a short example, and one gotcha. Use when the user types /fluid-explain or asks "how do I make X responsive/RTL here", "why use clamp / container queries / logical properties", "explain auto-fit vs auto-fill", or wants the concept (not a full build/review).
model: sonnet
user-invocable: true
disable-model-invocation: true
argument-hint: "<topic or question>"
---

# fluid-explain — teach a rule, plainly

## Overview
Answer "how/why do I do X responsively or RTL-safely here?" — the concept in plain English, then the Tailwind for this repo's version, a tiny example, and the one gotcha. Source of truth: `../fluid-shared/references/rules.md`.

## When to use
- The user wants to understand a rule, not have code built or reviewed.
- Onboarding a teammate to the fluid patterns.

## Process
1. **Map the question to a rule** in `rules.md` (intrinsic grid, clamp, container queries, capability media, logical/RTL, "describe the rule not the widths").
2. **Explain plainly** — simple English, define any jargon the first time it appears, prefer a one-line analogy over theory. No undefined acronyms.
3. **Give the Tailwind equivalent** for the detected version (via `/fluid-tailwind` / `../fluid-shared/references/concept-to-tailwind.md`), confirmed against context7. Note v3-vs-v4 differences when relevant (esp. container queries).
4. **Show a tiny example** (raw CSS + the Tailwind class) and name **one gotcha** (e.g. raw `vw` font-size breaks zoom; v3 container queries need the plugin; arbitrary values can't contain spaces).
5. Point to the deeper rule entry if they want more.

## Red flags / rationalizations
- Walls of theory — keep it to the rule, the class, an example, a gotcha.
- Jargon without a definition.
- A Tailwind class not confirmed for the repo's version.

## Verification
The answer names the rule, gives the version-correct Tailwind utility, includes a short example, and calls out one gotcha — and the user could apply it immediately.
