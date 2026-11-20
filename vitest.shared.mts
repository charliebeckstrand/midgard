/**
 * The test settings that each suite of the repository shares.
 *
 * @remarks
 * This file is the one source of these settings. The config of a package
 * spreads `sharedTest` into its `test` field, and adds only what differs. The
 * configs of ui (`packages/ui/vitest.base.ts`) take the parts one by one,
 * because each of its projects sets its own `include` and environment. The
 * file imports nothing, because the root workspace does not install Vitest.
 */

/** Whether the run is on CI, where the budgets scale up. */
export const CI = Boolean(process.env.CI)

/**
 * The cleanup before each test. A `vi.spyOn`, a `vi.stubGlobal`, or a
 * `vi.stubEnv` otherwise outlives its test, and the next test gets the leak.
 *
 * - `restoreMocks` reverts each `vi.spyOn` spy. It does not touch a plain
 *   `vi.fn()`, so the stubs of the setup files stay.
 * - `clearMocks` drops the call history of each mock, so a shared mock carries
 *   no count into the next test. It keeps the implementation. `mockReset` would
 *   remove the implementations of the shared mocks, so the runs do not set it.
 * - `unstubGlobals` and `unstubEnvs` revert `vi.stubGlobal` and `vi.stubEnv`.
 *
 * Each runs before `beforeEach`, so a hook or a test body applies its setup
 * again with no change. Thus a test file restores nothing itself.
 */
export const cleanup = {
	restoreMocks: true,
	clearMocks: true,
	unstubGlobals: true,
	unstubEnvs: true,
} as const

/**
 * A test that makes no assertion fails (CONVENTIONS.md §10.12). Its body ran,
 * but nothing checked the result, so the pass says nothing. A type assertion
 * (`expectTypeOf`) does not count, because it does nothing at run time: the
 * type cases live in `*.test-d.ts` files, which `check-types` reads and Vitest
 * does not run.
 *
 * The option goes in the `expect` field of `test`. Vitest ignores a
 * `requireAssertions` at the top level of `test`.
 */
export const assertions = { requireAssertions: true } as const

/**
 * The time budgets of a node or jsdom suite. The speed of the machine must
 * change when a test passes, never whether it passes. A CI agent is slower and
 * noisier than a dev machine, so the budgets are larger on CI.
 *
 * `asyncUtilTimeout` is the budget of `waitFor` and `findBy` of Testing
 * Library. A suite that uses them gives it to Testing Library in a setup file
 * (`configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })`). It stays
 * well below `testTimeout`, so a stuck wait fails with the last error of its
 * callback, and not as a test timeout.
 */
export const budgets = {
	testTimeout: CI ? 15_000 : 5_000,
	provide: { asyncUtilTimeout: CI ? 4_000 : 1_000 },
}

/**
 * The time zone of each run. A test that makes a local-time date
 * (`new Date(y, m, d)`) then gives the same day on each machine. The runtime
 * locale cannot be pinned here: Node reads the default of ICU when the process
 * starts, and `test.env` comes into the worker after that. The `test` scripts
 * of ui export `LANG` before Node starts.
 */
export const env = { TZ: 'UTC' }

const SEED = process.env.VITEST_SEED

if (SEED !== undefined && !Number.isFinite(Number(SEED))) {
	throw new Error(
		`VITEST_SEED must be a number; received ${SEED}. A NaN seed corrupts the shuffle.`,
	)
}

/**
 * A shuffled order of the files and of the cases in each file, so that an
 * order dependency fails early. Each run takes a new seed, and the run prints
 * it. Replay a red run with `VITEST_SEED=<seed>`, never with
 * `--sequence.seed`: in ui, a flag on the command line replaces the sequence of
 * each project (`packages/ui/vitest.config.ts`).
 *
 * An app once kept the history record of a Drawer in module scope, and a case
 * read the record of the case before it. The order of the file hid the
 * dependency until a shuffle found it.
 */
export const sequence = { shuffle: true, ...(SEED ? { seed: Number(SEED) } : {}) }

/**
 * The test options of a package without a harness of its own: an app, `auth`,
 * or `shared`.
 *
 * The transformed modules stay on disk between runs, as in ui. Most of the time
 * of these suites is the transform and the import of ui and shared, not the
 * tests, and a warm cache removes most of the transform. Vitest 5 turns the
 * cache on by default. The option stays here because the first shard of the
 * `test` job in CI saves these entries with the cache of ui (ci.yml).
 */
export const sharedTest = {
	include: ['src/__tests__/**/*.test.{ts,tsx}'],
	env,
	...cleanup,
	expect: assertions,
	fsModuleCache: true,
	sequence,
	...budgets,
}
