import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'
import { baseTest, setupFiles, testIsolation } from './vitest.base.config'

// Options shared by both jsdom projects; project-specific keys (pool,
// include) stay at the project so the split reads at a glance.
const jsdomProject = {
	...baseTest,
	...testIsolation,
	sequence: { shuffle: true },
	setupFiles,
}

export default defineConfig({
	test: {
		reporters: process.env.CI ? ['default', 'junit'] : ['default'],
		outputFile: {
			junit: 'test-results/junit.xml',
		},
		// @tanstack/virtual-core's isScrolling debounce can outlive its test
		// file's jsdom environment; the late timer then throws "window is not
		// defined". The boundary project isolates those suites per file, so
		// the stray timer only ever fires after its own file's teardown —
		// ignore exactly that error and keep every other unhandled error
		// fatal.
		onUnhandledError(error) {
			return !error.message?.includes('window is not defined')
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'cobertura'],
			reportsDirectory: 'coverage',
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/__tests__/**', 'src/__benchmarks__/**', 'src/docs/**', 'src/index.ts'],
		},
		projects: [
			{
				// The docs engine, pointed at ui, backs the `docs/*` integration
				// tests under src/__tests__/docs/ (the real component-modules map +
				// barrel tagging) and runs its own suite under
				// src/docs/engine/__tests__.
				plugins: [docsPlugin({ vitest: true })],
				test: {
					name: 'unit',
					...jsdomProject,
					pool: 'vmThreads',
					// Recycle a worker before its heap grows enough to slow jsdom
					// work into waitFor budgets — the vmThreads failure mode that
					// only shows on loaded CI agents.
					vmMemoryLimit: '512MB',
					include: [
						'src/__tests__/**/*.test.{ts,tsx}',
						'src/docs/engine/__tests__/**/*.test.{ts,tsx}',
					],
					// The browser suite (vitest.browser.config.ts) verifies behaviour
					// jsdom can't — layout/colour geometry and, in its floating-ui
					// project, real-floating-engine focus trapping — so it may not
					// run under this jsdom config. Boundary suites run in the
					// isolated project below.
					exclude: [
						...configDefaults.exclude,
						'src/__tests__/browser/**',
						'src/__tests__/boundary/**',
					],
				},
			},
			{
				// Environment-boundary suites — virtualizer, canvas, PDF, and map
				// integrations that schedule work past a test's lifetime or lean on
				// jsdom's edges. Process-isolated forks keep their leakage from
				// perturbing sibling files; everything else stays on the fast
				// shared-worker pool above.
				test: {
					name: 'boundary',
					...jsdomProject,
					pool: 'forks',
					include: ['src/__tests__/boundary/**/*.test.{ts,tsx}'],
				},
			},
		],
	},
})
