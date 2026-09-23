#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The global pnpm switches to the `packageManager` version on its first run,
# but it skips the `preinstall` of that version. The native binary then stays
# a shebang-less placeholder, and turbo, which does not retry ENOEXEC under
# `sh`, cannot spawn `pnpm`. Run the skipped `install.js` to link the binary.
pnpm --version >/dev/null
pnpm_version=$(node -p "require('./package.json').packageManager.split('@')[1]")
pnpm_dir="${PNPM_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/pnpm}/.tools/pnpm/$pnpm_version/node_modules/pnpm"
if [ -f "$pnpm_dir/pnpm" ] && [ "$(head -c 4 "$pnpm_dir/pnpm")" != $'\x7fELF' ]; then
  (cd "$pnpm_dir" && node install.js)
fi

pnpm install --prefer-offline

# Warm the turbo cache, then Vitest, in one detached background chain.
# The pre-push gate runs check-types and test:changed, and test:changed
# dependsOn ^build, so the first push in a fresh container otherwise pays
# cold tsup/tsc builds — racing this very warmup
# for CPU/memory. Sequencing both warmups in a single chain keeps them
# from contending with each other, and the hook still returns as soon as
# install finishes.
nohup bash -c '
  pnpm turbo run build check-types --output-logs=errors-only
  pnpm --filter ui exec vitest run --reporter=silent
' >"${TMPDIR:-/tmp}/session-warmup.log" 2>&1 </dev/null &
disown || true
