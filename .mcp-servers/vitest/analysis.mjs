// Static analysis of Vitest test sources.
//
// Dependency-free, like the rest of this first-party server: a small JS/TS lexer
// (Node built-ins only) tokenizes each test file, a block extractor recovers the
// describe/it/hook structure by brace matching over the tokens, and a per-test
// feature pass distills the assertions, exercised APIs, and lint-worthy traits of
// each test body. Two heuristics consume those features:
//
//   findOverlaps  clusters tests with high assertion/title overlap so a redundant
//                 case can be dropped or sibling cases merged into one it.each.
//   auditTests    flags best-practice / leanness issues per test (the test-suite
//                 analogue of the code-quality server).
//
// Both are static: nothing here runs vitest. The tools surface findings; the
// agent performs the consolidation or the fix.

import { promises as fs } from "node:fs";
import * as path from "node:path";

// Lexer
// A forgiving JS/TS tokenizer. It need not be spec-complete — it must only keep
// strings, template literals, regexes, and comments from corrupting the brace
// and identifier scanning the extractor relies on. Whole template literals and
// regexes collapse to a single token, so any braces or quotes inside them are
// inert. Whitespace is dropped; every retained token carries its char offset.

const ID_START = /[A-Za-z_$]/;
const ID_PART = /[A-Za-z0-9_$]/;
// Keywords after which a `/` begins a regex rather than a division.
const REGEX_PREV_KEYWORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "do", "else", "case", "yield", "await",
]);

function readString(src, i, quote) {
  const n = src.length;
  i += 1;
  while (i < n) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === quote || c === "\n") return i + 1;
    i += 1;
  }
  return i;
}

// Reads a template literal, descending into `${ ... }` so nested braces, strings,
// and templates are consumed as part of the single token.
function readTemplate(src, i) {
  const n = src.length;
  i += 1;
  while (i < n) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "`") return i + 1;
    if (c === "$" && src[i + 1] === "{") {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        const d = src[i];
        if (d === "\\") {
          i += 2;
        } else if (d === "{") {
          depth += 1;
          i += 1;
        } else if (d === "}") {
          depth -= 1;
          i += 1;
        } else if (d === "'" || d === '"') {
          i = readString(src, i, d);
        } else if (d === "`") {
          i = readTemplate(src, i);
        } else if (d === "/" && src[i + 1] === "/") {
          while (i < n && src[i] !== "\n") i += 1;
        } else if (d === "/" && src[i + 1] === "*") {
          i += 2;
          while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      continue;
    }
    i += 1;
  }
  return i;
}

function readRegex(src, i) {
  const n = src.length;
  let j = i + 1;
  let inClass = false;
  while (j < n) {
    const c = src[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "\n") return -1; // unterminated → it was a division, not a regex
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) {
      j += 1;
      while (j < n && /[a-z]/i.test(src[j])) j += 1; // flags
      return j;
    }
    j += 1;
  }
  return -1;
}

function regexAllowed(prev) {
  if (!prev) return true;
  if (prev.t === "id") return REGEX_PREV_KEYWORDS.has(prev.v);
  if (prev.t === "num" || prev.t === "str" || prev.t === "tmpl" || prev.t === "regex") return false;
  if (prev.t === "punc") return !(prev.v === ")" || prev.v === "]");
  return true;
}

function lex(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;
  let prev = null;
  const push = (t, v, pos) => {
    const tok = { t, v, pos };
    tokens.push(tok);
    prev = tok;
  };
  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      i += 2;
      while (i < n && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const start = i;
      i = readString(src, i, c);
      push("str", src.slice(start + 1, i - 1), start);
      continue;
    }
    if (c === "`") {
      const start = i;
      i = readTemplate(src, i);
      push("tmpl", src.slice(start + 1, i - 1), start);
      continue;
    }
    if (c === "/" && regexAllowed(prev)) {
      const end = readRegex(src, i);
      if (end > 0) {
        push("regex", src.slice(i, end), i);
        i = end;
        continue;
      }
    }
    if (ID_START.test(c)) {
      const start = i;
      i += 1;
      while (i < n && ID_PART.test(src[i])) i += 1;
      push("id", src.slice(start, i), start);
      continue;
    }
    if (c >= "0" && c <= "9") {
      const start = i;
      i += 1;
      while (i < n && /[0-9a-fA-Fox._n]/.test(src[i])) i += 1;
      push("num", src.slice(start, i), start);
      continue;
    }
    push("punc", c, i);
    i += 1;
  }
  return tokens;
}

