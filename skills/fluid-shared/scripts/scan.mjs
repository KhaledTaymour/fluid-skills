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
  // --- safe areas (notched phones under viewport-fit=cover) ---
  // A fixed height PLUS a vertical safe-area padding: border-box subtracts the padding
  // from the height, so the bar's interior collapses and centred controls spill back
  // into the notch. Exempt: min-h-/max-h- (they grow past their padding), vh/% heights
  // (an outer size), and any height that already folds the inset in — which is the fix.
  // NB a bare `calc` is NOT an exemption: h-[calc(3.5rem-1px)] is still a fixed height.
  { id: "safe-area-into-fixed-height", label: "safe-area inset padded into a fixed height",
    test: l => /(?<![\w-])h-(?:\d+(?:\.\d+)?|\[(?![^\]]*(?:--safe-|env\(safe-area-inset-|vh|%))[^\]]*\])/.test(l)
            && (/p[tb]-\[[^\]]*(?:safe-area-inset|--safe-)/.test(l)
             || /(?:^|["'`\s])p[tb]-safe-[tb]\b/.test(l)
             || /padding-(?:top|bottom)\s*:\s*env\(\s*safe-area-inset-/.test(l)),
    fix: "ADD it to the height: h-[calc(3.5rem+env(safe-area-inset-top))] — border-box subtracts padding from height" },
  // A bare env() is 0 on desktop and every non-notched device, so it deletes the design
  // spacing that was there before. Checked per occurrence, not per line: one correctly
  // floored inset must not silence a bare one later in the same className.
  // Not flagged when the same element's height already folds the inset in: that pair —
  // h-[calc(3.5rem+env(...))] with a bare pt-[env(...)] — is rule 9's recommended form,
  // and a max() on that padding would wrongly push content down on a non-notched screen.
  { id: "safe-area-no-floor", label: "bare env(safe-area-inset-*) with no max() floor",
    test: l => hasUnflooredInset(l) && !INSET_BEARING_HEIGHT.test(l),
    fix: "max(env(safe-area-inset-bottom), 1rem) — a bare env() is 0 off-device and removes your spacing" },
];

const INSET_BEARING_HEIGHT = /(?<![\w-])h-\[[^\]]*(?:--safe-|env\(safe-area-inset-)/;

// True when some env(safe-area-inset-*) on the line is unprotected. Protected means:
// wrapped in max()/clamp() (an explicit floor), folded into a calc() with another term
// (which floors implicitly — `calc(3.5rem + env(...))` is 3.5rem when the inset is 0),
// or defining a custom property. Walks back through balanced parens to find the
// enclosing function, so it judges each occurrence on its own context.
function hasUnflooredInset(line) {
  const re = /env\(\s*safe-area-inset-/g;
  let m;
  while ((m = re.exec(line))) {
    const before = line.slice(0, m.index);
    if (/--[\w-]+\s*:\s*$/.test(before)) continue;
    let depth = 0, guarded = false;
    for (let i = before.length - 1; i >= 0; i--) {
      const ch = before[i];
      if (ch === ")") depth++;
      else if (ch === "(") {
        if (depth > 0) { depth--; continue; }
        const fn = (before.slice(0, i).match(/([\w-]+)$/) || ["", ""])[1];
        if (fn === "max" || fn === "calc" || fn === "clamp") guarded = true;
        break;
      }
    }
    if (!guarded) return true;
  }
  return false;
}

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
