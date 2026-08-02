import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'

const CI = Boolean(process.env.CI)

// Setup files for both jsdom projects (unit, integration).
const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

export default defineConfig({
	test: {
		environment: 'jsdom',
		// Vitest reserves a core for the main thread, so a pool defaults to one
		// fewer worker than the machine has cores — a jsdom suite this size leaves
		// ~15-20% of local wall on the table. jsdom setup and module eval spend
		// enough time in GC/async idle that scheduling a worker per core (not
		// core-minus-one) fills it without CPU oversubscription: no per-worker
		// slowdown toward the waitFor budget. CI keeps the default — its agents are
		// shared and noisier, and the scaled timeouts above assume that slack — so
		// this stays a local-only speedup.
		...(CI ? {} : { minWorkers: '100%', maxWorkers: '100%' }),
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
		// pin the zone so every machine renders the same wall-clock day. The
		// runtime *locale* cannot be pinned here — Node resolves ICU's default at
		// process start and `test.env` lands inside the worker afterwards, so it
		// would read as set and change nothing. The `test` scripts export `LANG`
		// ahead of Node instead.
		env: { TZ: 'UTC' },
		sequence: { shuffle: true },
		// The unit project runs `isolate: false`, so evaluated modules AND the jsdom
		// window are shared across a worker's files — cross-file bleed is possible
		// there, and these four options are what contain it. Within a file a
		// vi.spyOn or vi.stubGlobal outlives its test unless restored, and
		// sequence.shuffle randomizes sibling order — so an unrestored spy/stub
		// leaks into whichever test runs next. restoreMocks runs
		// vi.restoreAllMocks() before each test and unstubGlobals runs
		// vi.unstubAllGlobals(), both ahead of beforeEach so beforeEach/test-body
		// setup is reapplied untouched. mockRestore only reverts vi.spyOn() spies,
		// so the plain vi.fn() and Object.defineProperty jsdom stubs in setup/ are
		// left intact.
		restoreMocks: true,
		unstubGlobals: true,
		// clearMocks resets call history (not implementation — mockClear, not
		// mockReset) before each test, so the shared global mocks (motion, shiki,
		// floating-ui, …) never carry call counts across tests. unstubEnvs mirrors
		// unstubGlobals for vi.stubEnv. Deliberately NOT mockReset/resetModules:
		// the former wipes the global mock implementations, the latter drops the
		// shared module graph every later file in the worker would have to rebuild.
		clearMocks: true,
		unstubEnvs: true,
		reporters: CI ? ['default', 'junit'] : ['default'],
		outputFile: {
			junit: 'test-results/junit.xml',
		},
		// @tanstack/virtual-core's isScrolling debounce can outlive its test
		// file's jsdom environment; the late timer then throws "window is not
		// defined" from a virtual-core frame. The integration project isolates
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
					pool: 'threads',
					// `isolate: false` evaluates the setup files and the module graph
					// once per worker instead of once per file, which is where this
					// suite spent most of its time: measured over these 407 files,
					// setup fell 123.7s -> 6.5s and import 163.0s -> 37.9s, taking the
					// full three-project run from 143.4s to 97.7s. It also peaks lower
					// (1485MB against vmThreads' 2440MB), because vmThreads holds a VM
					// context per file — the reason that pool needed a vmMemoryLimit
					// recycle valve and this one does not.
					//
					// The price is a shared module registry and a shared jsdom window
					// across the ~100 files a worker runs. Two things pay for it. A
					// per-file `vi.mock` cannot survive a shared registry, and this
					// project has none — every one lives in `integration` below, which
					// keeps process isolation on forks. And nothing outlives a file:
					// `--detectAsyncLeaks` over the suite reported only RTL's own
					// act-settle timer, jsdom's selectionchange timer, and 0ms library
					// timers; a probe for surviving DOM singletons came back empty.
					// Verified green on six shuffle seeds.
					isolate: false,
					include: [
						'src/__tests__/**/*.test.{ts,tsx}',
						'src/docs/engine/__tests__/**/*.test.{ts,tsx}',
					],
					// The browser suite (vitest.browser.config.ts) verifies behaviour
					// jsdom can't — layout/colour geometry and, in its floating-ui
					// project, real-floating-engine focus trapping — so it may not
					// run under this jsdom config. The boundary/ suites run in the
					// two projects below.
					exclude: [
						...configDefaults.exclude,
						'src/__tests__/browser/**',
						'src/__tests__/boundary/**',
					],
				},
			},
			{
				extends: true,
				// Architectural boundary suites (*-boundary.test.ts): node:fs walks
				// over source text — no DOM, no React, no mocks. A plain node
				// environment on one shared worker strips the per-file fork + jsdom
				// + setup cost they'd pay in the integration project below, which
				// serializes into real wall clock on few-core CI agents.
				test: {
					name: 'boundary',
					environment: 'node',
					pool: 'threads',
					isolate: false,
					include: ['src/__tests__/boundary/*-boundary.test.ts'],
				},
			},
			{
				extends: true,
				// Integration suites: virtualizer, canvas, PDF, map — integrations
				// that schedule work past a test's lifetime or lean on jsdom's
				// edges — plus suites that vi.mock a shared source module
				// (use-chat-scroll) and need forks' per-file module graph for the
				// mock to stay authoritative. Process-isolated forks keep their
				// leakage from perturbing sibling files; everything else stays on
				// the fast shared-worker pool above.
				test: {
					name: 'integration',
					setupFiles,
					pool: 'forks',
					include: ['src/__tests__/boundary/**/*.test.{ts,tsx}'],
					exclude: [...configDefaults.exclude, '**/*-boundary.test.ts'],
				},
			},
		],
	},
})
