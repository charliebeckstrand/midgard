# a11y MCP server

Accessibility tooling for `packages/ui`, built on the existing a11y corpus
(`packages/ui/src/__tests__/a11y/cases/*`) and gates. It does not re-implement
axe or a render environment — the static tools read the corpus by import scan,
and `audit` drives the real vitest gates.

## Tools

| Tool | Kind | What it does |
| --- | --- | --- |
| `corpus_coverage` | static | Maps every `packages/ui` component to the corpus: which have a canonical case, in which gate (structural / geometry / focus / traps), and which have none. Pass a `component` for one row; omit for the full map + gap list. |
| `which_gate` | static | For a component, reports which gates assert it today and where a new assertion belongs, per [CONVENTIONS.md](../../CONVENTIONS.md) §10.5 (DOM-tree → jsdom; layout/colour/geometry → browser; kind-wide → shared corpus, one-off → own file). |
| `audit` | runs tests | Runs the existing a11y gate and returns structured findings. `gate="structural"` (default) runs jsdom axe over a corpus bucket and returns per-case violations keyed to `data-slot` + WCAG SC. `gate="geometry"` runs the browser contrast/target-size gate (Chromium) and returns the run summary. |

## How coverage is computed

Case names on the corpus tuples are free-form (`"input in field"`), so they are
not used for the component mapping. Instead every case file imports the
components it renders from `../../../components/<dir>`; coverage is the set of
those import specifiers per gate. Coverage is therefore import-level: a
component counts as covered when a gate *renders* it, including as a wrapper or
trigger (a `Button` opening a dialog shows up in the overlay/focus/trap gates).

## The audit harness

`audit` (structural) arms `packages/ui/src/__tests__/a11y/mcp-audit.test.tsx`
through env vars (`MCP_AUDIT=1`, `MCP_AUDIT_BUCKET`, `MCP_AUDIT_FILTER`,
`MCP_AUDIT_OUT`). It renders the selected corpus cases through the same
`renderUI` + `axe` path as `baseline.test.tsx` and writes raw axe violations to
a temp file the server reshapes. Disarmed (the normal case), the harness is a
single skipped test, so `test:a11y` and CI are unaffected. The geometry gate
runs in the browser pool, which has no `node:fs`, so it returns the vitest run
summary rather than per-node structure.

## Zero-dependency, like the other first-party server

This server is hand-written and ships no `package.json`: `index.mjs` carries a
minimal inline MCP stdio runtime (modelled on `../vitest/index.mjs`) in place of
the SDK, so it runs on a fresh clone with nothing but Node — no `node_modules`,
no install step. `analysis.mjs` and `audit.mjs` use only Node built-ins.

The `audit` tool shells out to the `ui` package's own vitest, so that package
must be installed (the repo's normal `pnpm install`); `gate="geometry"`
additionally needs Playwright browsers
(`pnpm --filter ui exec playwright install chromium`).
