/**
 * The test settings that the jsdom run (`vitest.config.ts`) and the browser
 * run (`vitest.browser.config.ts`) share.
 *
 * The settings that each suite of the repository shares come from
 * `vitest.shared.mts` at the root: the CI flag, the cleanup, the assertion
 * rule, the budgets, and the time zone. In ui, the setup files also restore
 * after each test (`helpers/restore-test-state.ts`), because the shuffle gives
 * a leak to whichever file runs next on a shared worker.
 */
import type { CoverageOptions } from 'vitest/node'

export { assertions, budgets, CI, cleanup, env } from '../../vitest.shared.mts'

/**
 * The source that a run with coverage measures, in the jsdom suite and in the
 * browser suite. Each suite writes its report to a folder of its own under
 * `coverage/`. Both suites measure the same files with the same provider, so
 * `scripts/coverage/merge.ts` merges their reports into one. Thus a line
 * counts as covered when a test of either suite runs it.
 */
export const coverage: CoverageOptions = {
	provider: 'v8',
	include: ['src/**/*.{ts,tsx}'],
	exclude: ['src/__tests__/**', 'src/__benchmarks__/**', 'src/docs/**'],
	reporter: ['json'],
}

const SEED = process.env.VITEST_SEED

if (SEED !== undefined && !Number.isFinite(Number(SEED))) {
	throw new Error(
		`VITEST_SEED must be a number; received ${SEED}. A NaN seed corrupts the shuffle.`,
	)
}

/**
 * A shuffled file order, so that an order dependency fails early. Replay a red
 * run with `VITEST_SEED=<seed>`, never with `--sequence.seed` (see
 * `vitest.config.ts`).
 */
export const sequence = { shuffle: true, ...(SEED ? { seed: Number(SEED) } : {}) }