// Returns a pos → 1-based line lookup for a source string.
function lineLookup(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i += 1) if (src[i] === "\n") starts.push(i + 1);
  return (pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

// Block extraction

const TEST_IDS = new Set(["it", "test", "fit", "xit", "xtest"]);
const SUITE_IDS = new Set(["describe", "suite", "fdescribe", "xdescribe"]);
const HOOK_IDS = new Set(["beforeEach", "afterEach", "beforeAll", "afterAll"]);

// Returns the token index of the `)` closing the `(` at openIdx.
function matchParen(tokens, openIdx) {
  let depth = 0;
  for (let k = openIdx; k < tokens.length; k += 1) {
    const t = tokens[k];
    if (t.t !== "punc") continue;
    if (t.v === "(") depth += 1;
    else if (t.v === ")") {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return -1;
}

// Recovers describe/it/hook calls from the token stream. A call qualifies when a
// recognized identifier (not preceded by `.`, so `obj.it` is ignored) is followed
// by an optional `.modifier` chain (and an `.each(table)` group) and then `(`.
function extractBlocks(tokens) {
  const blocks = [];
  for (let k = 0; k < tokens.length; k += 1) {
    const tok = tokens[k];
    if (tok.t !== "id") continue;
    const isTest = TEST_IDS.has(tok.v);
    const isSuite = SUITE_IDS.has(tok.v);
    const isHook = HOOK_IDS.has(tok.v);
    if (!isTest && !isSuite && !isHook) continue;
    const prev = tokens[k - 1];
    if (prev && prev.t === "punc" && prev.v === ".") continue;

    let j = k + 1;
    const modifiers = [];
    while (tokens[j]?.t === "punc" && tokens[j].v === "." && tokens[j + 1]?.t === "id") {
      modifiers.push(tokens[j + 1].v);
      j += 2;
    }
    if (modifiers.includes("each") && tokens[j]?.t === "punc" && tokens[j].v === "(") {
      const close = matchParen(tokens, j);
      if (close === -1) continue;
      j = close + 1;
    }
    if (!(tokens[j]?.t === "punc" && tokens[j].v === "(")) continue;
    const openParen = j;
    const closeParen = matchParen(tokens, openParen);
    if (closeParen === -1) continue;

    const first = tokens[openParen + 1];
    const title = first && (first.t === "str" || first.t === "tmpl") ? first.v : null;
    // x-prefixed forms and the skip/todo modifiers are all "disabled".
    if (tok.v === "xit" || tok.v === "xtest" || tok.v === "xdescribe") modifiers.push("skip");
    if (tok.v === "fit" || tok.v === "fdescribe") modifiers.push("only");

    blocks.push({
      kind: isHook ? "hook" : isSuite ? "suite" : "test",
      method: tok.v,
      modifiers,
      title,
      idTok: k,
      titleTok: title !== null ? openParen + 1 : -1,
      openParen,
      closeParen,
      startPos: tok.pos,
      endPos: tokens[closeParen].pos,
    });
  }
  return blocks;
}

// Threads each block's enclosing describes by interval containment and builds the
// `a > b > c` full title.
function assignNesting(blocks) {
  const suites = blocks.filter((b) => b.kind === "suite");
  for (const b of blocks) {
    const parents = suites
      .filter((s) => s !== b && s.openParen < b.idTok && b.idTok < s.closeParen)
      .sort((a, c) => a.openParen - c.openParen);
    b.parentTitles = parents.map((p) => p.title).filter(Boolean);
    b.suiteKey = parents.map((p) => p.openParen).join("/");
    b.fullTitle = [...b.parentTitles, b.title].filter(Boolean).join(" > ") || "(untitled)";
  }
}

// Per-test features

// Identifiers that are calls but carry no signal for overlap/exercise tracking.
const NON_CALL_IDS = new Set([
  "it", "test", "describe", "suite", "expect", "beforeEach", "afterEach", "beforeAll", "afterAll",
  "if", "for", "while", "switch", "catch", "function", "return", "await", "new", "typeof", "void", "delete", "throw",
]);
const CONTROL_KEYWORDS = new Set(["if", "for", "while", "switch"]);
const WEAK_MATCHERS = new Set(["toBeTruthy", "toBeFalsy", "toBeDefined", "toBeUndefined", "toBeNull"]);
const ASSERT_MODIFIERS = new Set(["resolves", "rejects"]);

// First meaningful operand inside expect(...), plus the first literal it carries.
// The shape (`call:bySlot`) feeds coarse clustering; the literal (`stack`)
// sharpens the redundancy check so `expect(queryByText('A'))` and
// `expect(queryByText('B'))` are not treated as the same assertion.
function expectInfo(tokens, openParen, close) {
  let target = "expr";
  let lit = "";
  for (let k = openParen + 1; k < close; k += 1) {
    const t = tokens[k];
    if (target === "expr") {
      if (t.t === "id") {
        const nxt = tokens[k + 1];
        target = nxt?.t === "punc" && nxt.v === "(" ? `call:${t.v}` : `id:${t.v}`;
      } else if (t.t === "str" || t.t === "tmpl") target = "lit";
      else if (t.t === "num") target = "num";
    }
    if (!lit && (t.t === "str" || t.t === "tmpl")) lit = t.v;
  }
  return { target, lit };
}

// Walks the `.not.resolves.toBe(...)` chain after an expect's closing paren,
// capturing the matcher, negation, its first literal argument, and snapshot size.
function readMatchers(tokens, argClose) {
  let k = argClose + 1;
  const names = [];
  let negated = false;
  let snapshotLines = 0;
  let argLit = "";
  while (tokens[k]?.t === "punc" && tokens[k].v === "." && tokens[k + 1]?.t === "id") {
    const name = tokens[k + 1].v;
    k += 2;
    if (tokens[k]?.t === "punc" && tokens[k].v === "(") {
      const callClose = matchParen(tokens, k);
      if (callClose !== -1) {
        for (let m = k + 1; m < callClose; m += 1) {
          const a = tokens[m];
          if (!argLit && (a.t === "str" || a.t === "tmpl" || a.t === "num")) argLit = a.v;
          if ((name === "toMatchInlineSnapshot" || name === "toThrowErrorMatchingInlineSnapshot") && a.t === "tmpl") {
            snapshotLines = a.v.split("\n").length;
          }
        }
        k = callClose + 1;
      }
    }
    if (name === "not") negated = true;
    else names.push(name);
  }
  const meaningful = names.filter((n) => !ASSERT_MODIFIERS.has(n));
  const matcher = meaningful[meaningful.length - 1] ?? names[0] ?? "assert";
  return { matcher, negated, snapshotLines, argLit, endIdx: k - 1 };
}

// Whether the keyword at index k is a flaggable control-flow construct. Idiomatic
// `if (...) throw` narrowing guards and `for...of`/`for...in` assertion loops are
// not flagged; branching if/else, switch, while, and classic `for(;;)` are.
function controlFlowAt(tokens, k) {
  const kw = tokens[k].v;
  const open = k + 1;
  const close = matchParen(tokens, open);
  if (close === -1) return false;
  if (kw === "while" || kw === "switch") return true;
  if (kw === "if") {
    let after = tokens[close + 1];
    if (after?.t === "punc" && after.v === "{") after = tokens[close + 2];
    return !(after?.t === "id" && after.v === "throw");
  }
  for (let m = open + 1; m < close; m += 1) {
    if (tokens[m].t === "id" && (tokens[m].v === "of" || tokens[m].v === "in")) return false;
  }
  return true;
}

// Single pass over a test body collecting both overlap signatures and audit traits.
function analyzeBody(tokens, src, start, end) {
  const asserts = []; // coarse multiset of `[!]matcher@target` — drives clustering
  const sharpAsserts = []; // same, with literal args folded in — drives redundancy
  const matchers = []; // matcher names, for the weak-assertion rule
  const calls = new Set();
  const strings = new Set();
  let assertionCount = 0;
  let hasControlFlow = false;
  let hasConsole = false;
  let hasTimer = false;
  let snapshotLines = 0;
  let firstSetup = null;

  for (let k = start; k < end; k += 1) {
    const t = tokens[k];
    if (t.t === "str") {
      if (t.v.length > 1 && /[a-z0-9]/i.test(t.v)) strings.add(t.v);
      continue;
    }
    if (t.t !== "id") continue;
    const nxt = tokens[k + 1];
    const isCall = nxt?.t === "punc" && nxt.v === "(";
    if (!hasControlFlow && CONTROL_KEYWORDS.has(t.v) && isCall) hasControlFlow = controlFlowAt(tokens, k);
    if (t.v === "console" && nxt?.t === "punc" && nxt.v === ".") hasConsole = true;
    if (t.v === "setTimeout" && isCall) hasTimer = true;

    if (t.v === "expect" && isCall) {
      const argClose = matchParen(tokens, k + 1);
      if (argClose === -1) continue;
      const { target, lit } = expectInfo(tokens, k + 1, argClose);
      const m = readMatchers(tokens, argClose);
      const head = `${m.negated ? "!" : ""}${m.matcher}@${target}`;
      asserts.push(head);
      sharpAsserts.push(`${head}(${m.argLit})~${lit}`);
      matchers.push(m.matcher);
      if (m.snapshotLines > snapshotLines) snapshotLines = m.snapshotLines;
      assertionCount += 1;
      k = Math.max(argClose, m.endIdx);
      continue;
    }
    if (isCall && !NON_CALL_IDS.has(t.v)) {
      calls.add(t.v);
      if (!firstSetup) {
        const close = matchParen(tokens, k + 1);
        if (close !== -1) {
          firstSetup = `${t.v}${src.slice(tokens[k + 1].pos, tokens[close].pos + 1)}`.replace(/\s+/g, " ").trim();
        }
      }
    }
  }
  return {
    asserts, sharpAsserts, matchers, calls, strings, assertionCount,
    hasControlFlow, hasConsole, hasTimer, snapshotLines, firstSetup,
  };
}

// Overlap heuristic

const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "be", "to", "of", "in", "on", "for", "with", "and", "or", "when", "then",
  "should", "it", "its", "as", "by", "that", "this", "if", "not", "no", "does", "do",
]);

function titleWords(title) {
  return new Set(
    (title ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w)),
  );
}

