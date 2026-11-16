/**
 * The test options that each package without a harness of its own shares.
 *
 * @remarks
 * A package spreads this object into the `test` field of its own Vitest config,
 * and adds only what differs. The file imports nothing, because the root
 * workspace does not install Vitest.
 *
 * Each spy, stubbed global, and stubbed variable is restored after its test, and
 * the call history of each mock is cleared, so no case leaks into the next. A
 * module mock keeps its implementation. These are the cleanup options of the ui
 * runs (`packages/ui/vitest.base.ts`), so a test file restores nothing itself.
 *
 * A test that makes no assertion fails, as in ui.
 *
 * The transformed modules stay on disk between runs, as in the ui config. Most
 * of the time of these suites is the transform and the import of ui and
 * shared, not the tests, and a warm cache removes most of the transform.
 * Vitest 5 turns the cache on by default. The option stays here because the
 * second shard of the `test` job in CI saves these entries with the cache of
 * ui (ci.yml).
 *
 * The speed of the machine must change when a test passes, never whether it
 * passes. A CI agent is slower than a dev machine, and the first render of a
 * test file also imports ui, so the time budgets are larger on CI, as in the ui
 * config. `asyncUtilTimeout` is the budget of `waitFor` and `findBy` of Testing
 * Library. A package that uses them gives it to Testing Library in a setup file
 * (`configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })`). It stays well
 * below `testTimeout`, so a stuck wait fails with the last error of its
 * callback.
 */
const CI = Boolean(process.env.CI)

export const sharedTest = {
	include: ['src/__tests__/**/*.test.ts'],
	restoreMocks: true,
	clearMocks: true,
	unstubGlobals: true,
	unstubEnvs: true,
	fsModuleCache: true,
	requireAssertions: true,
	testTimeout: CI ? 15_000 : 5_000,
	provide: { asyncUtilTimeout: CI ? 4_000 : 1_000 },
}
