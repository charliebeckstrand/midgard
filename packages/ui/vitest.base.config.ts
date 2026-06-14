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