// Distinct overlap atoms: each assertion plus each exercised call.
function atomSet(test) {
  const atoms = new Set(test.features.asserts);
  for (const c of test.features.calls) atoms.add(`call:${c}`);
  return atoms;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

// Multiset-subset over sharp (value-aware) assertions and calls: is every check
// `a` makes also made by `b`? Using sharp atoms keeps tests that share only a
// generic assertion shape (same matcher, different value) from looking redundant.
function isSubset(a, b) {
  const counts = new Map();
  for (const x of b.features.sharpAsserts) counts.set(x, (counts.get(x) ?? 0) + 1);
  const need = new Map();
  for (const x of a.features.sharpAsserts) need.set(x, (need.get(x) ?? 0) + 1);
  for (const [x, c] of need) if ((counts.get(x) ?? 0) < c) return false;
  for (const c of a.features.calls) if (!b.features.calls.has(c)) return false;
  return a.features.sharpAsserts.length > 0 || a.features.calls.size > 0;
}

// Every literal `a` uses (matcher args, selectors, expected values) also appears
// in `b`. Atoms ignore matcher arguments, so this guards against treating two
// tests that assert *different* attribute/value pairs as the same check.
function stringsSubset(a, b) {
  for (const s of a.features.strings) if (!b.features.strings.has(s)) return false;
  return true;
}

// Union-find over candidate edges.
function cluster(tests, edges) {
  const parent = tests.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const [a, b] of edges) parent[find(a)] = find(b);
  const groups = new Map();
  for (let i = 0; i < tests.length; i += 1) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

function recommend(members) {
  // A member is genuinely redundant only when a sibling with the *same setup*
  // call asserts a strict superset — same scenario, more checks. Subset of
  // assertion *shape* alone is not enough: value-parameterized cases (same
  // matcher, different inputs) look like subsets but each covers a distinct case.
  const removable = members.filter(
    (a) =>
      a.features.firstSetup &&
      members.some(
        (b) =>
          b !== a &&
          b.features.firstSetup === a.features.firstSetup &&
          isSubset(a, b) &&
          !isSubset(b, a) &&
          stringsSubset(a, b),
      ),
  );
  if (removable.length) {
    return {
      action: "remove-redundant",
      detail: `${removable.length} test(s) assert only a subset of a sibling and can be dropped: ${removable.map((m) => m.rel).join(", ")}.`,
    };
  }
  // Equal-shape tests assert the same thing. If their literal inputs also match
  // they are true duplicates; if the inputs differ they are one it.each.
  const inputs = members.map((m) => [...m.features.strings].sort().join(""));
  if (inputs.every((s) => s === inputs[0])) {
    return {
      action: "remove-redundant",
      detail: `${members.length} tests assert the same thing over the same inputs — keep one and drop the rest.`,
    };
  }
  const shared = [...members[0].features.strings].filter((s) => members.every((m) => m.features.strings.has(s)));
  const varying = [
    ...new Set(members.flatMap((m) => [...m.features.strings].filter((s) => !shared.includes(s)))),
  ].slice(0, 8);
  return {
    action: "merge-parameterize",
    detail: `Same assertions over differing inputs — merge into one it.each over: ${varying.join(", ")}.`,
  };
}

// Audit heuristic

const VAGUE_TITLES = new Set(["works", "should work", "test", "it works", "basic", "renders", "ok", "passes"]);

const SEVERITY_RANK = { error: 3, warn: 2, info: 1 };

// One closure over rule predicates keeps the rule set declarative and lets the
// `rules`/`minSeverity` args filter a single list.
const RULES = [
  {
    id: "focused-test",
    severity: "error",
    test: (t) => t.modifiers.includes("only"),
    message: () => "`.only` is left on — it silences every other test in the file.",
    fix: "Remove `.only` before committing.",
  },
  {
    id: "disabled-test",
    severity: "info",
    test: (t) => t.modifiers.includes("skip") || t.modifiers.includes("todo"),
    message: (t) => `Test is ${t.modifiers.includes("todo") ? "a todo" : "skipped"} — dead coverage.`,
    fix: "Re-enable it or delete it; a skipped test asserts nothing.",
  },
  {
    id: "no-assertion",
    severity: "warn",
    test: (t) => t.kind === "test" && t.features.assertionCount === 0 && !t.modifiers.includes("todo"),
    message: () => "Test runs but asserts nothing — it only catches throws.",
    fix: "Add an `expect`, or fold the smoke check into a render test that does assert.",
  },
  {
    id: "weak-assertion",
    severity: "info",
    test: (t) =>
      t.features.assertionCount > 0 && t.features.matchers.every((m) => WEAK_MATCHERS.has(m)),
    message: () => "Only truthiness/defined assertions — they pass on almost any value.",
    fix: "Assert the concrete value (toBe/toEqual/toHaveTextContent).",
  },
  {
    id: "logic-in-test",
    severity: "warn",
    test: (t) => t.features.hasControlFlow,
    message: () => "Control flow (if/for/while/switch) in the test body hides which case failed.",
    fix: "Split the branches, or table-drive them with it.each.",
  },
  {
    id: "leftover-console",
    severity: "warn",
    test: (t) => t.features.hasConsole,
    message: () => "`console` call left in the test body.",
    fix: "Remove debug logging.",
  },
  {
    id: "timer-wait",
    severity: "warn",
    test: (t) => t.features.hasTimer,
    message: () => "Real `setTimeout` makes the test slow and flaky.",
    fix: "Use vi.useFakeTimers() or await waitFor on the observable result.",
  },
  {
    id: "vague-title",
    severity: "info",
    test: (t) => {
      const norm = (t.title ?? "").toLowerCase().trim();
      return VAGUE_TITLES.has(norm) || titleWords(t.title).size < 2;
    },
    message: (t) => `Title "${t.title ?? ""}" does not describe the behavior under test.`,
    fix: "State the expected behavior, e.g. 'returns null when the list is empty'.",
  },
  {
    id: "oversized-snapshot",
    severity: "info",
    test: (t) => t.features.snapshotLines > 15,
    message: (t) => `Inline snapshot spans ${t.features.snapshotLines} lines — brittle and unreviewable.`,
    fix: "Assert the few properties that matter instead of the whole tree.",
  },
  {
    id: "overloaded-test",
    severity: "info",
    test: (t) => t.features.assertionCount > 12,
    message: (t) => `${t.features.assertionCount} assertions in one test — a failure won't localize.`,
    fix: "Split into focused tests, or assert one object with toEqual.",
  },
  {
    id: "long-test",
    severity: "info",
    test: (t) => t.endLine - t.startLine > 60,
    message: (t) => `Test body is ${t.endLine - t.startLine} lines.`,
    fix: "Extract setup into a helper or beforeEach.",
  },
];

// Every selectable rule id, including the cross-test duplicate-setup rule that
// runs outside the per-test RULES loop. Exported for the tool's enum.
export const RULE_IDS_FOR_SCHEMA = [...RULES.map((r) => r.id), "duplicate-setup"];

// File collection

const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "coverage", ".turbo", ".kb-cache"]);

