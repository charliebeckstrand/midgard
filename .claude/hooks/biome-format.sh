#!/bin/bash
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file_path" ] && exit 0

case "$file_path" in
	*.ts|*.tsx) ;;
	*) exit 0 ;;
esac

case "$file_path" in
	"$CLAUDE_PROJECT_DIR"/*) ;;
	*) exit 0 ;;
esac

case "$file_path" in
	*/node_modules/*|*/dist/*|*/.next/*) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR"

if ! output=$(pnpm --silent biome check --write "$file_path" 2>&1); then
	printf 'biome check found unfixable issues in %s:\n%s\n' "$file_path" "$output" >&2
	exit 2
fi
