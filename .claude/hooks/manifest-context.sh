#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

manifest="manifest.json"

# Nothing to inject when the manifest is absent — every skill already halts with
# its own "run /repo:manifest" instruction in that case.
[ -f "$manifest" ] || exit 0

# Cheap staleness check. No schema change, no regeneration: compare git history
# of the manifest against its inputs, then fall back to the working tree. mtimes
# are useless in a fresh clone, so history is the reliable signal.
inputs=( ':(glob)**/package.json' ':(glob)**/CLAUDE.md' pnpm-workspace.yaml turbo.json pnpm-lock.yaml )

manifest_epoch=$(git log -1 --format=%ct -- "$manifest" 2>/dev/null || echo 0)
inputs_epoch=$(git log -1 --format=%ct -- "${inputs[@]}" 2>/dev/null || echo 0)
inputs_dirty=$(git status --porcelain -- "${inputs[@]}" 2>/dev/null || true)
manifest_dirty=$(git status --porcelain -- "$manifest" 2>/dev/null || true)

stale=""
if [ "${inputs_epoch:-0}" -gt "${manifest_epoch:-0}" ]; then
	stale="committed changes to manifest inputs are newer than manifest.json"
elif [ -n "$inputs_dirty" ] && [ -z "$manifest_dirty" ]; then
	stale="uncommitted changes to manifest inputs are not reflected in manifest.json"
fi

header="# Project Manifest (canonical)

./manifest.json — the project profile produced by /repo:manifest and consumed by every skill. Consult it before spawning an exploration agent for stack, scripts, package layout, conventions, vocabulary, or test setup; it already holds those answers. Reserve exploration for task-specific code — call sites, defect locations, current file contents — which the manifest deliberately omits."

if [ -n "$stale" ]; then
	header="$header

STALE: $stale. Treat structural fields as approximate; run /repo:manifest before relying on them."
fi

jq -n --rawfile manifest "$manifest" --arg header "$header" \
	'{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: ($header + "\n\n```json\n" + $manifest + "```\n")}}'
