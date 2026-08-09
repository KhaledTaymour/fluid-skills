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
             || /(?:^|["\'`\s])p[tb]-safe-[tb]\b/.test(l)
             || /padding-(?:top|bottom)\s*:\s*env\(\s*safe-area-inset-/.test(l)),
    fix: "ADD it to the height: h-[calc(3.5rem+env(safe-area-inset-top))] — border-box subtracts padding from height" },
  // A bare env() is 0 on desktop and every non-notched device, so it deletes the design
  // spacing that was there before. Judged per occurrence and per edge, so neither a
  // floored inset nor a height folding in a *different* edge can silence a bare one.
  { id: "safe-area-no-floor", label: "bare env(safe-area-inset-*) with no max() floor",
    test: l => [...unflooredInsetEdges(l)].some(edge => !heightFoldsIn(l, edge)),
    fix: "max(env(safe-area-inset-bottom), 1rem) — a bare env() is 0 off-device and removes your spacing" },
];


// The pair `h-[calc(3.5rem+env(top))]` + a bare `pt-[env(top)]` is rule 9's recommended
// form — the height absorbs the inset, so a max() on that padding would wrongly push
// content down off-device. Only exempts the edge the height actually folds in.
const EDGE_TOKEN = { top: "t", bottom: "b" };
function heightFoldsIn(line, edge) {
  const short = EDGE_TOKEN[edge];
  if (!short) return false; // no height folds in a left/right inset
  return new RegExp(`(?<![\\w-])h-\\[[^\\]]*(?:--safe-${short}\\b|env\\(\\s*safe-area-inset-${edge})`).test(line);
}

// Edges whose env(safe-area-inset-*) is unprotected on this line. Protected means:
// wrapped in max()/clamp(); folded into a calc() that has another term (so it floors
// implicitly — `calc(3.5rem + env(x))` is 3.5rem when the inset is 0, but `calc(env(x))`
// is still 0); or defining a custom property. Walks back through balanced parens so each
// occurrence is judged on its own context rather than the whole line.
function unflooredInsetEdges(line) {
  const edges = new Set();
  const re = /env\(\s*safe-area-inset-(top|bottom|left|right)/g;
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
        if (fn === "max" || fn === "clamp") guarded = true;
        else if (fn === "calc") guarded = calcHasOtherTerm(line, i);
        break;
      }
    }
    if (!guarded) edges.add(m[1]);
  }
  return edges;
}

// A calc() only floors the inset if something else in it is a length. Strip the env()
// calls out of the body and look for what is left.
function calcHasOtherTerm(line, openParenIndex) {
  let depth = 0, close = line.length;
  for (let i = openParenIndex; i < line.length; i++) {
    if (line[i] === "(") depth++;
    else if (line[i] === ")" && --depth === 0) { close = i; break; }
  }
  const body = line.slice(openParenIndex + 1, close).replace(/env\([^()]*\)/g, "");
  return /\d*\.?\d+(?:rem|px|em|ch|vh|vw|%)|var\(/.test(body);
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

// `node scan.mjs --self-test` — fixtures for the safe-area checks, which are the only
// ones with hand-rolled logic rather than a single regex. Kept beside the code because
// this file sits outside every test runner; two review rounds turned on its behaviour.
const SELF_TEST = [
  // [class string, should it flag?]
  ["h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]", false], // rule 9's own form
  ["h-[calc(3.5rem+var(--safe-t))] pt-safe-t", false],                                // tokenised equivalent
  ["h-[90svh] pb-[max(var(--safe-b),1.25rem)]", false],                               // outer size + floor
  ["min-h-14 pt-safe-t", false],                                                      // min-height grows
  ["pb-[max(env(safe-area-inset-bottom),1rem)]", false],                              // explicit floor
  ["h-[calc(3.5rem-1px)] pt-safe-t", true],                                           // fixed height in a calc
  ["h-14 pt-safe-t", true],                                                           // the classic
  ["pb-[max(var(--safe-b),2rem)] pt-[env(safe-area-inset-top)]", true],               // bare one after a floored one
  ["h-[calc(3.5rem+env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]", true], // height folds a DIFFERENT edge
  ["pb-[calc(env(safe-area-inset-bottom))]", true],                                   // calc with no other term
  [":root{--safe-t:env(safe-area-inset-top,0px)}", false],                            // the token definition itself
];

if (process.argv.includes("--self-test")) {
  const safeChecks = CHECKS.filter(c => c.id.startsWith("safe-area-"));
  let failed = 0;
  for (const [line, expected] of SELF_TEST) {
    const got = safeChecks.some(c => c.test(line));
    if (got !== expected) {
      failed++;
      process.stderr.write(`  FAIL expected ${expected ? "flag" : "silent"}: ${line}\n`);
    }
  }
  process.stdout.write(failed
    ? `\n❌ scan.mjs self-test: ${failed}/${SELF_TEST.length} failed\n`
    : `\n✅ scan.mjs self-test: ${SELF_TEST.length}/${SELF_TEST.length} passed\n`);
  process.exit(failed ? 1 : 0);
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
