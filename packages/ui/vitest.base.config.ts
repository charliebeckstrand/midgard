// Shared foundation for every Vitest entry point in this package —
// vitest.config.ts (unit + boundary projects) and vitest.bench.config.ts
// (benchmarks) compose these exports so they can't drift apart silently.

const CI = Boolean(process.env.CI)

export const baseTest = {
	environment: 'jsdom' as const,
	globals: true,
	css: false,
	// Machine speed must change when a test passes, never whether it passes:
	// CI agents are slower and noisier than dev machines, so wall-clock
	// budgets scale up there. RTL's waitFor/findBy budget scales in step
	// (src/__tests__/setup/index.ts) and must stay below testTimeout.
	testTimeout: CI ? 15_000 : 5_000,
	hookTimeout: CI ? 15_000 : 10_000,
	// Date/calendar tests construct local-time dates (`new Date(y, m, d)`);
	// pin the zone so every machine renders the same wall-clock day.
	env: { TZ: 'UTC' },
}

// Setup files for both jsdom projects (vitest.config.ts).
export const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

// Per-test isolation for both jsdom projects (vitest.config.ts). Pools reset
// the module graph per file, but within a file a vi.spyOn or vi.stubGlobal
// outlives its test unless restored, and sequence.shuffle randomizes sibling
// order — so an unrestored spy/stub leaks into whichever test runs next.
// restoreMocks runs vi.restoreAllMocks() before each test and unstubGlobals
// runs vi.unstubAllGlobals(), both ahead of beforeEach so beforeEach/test-body
// setup is reapplied untouched. mockRestore only reverts vi.spyOn() spies, so
// the plain vi.fn() and Object.defineProperty jsdom stubs in setup/ are left
// intact.
export const testIsolation = {
	restoreMocks: true,
	unstubGlobals: true,
}
