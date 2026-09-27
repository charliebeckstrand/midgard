#!/usr/bin/env bash
# Keeps only the Turbo cache entries that this run hit or wrote.
#
# Turbo never evicts from its local cache, and the restore key of the
# turbo-cache action carries every entry forward. Thus each run saved all the
# entries before it plus its own. The cache reached 1.4 GB, which the job
# downloads and uploads each run. The entries that this run hit or wrote are
# the ones that the next run can hit. Each `--summarize` run summary names
# their hashes.
set -euo pipefail

keep=$(jq -r '.tasks[].hash' .turbo/runs/*.json | sort -u)

for entry in .turbo/cache/*; do
	hash=$(basename "$entry")
	hash=${hash%%[-.]*}
	grep -qxF "$hash" <<< "$keep" || rm -f "$entry"
done

rm -rf .turbo/runs
du -sh .turbo/cache
