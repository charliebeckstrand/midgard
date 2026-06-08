import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/plugins'
import { baseTest } from './vitest.base.config'

export default defineConfig({
	plugins: [docsPlugin({ vitest: true })],
	test: {
		...baseTest,
		pool: 'vmThreads',
		sequence: { shuffle: true },
		setupFiles: ['./src/__tests__/setup/index.ts', './src/__tests__/setup/module-mocks.ts'],
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		// The browser suites verify behaviour jsdom can't — layout/colour geometry
		// (vitest.browser.config.ts) and real-floating-engine focus trapping
		// (vitest.browser-real.config.ts) — so neither may run under this jsdom config.
		exclude: [
			...configDefaults.exclude,
			'src/__tests__/browser/**',
			'src/__tests__/browser-real/**',
		],
		reporters: process.env.CI ? ['default', 'junit'] : ['default'],
		outputFile: {
			junit: 'test-results/junit.xml',
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'cobertura'],
			reportsDirectory: 'coverage',
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/__tests__/**', 'src/__benchmarks__/**', 'src/docs/**', 'src/index.ts'],
		},
	},
})
