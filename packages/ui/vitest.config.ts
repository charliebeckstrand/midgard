import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Plugin } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import {
	docblockEnvironment,
	docsTestDir,
	srcRelative,
	walkSource,
} from './src/__tests__/helpers/walk-source.ts'
import { reactDocs } from './src/docs/plugin/index.ts'
import { assertions, CI, cleanup, coverageScope, sequence } from './vitest.base.ts'

// The test files that open with `// @vitest-environment node`: the `pure`
// project runs exactly these, and `unit` excludes them. The scan skips
// `geometry/`, which the `geometry` project runs by path. The docblock is the
// one declaration (Vitest reads it too) and this scan turns it into a
// project so the runner groups the files by `groupOrder`. Under
// `isolate: false` a worker keeps its environment and module graph only while
// the environment stays the same; left in `unit`, the shuffle interleaved
// these files with the jsdom ones and every crossing rebuilt both, measured at
// twice the suite's wall clock.
function nodeEnvironmentFiles(): string[] {
	const files: string[] = []

	for (const dir of [join(import.meta.dirname, 'src/__tests__'), docsTestDir]) {
		walkSource(
			dir,
			(file, content) => {
				if (/\.test\.tsx?$/.test(file) && docblockEnvironment(content) === 'node') {
					files.push(relative(import.meta.dirname, file))
				}
			},
			new Set(['browser', 'boundary', 'compiler', 'docs-build', 'geometry']),
		)
	}

	return files.sort()
}

const nodeFiles = nodeEnvironmentFiles()

// The boundary suites that read files outside this package: the rule documents,
// the agent definitions, the Dockerfiles, `package.json`, and the lockfile at the
// repository root, the Biome plugins, and the sources of the apps and of the
// other packages. They run as the `workspace` project, which the
// `test:workspace` task of turbo runs with those files as its inputs. Thus an
// edit outside ui does not clear the cache of the whole ui suite.
const workspaceScans = [
	'src/__tests__/boundary/app-gap-boundary.test.ts',
	'src/__tests__/boundary/biome-plugin-boundary.test.ts',
	'src/__tests__/boundary/cadence-boundary.test.ts',
	'src/__tests__/boundary/controlled-language-boundary.test.ts',
	'src/__tests__/boundary/dockerfile-pin-boundary.test.ts',
	'src/__tests__/boundary/drag-cursor-boundary.test.ts',
	'src/__tests__/boundary/inline-scroll-boundary.test.ts',
	'src/__tests__/boundary/recipe-boundary.test.ts',
]

// The settings of the two projects that scan source text: `boundary` and
// `workspace`. Each project also declares `isolate: false` itself, because
// `test-isolation-boundary.test.ts` reads that line in each project.
//
// The suites run no setupFiles, so the shared budget below governs them by a
// rationale they never inherit: it is sized against `asyncUtilTimeout`, and
// nothing here awaits anything. Every body in the project is synchronous, which
// also means the budget cannot interrupt one: a scan that never returns holds
// the runner's timer with it. What it can do is fail a slow run, and the
// pre-push gate makes runs slow: `lefthook` drives `check-types` and
// `test:changed` through `turbo` at once, so a `tsc` pass competes with these
// for the same cores. `tsdoc-coverage-boundary` builds a TypeScript program and
// crossed the 5s default there on contention alone, which the note below says a
// budget must never encode. Flat and wide, then: a typical file of the project
// takes a small part of it, so a budget this size fails only work that has
// genuinely stopped moving.
//
// A suite that opens a TypeScript project, or parses a tree, does that scan at
// collection, in the body of its `describe`, and each case asserts on the
// result. Collection runs under no budget. In a case, the scan counts against
// the budget of whichever case runs first, and in a `beforeAll` it counts
// against the shorter budget of a hook.
const nodeScan = {
	environment: 'node',
	pool: 'threads',
	testTimeout: 30_000,
} as const

// Vitest keeps no module on disk that calls `import.meta.glob(`, because the
// result depends on the files that the glob matches. The check reads that
// exact text, so a typed call such as `import.meta.glob<Record<string, unknown>>(`
// passes it, and the cache keeps the old expansion. After a rename of a kata
// file, the cached `default-value-boundary.test.ts` then imports a file that is
// gone. CI restores the cache, so the failure also occurs there. This generator
// keeps each glob call out of the cache, typed or not.
const typedGlob = /import\.meta\.glob\s*</

function skipGlobCache({ sourceCode }: { sourceCode: string }): false | undefined {
	return typedGlob.test(sourceCode) ? false : undefined
}

const globCache: Plugin = {
	name: 'midgard:glob-cache',
	configureVitest({ defineCacheKeyGenerator }) {
		defineCacheKeyGenerator(skipGlobCache)
	},
}

