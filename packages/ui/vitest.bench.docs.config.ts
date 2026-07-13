import { defineConfig } from 'vitest/config'

// Docs-engine benchmarks: ts-morph project construction and API extraction.
// Split from vitest.bench.config.ts because each file pays a multi-second
// ts-morph Project setup (and buildApi iterations run ~10s each at baseline) —
// far too heavy to ride along with the component bench suite.
export default defineConfig({
	test: {
		environment: 'node',
		benchmark: {
			include: ['src/__benchmarks__/docs/**/*.bench.ts'],
		},
	},
})
