import { defineConfig } from 'vitest/config'
import { baseTest } from './vitest.base.config'

export default defineConfig({
	test: {
		...baseTest,
		setupFiles: ['./src/__benchmarks__/setup.ts'],
		include: ['src/__benchmarks__/**/*.bench.{ts,tsx}'],
		benchmark: {
			include: ['src/__benchmarks__/**/*.bench.{ts,tsx}'],
			reporters: ['default'],
		},
	},
})
