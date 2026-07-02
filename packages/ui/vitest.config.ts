import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'

const CI = Boolean(process.env.CI)

// Setup files for both jsdom projects (unit, boundary).
const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		// Machine speed must change when a test passes, never whether it passes:
		// CI agents are slower and noisier than dev machines, so wall-clock
		// budgets scale up there. asyncUtilTimeout is RTL's waitFor/findBy budget,
		// injected by src/__tests__/setup/index.ts; it stays well below
		// testTimeout so a stuck wait fails as an RTL timeout carrying the
		// callback's last error, not an opaque test timeout.
		testTimeout: CI ? 15_000 : 5_000,
		hookTimeout: CI ? 15_000 : 10_000,
		provide: { asyncUtilTimeout: CI ? 4_000 : 1_000 },
		// Date/calendar tests construct local-time dates (`new Date(y, m, d)`);
		// pin the zone so every machine renders the same wall-clock day.
		env: { TZ: 'UTC' },
		sequence: { shuffle: true },
		// Pools reset the module graph per file, but within a file a vi.spyOn or
		// vi.stubGlobal outlives its test unless restored, and sequence.shuffle
		// randomizes sibling order — so an unrestored spy/stub leaks into
		// whichever test runs next. restoreMocks runs vi.restoreAllMocks() before
		// each test and unstubGlobals runs vi.unstubAllGlobals(), both ahead of
		// beforeEach so beforeEach/test-body setup is reapplied untouched.
		// mockRestore only reverts vi.spyOn() spies, so the plain vi.fn() and
		// Object.defineProperty jsdom stubs in setup/ are left intact.
		restoreMocks: true,
		unstubGlobals: true,
		reporters: CI ? ['default', 'junit'] : ['default'],
		outputFile: {
			junit: 'test-results/junit.xml',
		},
		// @tanstack/virtual-core's isScrolling debounce can outlive its test
		// file's jsdom environment; the late timer then throws "window is not
		// defined" from a virtual-core frame. The boundary project isolates
		// those suites per file, so the stray timer only ever fires after its
		// own file's teardown — ignore exactly that error (message and a
		// virtual-core stack frame together) so a same-message error from any
		// other source stays fatal.
		onUnhandledError(error) {
			return !(
				error.message?.includes('window is not defined') && error.stack?.includes('virtual-core')
			)
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'cobertura'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/__tests__/**', 'src/__benchmarks__/**', 'src/docs/**', 'src/index.ts'],
		},
		projects: [
			{
				extends: true,
				// The docs engine, pointed at ui, backs the `docs/*` integration
				// tests under src/__tests__/docs/ (the real component-modules map +
				// barrel tagging) and runs its own suite under
				// src/docs/engine/__tests__.
				plugins: [docsPlugin({ vitest: true })],
				test: {
					name: 'unit',
					setupFiles,
					pool: 'vmThreads',
					// Recycle a worker before its heap grows enough to slow jsdom
					// work into waitFor budgets — the vmThreads failure mode that
					// only shows on loaded CI agents. 1GB rather than tighter: each
					// recycle re-imports the worker's whole module graph, which
					// dominates wall clock when a few-core agent runs the suite
					// through a single worker.
					vmMemoryLimit: '1GB',
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
				extends: true,
				// Architectural rule suites (*-boundary.test.ts): node:fs walks over
				// source text — no DOM, no React, no mocks. A plain node environment
				// on one shared worker strips the per-file fork + jsdom + setup cost
				// they paid in the forks project, which serializes into real wall
				// clock on few-core CI agents.
				test: {
					name: 'rules',
					environment: 'node',
					pool: 'threads',
					isolate: false,
					include: ['src/__tests__/boundary/*-boundary.test.ts'],
				},
			},
			{
				extends: true,
				// Environment-boundary suites: virtualizer, canvas, PDF, map —
				// integrations that schedule work past a test's lifetime or lean on
				// jsdom's edges. Process-isolated forks keep their leakage from
				// perturbing sibling files; everything else stays on the fast
				// shared-worker pool above.
				test: {
					name: 'boundary',
					setupFiles,
					pool: 'forks',
					include: ['src/__tests__/boundary/**/*.test.{ts,tsx}'],
					exclude: [...configDefaults.exclude, '**/*-boundary.test.ts'],
				},
			},
		],
	},
})
