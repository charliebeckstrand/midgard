/**
 * The test settings that the jsdom run (`vitest.config.ts`) and the browser
 * run (`vitest.browser.config.ts`) share.
 */

/** Whether the run is on CI, where the budgets scale up. */
export const CI = Boolean(process.env.CI)

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

/**
 * The cleanup before each test. A `vi.spyOn`, a `vi.stubGlobal`, or a
 * `vi.stubEnv` otherwise outlives its test, and the shuffle gives the leak to
 * whichever test runs next.
 *
 * - `restoreMocks` reverts each `vi.spyOn` spy. It does not touch a plain
 *   `vi.fn()`, so the stubs of the setup files stay.
 * - `clearMocks` drops the call history of each mock, so a shared mock (motion,
 *   shiki, floating-ui) carries no count into the next test. It keeps the
 *   implementation. `mockReset` would remove the implementations of the shared
 *   mocks, so the runs do not set it.
 * - `unstubGlobals` and `unstubEnvs` revert `vi.stubGlobal` and `vi.stubEnv`.
 *
 * Each runs before `beforeEach`, so a hook or a test body applies its setup
 * again with no change.
 */
export const cleanup = {
	restoreMocks: true,
	clearMocks: true,
	unstubGlobals: true,
	unstubEnvs: true,
} as const

/**
 * The source that coverage measures. The jsdom run and the browser run each
 * write a report over this scope, and `scripts/merge-coverage.ts` merges the
 * two. A file that only the browser suite tests then counts as covered.
 */
export const coverageScope = {
	provider: 'v8' as const,
	include: ['src/**/*.{ts,tsx}'],
	exclude: [
		'src/__tests__/**',
		'src/__benchmarks__/**',
		'src/docs/**',
		'src/docs-legacy/**',
		'src/index.ts',
	],
}
