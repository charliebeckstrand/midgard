// Settings shared between vitest.config.ts (tests) and vitest.bench.config.ts
// (benchmarks) so they can't drift apart silently.
export const baseTest = {
	environment: 'jsdom' as const,
	globals: true,
	css: false,
}
