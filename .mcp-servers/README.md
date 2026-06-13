# MCP servers

Vendored [claude-dev-suite](https://github.com/claude-dev-suite) MCP servers, wired into
this repo via the root [`.mcp.json`](../.mcp.json). Claude Code launches them over stdio
from the project root.

| Server | Tools | Notes |
| --- | --- | --- |
| `code-quality` | `analyze_complexity`, `find_duplicates`, `check_style`, `detect_antipatterns`, `find_dead_code`, `analyze_import_graph`, `code_metrics` | Vendored. No config. |
| `documentation` | `fetch_docs`, `list_docs`, `list_topics`, `list_versions`, `search_docs` | Vendored. Fetches docs at runtime from a git knowledge base (default: `claude-dev-suite/knowledge_base`), falling back to live doc sites; 2h cache under `.kb-cache/` (gitignored). Override the source by setting `KB_REPO_URL` in `.mcp.json`. |
| `vitest` | `run_tests`, `list_tests`, `run_coverage`, `run_related` | First-party. Shells out to the target workspace's own vitest (via `pnpm exec`) with the JSON reporter and formats a markdown report. Each tool takes an optional `cwd` (relative to the repo root) that must point at a package with a vitest config — e.g. `packages/ui`. No config. |

## `code-quality` and `documentation` are generated, self-contained bundles

Each of those `<server>/index.mjs` files is a single esbuild bundle with every runtime
dependency inlined — no `node_modules`, no install step. They are committed intentionally so
the servers work on a fresh clone with nothing but Node. Do not hand-edit them.

`vitest/index.mjs` is first-party source, not a vendored bundle: it has no upstream to
regenerate from and uses only Node built-ins plus a minimal inline MCP stdio runtime in place
of the bundled SDK, so it is equally dependency-free but is edited directly here.

### Regenerating

From a checkout of `claude-dev-suite/mcp-servers`:

```bash
npm install -w code-quality -w documentation --include-workspace-root
npm run build -w code-quality
npm run build -w documentation
```

Then copy each `<server>/dist/index.js` over the matching `<server>/index.mjs` here.
