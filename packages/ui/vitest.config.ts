import { docsPlugin } from 'docs/plugins'
import { configDefaults, defineConfig } from 'vitest/config'
import { baseTest, setupFiles, testIsolation } from './vitest.base.config'

export default defineConfig({
	// The docs engine, pointed at ui, backs the `docs/*` integration tests under
	// src/__tests__/docs/ (the real component-modules map + barrel tagging).
	plugins: [docsPlugin({ vitest: true })],
	test: {
		...baseTest,
		...testIsolation,
		pool: 'vmThreads',
		sequence: { shuffle: true },
		setupFiles,
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		// The browser suite (vitest.browser.config.ts) verifies behaviour jsdom
		// can't — layout/colour geometry and, in its floating-ui project,
		// real-floating-engine focus trapping — so it may not run under this
		// jsdom config.
		exclude: [...configDefaults.exclude, 'src/__tests__/browser/**'],
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
