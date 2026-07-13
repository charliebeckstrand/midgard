// @vitest-environment node

import path from 'node:path'
import { bench, describe } from 'vitest'
import { buildApi } from '../../docs/engine/api-reference'

// The headline number: one full extraction over the real package source —
// what the dev server pays on first `virtual:api-reference-manifest` read and
// again on every HMR invalidation, and what `docs:build` pays once. ~10s per
// iteration at baseline, so fixed low iterations.

const srcDir = path.resolve(import.meta.dirname, '..', '..')

describe('docs: buildApi end to end', () => {
	bench(
		'full package extraction',
		() => {
			buildApi(srcDir)
		},
		{ warmupIterations: 0, warmupTime: 0, iterations: 3, time: 0 },
	)
})