async function walk(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(path.join(dir, entry.name), out);
    } else if (TEST_FILE.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
}

// Public surface

export function createTestAnalysis(repoRoot) {
  async function collectTestFiles(cwd, filters) {
    const base = path.resolve(repoRoot, cwd ?? ".");
    const out = [];
    await walk(base, out);
    const filtered = filters?.length
      ? out.filter((f) => filters.some((needle) => f.includes(needle)))
      : out;
    return filtered.sort();
  }

  // Parses one file into its leaf tests with features attached.
  async function parseFile(absPath) {
    const src = await fs.readFile(absPath, "utf8");
    const tokens = lex(src);
    const blocks = extractBlocks(tokens);
    assignNesting(blocks);
    const lineAt = lineLookup(src);
    const rel = path.relative(repoRoot, absPath);
    const hasBeforeEach = new Set(
      blocks.filter((b) => b.kind === "hook" && b.method === "beforeEach").map((b) => b.suiteKey),
    );
    const tests = blocks
      .filter((b) => b.kind === "test")
      .map((b) => ({
        file: rel,
        path: absPath,
        kind: b.kind,
        method: b.method,
        modifiers: b.modifiers,
        title: b.title,
        fullTitle: b.fullTitle,
        suiteKey: b.suiteKey,
        startLine: lineAt(b.startPos),
        endLine: lineAt(b.endPos),
        rel: `${rel}:${lineAt(b.startPos)}`,
        // Start past the title literal so it never counts as a body string.
        features: analyzeBody(tokens, src, (b.titleTok >= 0 ? b.titleTok : b.openParen) + 1, b.closeParen),
      }));
    return { rel, tests, hasBeforeEach };
  }

  async function loadTests(cwd, filters) {
    const files = await collectTestFiles(cwd, filters);
    const parsed = await Promise.all(files.map(parseFile));
    return { files, parsed };
  }

  // Overlap clustering, scoped to one file
  // Overlap is consolidated where it lives: redundant cases sit next to each
  // other in the same file. Clustering per file keeps the candidate set small
  // (near-linear via an inverted atom index) and avoids transitive mega-clusters
  // that span unrelated components. An edge links two tests when one is a strict
  // subset of the other (guaranteed redundancy) or their bodies — or strong
  // titles plus bodies — clear the threshold.
  function clusterFile(fileTests, threshold, minAtoms) {
    const tests = fileTests.filter((t) => {
      t.atoms = atomSet(t);
      return t.atoms.size >= minAtoms;
    });
    if (tests.length < 2) return [];

    const index = new Map();
    tests.forEach((t, i) => {
      for (const atom of t.atoms) {
        if (!index.has(atom)) index.set(atom, []);
        index.get(atom).push(i);
      }
    });

    const seen = new Set();
    const edges = [];
    for (const ids of index.values()) {
      if (ids.length < 2) continue;
      for (let a = 0; a < ids.length; a += 1) {
        for (let b = a + 1; b < ids.length; b += 1) {
          const key = `${ids[a]}:${ids[b]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const x = tests[ids[a]];
          const y = tests[ids[b]];
          const bodySim = jaccard(x.atoms, y.atoms);
          const titleSim = jaccard(titleWords(x.title), titleWords(y.title));
          const subset = isSubset(x, y) || isSubset(y, x);
          if (subset || bodySim >= threshold || (titleSim >= 0.7 && bodySim >= threshold * 0.6)) {
            edges.push([ids[a], ids[b], bodySim, titleSim]);
          }
        }
      }
    }

    return cluster(tests, edges).map((memberIds) => {
      const members = memberIds.map((i) => tests[i]);
      const pairs = edges
        .filter(([a, b]) => memberIds.includes(a) && memberIds.includes(b))
        .map(([a, b, body, title]) => ({
          a: tests[a].rel,
          b: tests[b].rel,
          bodySim: Number(body.toFixed(2)),
          titleSim: Number(title.toFixed(2)),
        }));
      return {
        members: members.map((m) => ({ rel: m.rel, fullTitle: m.fullTitle, assertions: m.features.assertionCount })),
        pairs,
        recommendation: recommend(members),
      };
    });
  }

  async function findOverlaps({ cwd, filters, threshold = 0.7, minAtoms = 2 }) {
    const { files, parsed } = await loadTests(cwd, filters);
    let testCount = 0;
    const clusters = [];
    for (const file of parsed) {
      testCount += file.tests.length;
      for (const c of clusterFile(file.tests, threshold, minAtoms)) clusters.push(c);
    }
    clusters.sort((a, b) => b.members.length - a.members.length);
    return { files: files.length, tests: testCount, threshold, clusters };
  }

  async function auditTests({ cwd, filters, rules, minSeverity = "info" }) {
    const { files, parsed } = await loadTests(cwd, filters);
    const active = rules?.length ? RULES.filter((r) => rules.includes(r.id)) : RULES;
    const floor = SEVERITY_RANK[minSeverity] ?? 1;

    const findings = [];
    const ruleCounts = {};
    const severityCounts = { error: 0, warn: 0, info: 0 };
    let testCount = 0;

    for (const file of parsed) {
      testCount += file.tests.length;
      for (const t of file.tests) {
        for (const rule of active) {
          if (SEVERITY_RANK[rule.severity] < floor) continue;
          if (!rule.test(t)) continue;
          findings.push({
            rule: rule.id,
            severity: rule.severity,
            location: t.rel,
            test: t.fullTitle,
            message: rule.message(t),
            fix: rule.fix,
          });
          ruleCounts[rule.id] = (ruleCounts[rule.id] ?? 0) + 1;
          severityCounts[rule.severity] += 1;
        }
      }

      // Duplicated-setup is cross-test within a describe: ≥3 siblings with an
      // identical first setup call and no beforeEach already present.
      if (SEVERITY_RANK.info >= floor && (!rules?.length || rules.includes("duplicate-setup"))) {
        const bySuite = new Map();
        for (const t of file.tests) {
          if (!t.features.firstSetup) continue;
          const key = `${t.suiteKey} ${t.features.firstSetup}`;
          if (!bySuite.has(key)) bySuite.set(key, []);
          bySuite.get(key).push(t);
        }
        for (const [key, group] of bySuite) {
          const suiteKey = key.split(" ")[0];
          if (group.length >= 3 && !file.hasBeforeEach.has(suiteKey)) {
            findings.push({
              rule: "duplicate-setup",
              severity: "info",
              location: group[0].rel,
              test: group[0].fullTitle,
              message: `${group.length} sibling tests repeat the setup \`${group[0].features.firstSetup.slice(0, 80)}\`.`,
              fix: "Lift the shared setup into a beforeEach.",
            });
            ruleCounts["duplicate-setup"] = (ruleCounts["duplicate-setup"] ?? 0) + 1;
            severityCounts.info += 1;
          }
        }
      }
    }

    const order = { error: 0, warn: 1, info: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity] || a.location.localeCompare(b.location));
    return { files: files.length, tests: testCount, ruleCounts, severityCounts, findings };
  }

  return { collectTestFiles, parseFile, findOverlaps, auditTests };
}
