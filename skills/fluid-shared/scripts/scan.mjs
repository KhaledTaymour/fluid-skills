#!/usr/bin/env node
// fluid — warn-only responsive/RTL anti-pattern scanner.
// Two modes:
//   1. Claude Code PostToolUse hook: receives hook JSON on stdin, reads tool_input.file_path.
//   2. CLI: `node scan.mjs <file> [file...]` (used by /fluid-review fast pass and tests).
// Always exits 0 (never blocks). Prints findings to stderr so Claude/the user sees them.
// See ../references/anti-patterns.md for the rule list and fixes.

import { readFileSync } from "node:fs";

const EXT = /\.(tsx|jsx|css|scss)$/;

// Each check: { id, label, test(line), fix, files? }  files: optional ext filter ('css' | 'tsx')
const CHECKS = [
  // --- RTL footguns: physical-direction Tailwind utilities ---
  { id: "rtl-util-margin", label: "physical margin/padding utility",
    test: l => /(?:^|["'`\s])(ml|mr|pl|pr)-(?:\d|\[|px)/.test(l),
    fix: "use logical: ms-/me- (margin), ps-/pe- (padding)" },
  { id: "rtl-util-inset", label: "physical inset utility (left-/right-)",
    test: l => /(?:^|["'`\s])(left|right)-(?:\d|\[|full|auto|px)/.test(l),
    fix: "use logical: start-/end-" },
  { id: "rtl-util-text", label: "physical text-align utility",
    test: l => /(?:^|["'`\s])text-(left|right)\b/.test(l),
    fix: "use text-start / text-end" },
  { id: "rtl-util-border", label: "physical border-side utility",
    test: l => /(?:^|["'`\s])border-(l|r)(?:-|\b)/.test(l),
    fix: "use border-s / border-e" },
  { id: "rtl-util-rounded", label: "physical corner-radius utility",
    test: l => /(?:^|["'`\s])rounded-(l|r|tl|tr|bl|br)(?:-|\b)/.test(l),
    fix: "use rounded-s / rounded-e (or logical corner radii)" },
  // --- RTL footguns: raw CSS / inline-style physical properties ---
  { id: "rtl-css-prop", label: "physical CSS property",
    test: l => /\b(margin-left|margin-right|padding-left|padding-right|border-left|border-right)\b/.test(l)
            || /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight)\b/.test(l),
    fix: "use *-inline-start / *-inline-end (marginInlineStart, etc.)" },
  { id: "rtl-css-textalign", label: "physical text-align",
    test: l => /text-align\s*:\s*(left|right)\b/.test(l) || /textAlign\s*:\s*['"](left|right)['"]/.test(l),
    fix: "text-align: start / end" },
  { id: "rtl-css-inset", label: "physical inset property",
    test: l => /(?:^|[;{\s])(left|right)\s*:/.test(l) && /\.(css|scss)$/.test(CURRENT),
    fix: "use inset-inline-start / inset-inline-end" },
  // --- width media queries for layout ---
  { id: "width-media", label: "width media query",
    test: l => /@media[^{};]*\b(?:min|max)-width/.test(l),
    fix: "intrinsic grid / clamp() / @container instead of width @media" },
  // --- fixed px font-size ---
  { id: "fixed-px-font", label: "fixed px font-size",
    test: l => /font-size\s*:\s*\d+px/i.test(l) || /fontSize\s*:\s*['"]?\d+px/.test(l) || /(?:^|["'`\s])text-\[\d+px\]/.test(l),
    fix: "clamp(rem, …cqi/vw, rem) → text-[clamp(1.25rem,0.5rem+4cqi,2.5rem)]" },
  // --- full-viewport-height (mobile footgun; soft) ---
  { id: "mobile-100vh", label: "full-height 100vh / h-screen (mobile address-bar footgun)",
    test: l => /\b(?:min-height|height)\s*:\s*100vh\b/.test(l)
            || /\b(?:minHeight|height)\s*:\s*['"]?100vh\b/.test(l)
            || /(?:^|["'`\s])(?:min-h-screen|h-screen)\b/.test(l)
            || /(?:^|["'`\s])(?:min-h|h)-\[100vh\]/.test(l),
    fix: "use 100svh/100dvh → min-h-dvh / min-h-svh / h-dvh (mobile-safe)" },
];

let CURRENT = "";

function scan(path) {
  if (!EXT.test(path)) return [];
  let src;
  try { src = readFileSync(path, "utf8"); } catch { return []; }
  CURRENT = path;
  const out = [];
  src.split("\n").forEach((line, i) => {
    // cheap comment skip (line-level)
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    for (const c of CHECKS) {
      if (c.test(line)) out.push({ path, line: i + 1, id: c.id, label: c.label, fix: c.fix });
    }
  });
  return out;
}

async function filesFromStdin() {
  if (process.stdin.isTTY) return [];
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  data = data.trim();
  if (!data) return [];
  try {
    const j = JSON.parse(data);
    const fp = j?.tool_input?.file_path;
    return fp ? [fp] : [];
  } catch {
    return [];
  }
}

const argFiles = process.argv.slice(2);
const files = argFiles.length ? argFiles : await filesFromStdin();

let findings = [];
for (const f of files) findings = findings.concat(scan(f));

if (findings.length) {
  process.stderr.write(`\n🌊 fluid: ${findings.length} responsive/RTL issue(s) — see /fluid-review for fixes\n`);
  for (const f of findings) {
    process.stderr.write(`  ${f.path}:${f.line}  [${f.id}] ${f.label}\n      → ${f.fix}\n`);
  }
}
process.exit(0); // warn-only, never block
