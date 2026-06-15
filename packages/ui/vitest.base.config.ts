// Settings shared between vitest.config.ts (tests) and vitest.bench.config.ts
// (benchmarks) so they can't drift apart silently.
export const baseTest = {
	environment: 'jsdom' as const,
	globals: true,
	css: false,
}

// Setup files shared by the default project (vitest.config.ts) and the MCP
// harness project (vitest.mcp.config.ts) so the two can't drift apart.
export const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

// Per-test isolation, shared by the same two projects. The vmThreads pool gives
// each test file a fresh module graph, but within a file a vi.spyOn or
// vi.stubGlobal persists across siblings unless restored — and sequence.shuffle
// makes that sibling order nondeterministic, so an unrestored spy/stub leaks
// into whichever test runs next. restoreMocks reverts every spy to its original
// before each test; unstubGlobals reverts vi.stubGlobal. Both run before
// beforeEach, so beforeEach-configured mocks are reapplied and unaffected. (The
// global jsdom stubs in setup/jsdom-stubs.ts use Object.defineProperty, not
// vi.stubGlobal, so unstubGlobals leaves them intact.)
export const testIsolation = {
	restoreMocks: true,
	unstubGlobals: true,
}
