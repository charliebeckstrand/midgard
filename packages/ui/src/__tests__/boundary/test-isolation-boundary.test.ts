import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations, srcDir } from '../helpers/walk-source'

// The `unit` and `boundary` projects both run `isolate: false`, so one module
// registry serves every file a worker runs. A per-file mock reaches whichever
// files `sequence.shuffle` schedules after it, and `vi.resetModules()` drops a
// graph those files must rebuild. Neither call fails the file that declares it,
// and both are seed-dependent — see `mocks/shiki.ts` for the one time this
// suite paid that bill. Global doubles belong in `setup/`, which runs for every
// file by definition; a suite that needs its own mock belongs in `boundary/`,
// which the `integration` project runs on forks.

const testsDir = join(srcDir, '__tests__')

// `browser/` runs under vitest.browser.config.ts, and `setup/` is the
// sanctioned home for a global mock. `boundary/` is split: the `*-boundary`
// files below share the registry, the rest run isolated on forks.
const SHARED_REGISTRY_SKIP = new Set(['boundary', 'browser', 'setup'])

// `vitest` is a global alias for `vi` under `globals: true`, so both spellings
// reach the same registry.
const FORBIDDEN_PATTERNS = [
	{ label: 'per-file module mock', regex: /\b(?:vi|vitest)\.(?:mock|doMock|unmock|doUnmock)\(/g },
	{ label: 'module registry reset', regex: /\b(?:vi|vitest)\.resetModules\(/g },
] as const

describe('test isolation boundary', () => {
	it('no file in a shared-registry project mutates the module registry', () => {
		const violations = [
			// The `unit` project: every test tree it evaluates, not only the
			// `*.test.*` files — a mock in a helper reaches the same registry.
			...collectPatternViolations({
				dir: testsDir,
				patterns: FORBIDDEN_PATTERNS,
				skip: SHARED_REGISTRY_SKIP,
				stripComments: true,
			}),
			...collectPatternViolations({
				dir: join(srcDir, 'docs', 'engine', '__tests__'),
				patterns: FORBIDDEN_PATTERNS,
				stripComments: true,
			}),
			// The `boundary` project, which shares a registry of its own.
			...collectPatternViolations({
				dir: join(testsDir, 'boundary'),
				patterns: FORBIDDEN_PATTERNS,
				fileFilter: /-boundary\.test\.ts$/,
				stripComments: true,
			}),
		]

		expect(
			violations,
			`these projects share one module registry (isolate: false) — mock globally in setup/module-mocks.ts, or move the suite to boundary/ so it runs on forks:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
