# MCP servers

Vendored [claude-dev-suite](https://github.com/claude-dev-suite) MCP servers, wired into
this repo via the root [`.mcp.json`](../.mcp.json). Claude Code launches them over stdio
from the project root.

| Server | Tools | Notes |
| --- | --- | --- |
| `code-quality` | `analyze_complexity`, `find_duplicates`, `check_style`, `detect_antipatterns`, `find_dead_code`, `analyze_import_graph`, `code_metrics` | Vendored. No config. |
| `documentation` | `fetch_docs`, `list_docs`, `list_topics`, `list_versions`, `search_docs` | Vendored. Fetches docs at runtime from a git knowledge base (default: `claude-dev-suite/knowledge_base`), falling back to live doc sites; 2h cache under `.kb-cache/` (gitignored). Override the source by setting `KB_REPO_URL` in `.mcp.json`. |
| `vitest` | `run_tests`, `list_tests`, `run_coverage`, `run_related`, `find_overlaps`, `audit_tests` | First-party. The four run tools shell out to the target workspace's own vitest (via `pnpm exec`) with the JSON reporter and format a markdown report. `find_overlaps` and `audit_tests` are static (no vitest run): a dependency-free lexer in `vitest/analysis.mjs` parses the test sources, then clusters overlapping tests (drop the redundant / merge into one `it.each`) and audits them for best-practice/leanness issues. Each tool takes an optional `cwd` (relative to the repo root) — for the run tools a package with a vitest config (e.g. `packages/ui`); for the static tools any directory to scan. No config. |
| `a11y` | `corpus_coverage`, `which_gate`, `audit` | First-party. Accessibility tooling over the `packages/ui` a11y corpus and gates; the `audit` tool drives the package's own vitest a11y gates. No config. See [`a11y/README.md`](a11y/README.md). |

## `code-quality` and `documentation` are generated, self-contained bundles

Each of those `<server>/index.mjs` files is a single esbuild bundle with every runtime
dependency inlined — no `node_modules`, no install step. They are committed intentionally so
the servers work on a fresh clone with nothing but Node. Do not hand-edit them.

The `vitest` and `a11y` servers are first-party source, not vendored bundles: they have no
upstream to regenerate from and use only Node built-ins plus a minimal inline MCP stdio
runtime in place of the bundled SDK, so they are equally dependency-free but are edited
directly here. Each splits its static analysis into a sibling module the `index.mjs` wires up
(`vitest/analysis.mjs`, `a11y/analysis.mjs` + `a11y/audit.mjs`).

### Regenerating

From a checkout of `claude-dev-suite/mcp-servers`:

```bash
npm install -w code-quality -w documentation --include-workspace-root
npm run build -w code-quality
npm run build -w documentation
```

Then copy each `<server>/dist/index.js` over the matching `<server>/index.mjs` here.
