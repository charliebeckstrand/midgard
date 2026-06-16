// Settings shared between vitest.config.ts (tests) and vitest.bench.config.ts
// (benchmarks) so they can't drift apart silently.
export const baseTest = {
	environment: 'jsdom' as const,
	globals: true,
	css: false,
}

// Setup files for the default project (vitest.config.ts).
export const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

// Per-test isolation for the default project (vitest.config.ts). The vmThreads
// pool resets the module graph per file, but within a
// file a vi.spyOn or vi.stubGlobal outlives its test unless restored, and
// sequence.shuffle randomizes sibling order — so an unrestored spy/stub leaks
// into whichever test runs next. restoreMocks runs vi.restoreAllMocks() before
// each test and unstubGlobals runs vi.unstubAllGlobals(), both ahead of
// beforeEach so beforeEach/test-body setup is reapplied untouched. mockRestore
// only reverts vi.spyOn() spies, so the plain vi.fn() and Object.defineProperty
// jsdom stubs in setup/ are left intact.
export const testIsolation = {
	restoreMocks: true,
	unstubGlobals: true,
}
