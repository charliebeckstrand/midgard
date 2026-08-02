import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPatternViolations, srcDir } from '../helpers/walk-source'

// A project that runs `isolate: false` shares one module registry across every
// file a worker runs; vitest.config.ts records what that buys. Two calls break
// it, and neither fails the file that declares it: a per-file mock reaches
// whichever files `sequence.shuffle` schedules next, and `vi.resetModules()`
// drops a graph they must rebuild. Global doubles belong in `setup/`, which
// runs for every file; a suite that needs its own mock belongs in `boundary/`,
// which the `integration` project runs on forks. `mocks/shiki.ts` records the
// one time this suite paid the bill.

const testsDir = join(srcDir, '__tests__')

// `browser/` runs under vitest.browser.config.ts, and `setup/` is the
// sanctioned home for a global mock. `boundary/` is split: its `*-boundary`
// files share a registry and are scanned below, the rest run on forks.
const SHARED_REGISTRY_SKIP = new Set(['boundary', 'browser', 'setup'])

// The `unit` project's whole test tree — not only `*.test.*`, since a mock in a
// helper reaches the same registry — the docs engine suite it also runs, and
// the `boundary` project's own files.
const SHARED_REGISTRY_SCANS = [
	{ dir: testsDir, skip: SHARED_REGISTRY_SKIP },
	{ dir: join(srcDir, 'docs', 'engine', '__tests__') },
	{ dir: join(testsDir, 'boundary'), fileFilter: /-boundary\.test\.ts$/ },
]

// `vitest` is a global alias for `vi` under `globals: true`, so both spellings
// reach the same registry.
const FORBIDDEN_PATTERNS = [
	{ label: 'per-file module mock', regex: /\b(?:vi|vitest)\.(?:mock|doMock|unmock|doUnmock)\(/g },
	{ label: 'module registry reset', regex: /\b(?:vi|vitest)\.resetModules\(/g },
] as const

describe('test isolation boundary', () => {
	it('no file in a shared-registry project mutates the module registry', () => {
		const violations = SHARED_REGISTRY_SCANS.flatMap((scan) =>
			collectPatternViolations({ patterns: FORBIDDEN_PATTERNS, stripComments: true, ...scan }),
		)

		expect(
			violations,
			`these projects share one module registry (isolate: false) — mock globally in setup/module-mocks.ts, or move the suite to boundary/ so it runs on forks:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	// The scans above enumerate the projects that share a registry. That set
	// lives in vitest.config.ts and can change with no signal here, which would
	// leave this gate guarding a registry it no longer covers. Read the config as
	// text rather than import it: it pulls in the docs plugin, and with it
	// ts-morph, which this node project exists to avoid.
	it('covers every project that shares a module registry', () => {
		const config = readFileSync(join(srcDir, '..', 'vitest.config.ts'), 'utf8')

		const shared = config
			.split(/name: '/)
			.slice(1)
			.filter((block) => /\bisolate: false/.test(block))
			.map((block) => block.slice(0, block.indexOf("'")))

		expect(
			shared.sort(),
			'a project changed its isolation — extend the scans above to cover its files, or drop it from them',
		).toEqual(['boundary', 'unit'])
	})
})
