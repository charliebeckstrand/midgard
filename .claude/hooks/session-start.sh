#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

pnpm install --prefer-offline

# Warm Vitest in the background: populates Vite's dep pre-bundle and transform
# cache so the first interactive `pnpm test` doesn't pay the cold-start cost.
# Detached so the hook returns as soon as install finishes.
nohup pnpm --filter ui exec vitest run --reporter=silent \
  >"${TMPDIR:-/tmp}/vitest-warmup.log" 2>&1 </dev/null &
disown || true
