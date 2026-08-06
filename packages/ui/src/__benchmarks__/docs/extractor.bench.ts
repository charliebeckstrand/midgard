// @vitest-environment node

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bench, describe } from 'vitest'
import { createApiExtractor } from '../../docs/engine/api-reference'
import { aggregateHash } from '../../docs/engine/api-reference/engine/api-extractor'
import { buildApi } from '../../docs/engine/api-reference/engine/build-api'

// The benchmarks run against the package's own source tree, the workload the
// docs plugin actually extracts (~100 barrels over ~1.2k reachable files). The
// benchDir sits at `src/__benchmarks__/docs`, so the source root is two levels
// up.
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// A component source edited between incremental passes. Only the barrels that
// reach it re-extract.
const editedFile = path.join(srcDir, 'components', 'button', 'button.tsx')

// Heavy passes open a full ts-morph Project (hundreds of MB, seconds each); cap
// them to a single timed run so the suite stays bounded and doesn't stack live
// projects in memory.
const once = { iterations: 1, warmupIterations: 0, time: 0, warmupTime: 0 }

// Light passes open no Project, so they can afford a sample wide enough to show
// their spread.
const sampled = { iterations: 20, warmupIterations: 3, time: 0, warmupTime: 0 }

const cacheDir = mkdtempSync(path.join(tmpdir(), 'api-bench-'))

// Prime the disk cache once so the restore benchmark measures a warm cache.
createApiExtractor(srcDir, { cacheDir }).getAll()

// A warmed extractor whose Project stays alive, for the per-barrel incremental
// path a live dev session hits.
const warm = createApiExtractor(srcDir, { cacheDir: null })
warm.getAll()

describe('docs: buildApi extraction', () => {
	// The pre-optimization baseline: one whole-project extraction from cold.
	bench('buildApi (cold, whole project)', () => void buildApi(srcDir), once)

	bench(
		'extractor cold (no cache)',
		() => void createApiExtractor(srcDir, { cacheDir: null }).getAll(),
		once,
	)

	// A clean restart with an unchanged tree: replay the stored JSON, no Project.
	bench(
		'extractor disk restore (no change)',
		() => void createApiExtractor(srcDir, { cacheDir }).getAll(),
		sampled,
	)

	// A single-component edit in a live session: refresh one file, re-extract only
	// the barrels it feeds against the already-warm checker.
	bench(
		'extractor incremental edit (per-barrel)',
		() => {
			warm.notifyChanged(editedFile)
			warm.getAll()
		},
		{ iterations: 10, warmupIterations: 2, time: 0, warmupTime: 0 },
	)
})

// `persist` calls `aggregateHash` once per pass, and the incremental figure
// above varies by more than the memo saves — so measure the key on its own.
// Primed here rather than left to the warmup, so the warm case measures a full
// memo whatever the runner does with `warmupIterations`.
const warmHashes = new Map<string, string>()

aggregateHash(srcDir, warmHashes)

describe('docs: aggregateHash (disk cache key)', () => {
	// Every pass paid this before the memo outlived it: the walk, then a read and
	// a hash of all ~1.2k input files.
	bench('aggregateHash (cold memo)', () => void aggregateHash(srcDir, new Map()), sampled)

	// The steady state: one edited path drops out, so the walk stays and the
	// digest reads one file.
	bench(
		'aggregateHash (warm memo, one path dropped)',
		() => {
			warmHashes.delete(editedFile)

			aggregateHash(srcDir, warmHashes)
		},
		sampled,
	)
})

// Vitest tears the worker down after the run; the temp cache dir goes with it,
// but drop it eagerly when the process cooperates.
process.on('exit', () => rmSync(cacheDir, { recursive: true, force: true }))
