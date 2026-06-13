# MCP servers

Vendored [claude-dev-suite](https://github.com/claude-dev-suite) MCP servers, wired into
this repo via the root [`.mcp.json`](../.mcp.json). Claude Code launches them over stdio
from the project root.

| Server | Tools | Notes |
| --- | --- | --- |
| `code-quality` | `analyze_complexity`, `find_duplicates`, `check_style`, `detect_antipatterns`, `find_dead_code`, `analyze_import_graph`, `code_metrics` | No config. |
| `documentation` | `fetch_docs`, `list_docs`, `list_topics`, `list_versions`, `search_docs` | Fetches docs at runtime from a git knowledge base (default: `claude-dev-suite/knowledge_base`), falling back to live doc sites; 2h cache under `.kb-cache/` (gitignored). Override the source by setting `KB_REPO_URL` in `.mcp.json`. |

## These are generated, self-contained bundles

Each `<server>/index.mjs` is a single esbuild bundle with every runtime dependency inlined —
no `node_modules`, no install step. They are committed intentionally so the servers work on a
fresh clone with nothing but Node. Do not hand-edit them.

### Regenerating

From a checkout of `claude-dev-suite/mcp-servers`:

```bash
npm install -w code-quality -w documentation --include-workspace-root
npm run build -w code-quality
npm run build -w documentation
```

Then copy each `<server>/dist/index.js` over the matching `<server>/index.mjs` here.
