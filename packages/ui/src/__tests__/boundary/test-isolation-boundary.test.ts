import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations, srcDir } from '../helpers/walk-source'

// The unit project runs `pool: 'threads'` with `isolate: false`, so one module
// registry serves every file a worker runs. Two calls break that:
//
// - A per-file `vi.mock` reaches whichever files `sequence.shuffle` schedules
//   after it in the same worker. The suite has paid this bill once already —
//   see `mocks/shiki.ts`, where two files declared divergent local shiki mocks
//   and whichever loaded first won.
// - `vi.resetModules()` drops the shared graph that every later file in the
//   worker then rebuilds. `vitest.config.ts` forbids it by name.
//
// Neither fails the file that declares it, and both are seed-dependent, so the
// signal never points home. Hence this scan. The global doubles live in
// `setup/module-mocks.ts`; a suite that genuinely needs a per-file mock belongs
// in `boundary/`, which the `integration` project runs on forks.

// The unit project's include set (vitest.config.ts), minus its two exclusions:
// `browser/` runs under vitest.browser.config.ts, and `boundary/` is split
// between the `boundary` and `integration` projects.
const UNIT_DIRS = [join(srcDir, '__tests__'), join(srcDir, 'docs', 'engine', '__tests__')]

const UNIT_SKIP = new Set(['boundary', 'browser'])

// Anchored to the start of a line so the four prose mentions of `vi.mock` in
// the unit tree stay out of scope; only a real call site matches.
const FORBIDDEN_PATTERNS = [
	{ label: 'per-file module mock', regex: /(?<=^[ \t]*)vi\.(?:mock|doMock|unmock|doUnmock)\(/gm },
	{ label: 'module registry reset', regex: /(?<=^[ \t]*)vi\.resetModules\(/gm },
] as const

describe('test isolation boundary', () => {
	it('no unit-project test file mutates the worker-shared module registry', () => {
		const violations = UNIT_DIRS.flatMap((dir) =>
			collectPatternViolations({
				dir,
				patterns: FORBIDDEN_PATTERNS,
				// Scoped to test files, so the global factories under `mocks/` and
				// the `vi.mock` calls in `setup/module-mocks.ts` need no allowance.
				fileFilter: /\.test\.tsx?$/,
				skip: UNIT_SKIP,
			}),
		)

		expect(
			violations,
			`the unit project shares one module registry (isolate: false) — mock globally in setup/module-mocks.ts, or move the suite to boundary/ so it runs on forks:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
