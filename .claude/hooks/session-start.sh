#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

pnpm install --prefer-offline

# Warm the turbo cache, then Vitest, in one detached background chain.
# check-types dependsOn ^build, so the first pre-commit gate in a fresh
# container otherwise pays cold tsup/tsc builds — racing this very warmup
# for CPU/memory. Sequencing both warmups in a single chain keeps them
# from contending with each other, and the hook still returns as soon as
# install finishes.
nohup bash -c '
  pnpm turbo run build check-types --output-logs=errors-only
  pnpm --filter ui exec vitest run --reporter=silent
' >"${TMPDIR:-/tmp}/session-warmup.log" 2>&1 </dev/null &
disown || true