// A bare `ui/*` import resolves through the `exports` map of `package.json`.
// Vitest keys a cached module on its own text and on the config, and not on
// that map. So after a change to the map, a module with the same text keeps
// the old resolution. When `form` became a module, each docs page that imports
// `ui/form` kept the path of the old component. That folder was gone, and the
// pages failed in CI too. This generator adds the map to the key of each module
// that imports `ui/*`, so a change to the map makes those keys miss.
const UI_EXPORTS = JSON.stringify(
	(
		JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
			exports: unknown
		}
	).exports,
)

const uiSpecifier = /['"]ui\//

function keyOnExports({ sourceCode }: { sourceCode: string }): string | undefined {
	return uiSpecifier.test(sourceCode) ? UI_EXPORTS : undefined
}

const exportsCache: Plugin = {
	name: 'midgard:exports-cache',
	configureVitest({ defineCacheKeyGenerator }) {
		defineCacheKeyGenerator(keyOnExports)
	},
}

// Setup files for both jsdom projects (unit, integration). The first one also
// gives `expect` the geometry matchers (`setup/geometry.ts`).
const setupFiles = [
	'./src/__tests__/setup/index.ts',
	'./src/__tests__/setup/console-guard.ts',
	'./src/__tests__/setup/module-mocks.ts',
	'./src/__tests__/setup/restore-prototype-focus.ts',
]

export default defineConfig({
	plugins: [globCache, exportsCache],
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
		expect: assertions,
		// Keep the transformed module graph on disk between runs. A warm cache cuts
		// most of the transform time of the `unit` project, and much of its import
		// time. The cache lives under the workspace root's node_modules. CI keys it
		// on the turbo hash of the packages that ui resolves (ci.yml), so a change
		// to those packages starts a cold cache. Vitest 5 turns the cache on by
		// default. The option stays here because the cache of CI depends on it.
		fsModuleCache: true,
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
		// runtime *locale* cannot be pinned here: Node resolves ICU's default at
		// process start and `test.env` lands inside the worker afterwards, so it
		// would read as set and change nothing. The `test` scripts export `LANG`
		// ahead of Node instead.
		env: { TZ: 'UTC' },
		// Vitest processes no CSS, and it gives each CSS import an empty module.
		// An import with `?url` does not want the CSS but its URL, so it goes to
		// Vite, which gives the path of the file, as the dev server does. Without
		// it, the docs shell (`app/root.tsx`) renders its stylesheet link with an
		// empty `href`, and React warns.
		css: { include: [/\.css\?url$/] },
		// `shuffle` selects RandomSequencer, which drops the project grouping
		// BaseSequencer applies. Every project's files then land in one queue, and
		// a worker is terminated at each crossing: along with the module graph
		// `isolate: false` exists to keep. Each project below takes its
		// `groupOrder` from its position in the array (unit, pure, boundary,
		// workspace, integration, then geometry) which restores the grouping; the shuffle still applies
		// inside each group. Deriving it means a new project can neither omit the
		// field nor collide with a sibling, and a project that set it alone would
		// replace the resolved sequence rather than extend it, losing `shuffle`
		// and `seed`.
		//
		// Replay a red run with `VITEST_SEED=<seed> pnpm test`, never with
		// `--sequence.seed`: a CLI override is shallow-merged over each project's
		// `test` block, so it replaces the resolved sequence object and drops
		// `groupOrder` with it, which reorders the very queue the failure came
		// from.
		sequence,
		// See `vitest.base.ts`. `resetModules` is barred too; see the unit project
		// below.
		...cleanup,
		reporters: CI ? ['default', 'junit'] : ['default'],
		outputFile: {
			junit: 'test-results/junit.xml',
		},
		// `test:coverage` merges this report with the report of the browser run.
		coverage: { ...coverageScope, reporter: ['text', 'cobertura'] },
		projects: [
			{
				extends: true as const,
				// The suite of the docs app, under src/docs/__tests__, runs here too.
				// The pages import the virtual modules of the docs plugin, so the
				// smoke test of the pages (`page-smoke.test.tsx`) needs the real
				// plugin. The plugin transforms only the files of `pages/`, and it
				// loads a virtual module only when a test imports one. Thus it costs
				// the other suites almost nothing.
				plugins: [reactDocs()],
				test: {
					name: 'unit',
					// The grid modules load before each file of this project only (see
					// `setup/grid-modules.ts`).
					setupFiles: [...setupFiles, './src/__tests__/setup/grid-modules.ts'],
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
						`src/${srcRelative(docsTestDir)}/**/*.test.{ts,tsx}`,
					],
					// The browser suite (vitest.browser.config.ts) verifies behavior
					// jsdom can't (layout/color geometry and, in its floating-ui
					// project, real-floating-engine focus trapping) so it may not
					// run under this jsdom config. The compiler/ suite runs only in
					// the compiled run (vitest.compiler.config.ts), and the
					// docs-build/ suite only after the docs build
					// (vitest.docs-build.config.ts). The boundary/
					// suites run in the two projects below, the node-docblock
					// files in `pure`, and the geometry/ suites in `geometry`.
					exclude: [
						...configDefaults.exclude,
						'src/__tests__/browser/**',
						'src/__tests__/compiler/**',
						'src/__tests__/docs-build/**',
						'src/__tests__/boundary/**',
						'src/__tests__/geometry/**',
						...nodeFiles,
					],
				},
			},
			{
				extends: true as const,
				// Pure-function suites, selected by their `// @vitest-environment
				// node` docblock (see `nodeEnvironmentFiles` above): a plain node
				// environment on one shared worker, with no jsdom, no module
				// doubles, and no RTL setup. The setup is the locale guard, because
				// the format tests live here, the geometry matchers, which each
				// project gives to `expect`, and the restore after each test. A file here cannot reach the
				// shared jsdom window by accident, and
				// `node-environment-boundary.test.ts` keeps the docblock and the
				// file's DOM use in step both ways.
				test: {
					name: 'pure',
					environment: 'node',
					pool: 'threads',
					isolate: false,
					setupFiles: [
						'./src/__tests__/setup/locale-guard.ts',
						'./src/__tests__/setup/geometry.ts',
						'./src/__tests__/setup/restore.ts',
						'./src/__tests__/setup/console-guard.ts',
					],
					include: nodeFiles,
				},
			},
			{
				extends: true as const,
				// Architectural boundary suites (*-boundary.test.ts): node:fs walks
				// over source text, no DOM, no React, no mocks. A plain node
				// environment on one shared worker strips the per-file fork + jsdom
				// + setup cost they'd pay in the integration project below, which
				// serializes into real wall clock on few-core CI agents.
				test: {
					name: 'boundary',
					...nodeScan,
					isolate: false,
					include: ['src/__tests__/boundary/*-boundary.test.ts'],
					exclude: [...configDefaults.exclude, ...workspaceScans],
				},
			},
			{
				extends: true as const,
				// The boundary suites in `workspaceScans`, with the settings of `boundary`.
				test: {
					name: 'workspace',
					...nodeScan,
					isolate: false,
					include: workspaceScans,
				},
			},
			{
				extends: true as const,
				// Integration suites: the ones that vi.mock a shared source module
				// (map-points-render) and need forks' per-file module graph for
				// the mock to stay authoritative. A suite that needs a cold
				// module registry belongs here too: `vi.resetModules()` is barred
				// in the shared-registry projects, so a case that must re-evaluate
				// a module to empty its module-scope state
				// (code-block-load-shiki, for the worker and the memo cells of
				// `code-shiki`) cannot run above. A
				// suite that sets `process.env.TZ` belongs here too: a worker thread
				// keeps the zone it started with, and a fork reads the change
				// (chart-time-zone).
				//
				// Nothing else belongs here. Each file here pays a fork and a
				// fresh jsdom, which the pool above pays once per worker. The
				// virtualizer, canvas, and PDF suites that declare no mock ran
				// here once, and they pass on the shared window: the residue
				// guard holds them to its terms. Moving those files shortened the
				// jsdom run.
				test: {
					name: 'integration',
					setupFiles,
					pool: 'forks',
					include: ['src/__tests__/boundary/**/*.test.{ts,tsx}'],
					exclude: [...configDefaults.exclude, '**/*-boundary.test.ts'],
				},
			},
			{
				extends: true as const,
				// Computational geometry (src/__tests__/geometry/): the pure
				// functions that turn coordinates, boxes, and shapes into other
				// coordinates, boxes, and shapes. Map projection, winding, and
				// topology, the chart scales and marks, and the dashboard layout
				// are examples. It has the settings of `pure`: a plain node
				// environment on one shared worker. The layout geometry that needs
				// a real engine runs in the `geometry` instance of
				// vitest.browser.config.ts. `pnpm test:geometry` runs the two.
				//
				// Each file still opens with `// @vitest-environment node`, so
				// `node-environment-boundary.test.ts` keeps the file clear of the
				// DOM. The project is last in the array, so the `groupOrder` of
				// each project above stays the same.
				test: {
					name: 'geometry',
					environment: 'node',
					pool: 'threads',
					isolate: false,
					setupFiles: [
						'./src/__tests__/setup/locale-guard.ts',
						'./src/__tests__/setup/geometry.ts',
						'./src/__tests__/setup/restore.ts',
						'./src/__tests__/setup/console-guard.ts',
					],
					include: ['src/__tests__/geometry/**/*.test.ts'],
				},
			},
		].map((project, groupOrder) => ({
			...project,
			test: { ...project.test, sequence: { ...sequence, groupOrder } },
		})),
	},
})
