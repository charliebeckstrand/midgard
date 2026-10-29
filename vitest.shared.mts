/**
 * The test options that each package without a harness of its own shares.
 *
 * @remarks
 * A package spreads this object into the `test` field of its own Vitest config,
 * and adds only what differs. The file imports nothing, because the root
 * workspace does not install Vitest.
 *
 * Each spy, stubbed global, and stubbed variable is restored after its test, so
 * no case leaks into the next.
 *
 * The transformed modules stay on disk between runs, as in the ui config. Most
 * of the time of these suites is the transform and the import of ui and
 * shared, not the tests, and a warm cache removes most of the transform. The
 * option is experimental: re-read its release note on each Vitest bump.
 */
export const sharedTest = {
	include: ['src/__tests__/**/*.test.ts'],
	restoreMocks: true,
	unstubGlobals: true,
	unstubEnvs: true,
	experimental: { fsModuleCache: true },
}
