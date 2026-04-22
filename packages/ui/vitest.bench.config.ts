import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/__benchmarks__/setup.ts'],
		include: ['src/__benchmarks__/**/*.bench.{ts,tsx}'],
		css: false,
		benchmark: {
			include: ['src/__benchmarks__/**/*.bench.{ts,tsx}'],
			reporters: ['default'],
		},
	},
})
