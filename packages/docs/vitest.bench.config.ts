import { defineConfig } from 'vitest/config'

// Benchmarks run in a bare node environment and mock `virtual:component-modules`
// inline, so the docs plugin isn't wired in here.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/__benchmarks__/**/*.bench.{ts,tsx}'],
		benchmark: {
			include: ['src/__benchmarks__/**/*.bench.{ts,tsx}'],
			reporters: ['default'],
		},
	},
})
