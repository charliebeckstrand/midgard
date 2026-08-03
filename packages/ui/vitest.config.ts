import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'

const CI = Boolean(process.env.CI)

const SEED = process.env.VITEST_SEED

if (SEED !== undefined && !Number.isFinite(Number(SEED))) {
	throw new Error(
		`VITEST_SEED must be a number; received ${SEED}. A NaN seed corrupts the shuffle.`,
	)
}

const sequence = { shuffle: true, ...(SEED ? { seed: Number(SEED) } : {}) }

// Setup files for both jsdom projects (unit, integration).
const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

export default defineConfig({
	test: {
		environment: 'jsdom',
		// Vitest caps a pool at one fewer worker than the machine has cores. Local
		// runs lift the cap to one per core; CI keeps the default, because its
		// agents are shared and the scaled timeouts below assume that slack.
		//
		// Measured at 4 cores, where the extra worker is clearly worth it. It buys
		// less as the count rises: under `isolate: false` each worker pays for its
		// own module graph, so the gain from one more shrinks while that cost stays
		// flat. Re-measure before you trust this on a much larger machine.
		...(CI ? {} : { maxWorkers: '100%' }),
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
		// `shuffle` selects RandomSequencer, which drops the project grouping
		// BaseSequencer applies. Every project's files then land in one queue, and
		// a worker is terminated at each crossing — along with the module graph
		// `isolate: false` exists to keep. Each project below takes its
		// `groupOrder` from its position in the array — unit, then boundary, then
		// integration — which restores the grouping; the shuffle still applies
		// inside each group. Deriving it means a new project can neither omit the
		// field nor collide with a sibling, and a project that set it alone would
		// replace the resolved sequence rather than extend it, losing `shuffle`
		// and `seed`.
		//
		// Replay a red run with `VITEST_SEED=<seed> pnpm test`, never with
		// `--sequence.seed`: a CLI override is shallow-merged over each project's
		// `test` block, so it replaces the resolved sequence object and drops
		// `groupOrder` with it — which reorders the very queue the failure came
		// from.
		sequence,
		// Within a file a vi.spyOn or vi.stubGlobal outlives its test unless
		// restored, and sequence.shuffle randomizes sibling order — so an
		// unrestored spy or stub leaks into whichever test runs next. restoreMocks
		// runs vi.restoreAllMocks() before each test and unstubGlobals runs
		// vi.unstubAllGlobals(), both ahead of beforeEach so the setup in
		// beforeEach and in the test body is reapplied untouched. mockRestore only reverts
		// vi.spyOn() spies, so the plain vi.fn() and Object.defineProperty jsdom
		// stubs in setup/ are left intact.
		restoreMocks: true,
		unstubGlobals: true,
		// clearMocks resets call history (not implementation — mockClear, not
		// mockReset) before each test, so the shared global mocks (motion, shiki,
		// floating-ui, …) never carry call counts across tests. unstubEnvs mirrors
		// unstubGlobals for vi.stubEnv. Deliberately NOT mockReset/resetModules —
		// the former wipes the global mock implementations, and the latter is
		// barred outright; see the unit project below.
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
				extends: true as const,
				// The docs engine, pointed at ui, backs the `docs/*` integration
				// tests under src/__tests__/docs/ (the real component-modules map +
				// barrel tagging) and runs its own suite under
				// src/docs/engine/__tests__.
				plugins: [docsPlugin({ vitest: true })],
				test: {
					name: 'unit',
					setupFiles,
					pool: 'threads',
					// `isolate: false` keeps the evaluated module graph across a
					// worker's files, and does not rebuild it for each one. That
					// rebuild is where this suite spent most of its time.
					//
					// The price is a shared module registry and a shared jsdom window
					// across the files a worker runs. No file here can declare a
					// per-file `vi.mock` or call `vi.resetModules()`: see
					// `src/__tests__/setup/module-mocks.ts` for the global doubles it
					// replaces, and `test-isolation-boundary.test.ts`, which enforces
					// the rule. The suites that need their own mock live in
					// `integration` below, which keeps process isolation on forks.
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
				extends: true as const,
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
					// These suites run no setupFiles, so the shared budget above governs
					// them by a rationale they never inherit: it is sized against
					// `asyncUtilTimeout`, and nothing here awaits anything. Every body in
					// the project is synchronous, which also means the budget cannot
					// interrupt one — a scan that never returns holds the runner's timer
					// with it. What it can do is fail a slow run, and the pre-push gate
					// makes runs slow: `lefthook` drives `check-types` and `test:changed`
					// through `turbo` at once, so a `tsc` pass competes with these for the
					// same cores. `tsdoc-coverage-boundary` builds a TypeScript program
					// and crossed the 5s default there on contention alone, which the
					// note above says a budget must never encode. Flat and wide, then:
					// the project's median is 72ms, so a budget this size fails only work
					// that has genuinely stopped moving.
					testTimeout: 30_000,
				},
			},
			{
				extends: true as const,
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
		].map((project, groupOrder) => ({
			...project,
			test: { ...project.test, sequence: { ...sequence, groupOrder } },
		})),
	},
})
