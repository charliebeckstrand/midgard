import { resolve } from 'node:path'
import { optimize } from '@tailwindcss/node'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import type { Plugin } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'
import { CI, cleanup, coverageScope, sequence } from './vitest.base'

/**
 * The factor by which a wall-clock budget of the browser suite scales on CI:
 * the time limit of a case and of a hook, and each `budget()` wait.
 */
const BUDGET_FACTOR = CI ? 2 : 1

/** The CSS of this package, and not the CSS of a dependency. */
const PACKAGE_CSS = /^(?!.*[\\/]node_modules[\\/]).*\.css(?:\?(?!.*\b(?:raw|url)\b).*)?$/

/**
 * Tailwind for the browser suites, with the served CSS lowered as a build
 * lowers it.
 *
 * @remarks
 * `@tailwindcss/vite` runs Lightning CSS (`optimize`) in `build` only. In
 * `serve`, which Vitest browser mode uses, the CSS keeps its native nesting. A
 * variant such as `**:data-[slot=label]:font-medium` then reaches the browser as
 * `.x { :is(& *) { &[data-slot=label] { … } } }`. Chromium matches that form
 * much more slowly than the flat selector that a build ships. Each grid cell
 * carries `data-slot`, so each style recalculation paid for these rules. A
 * restyle of 1,000 plain cells took 46ms with the nested CSS and 17.5ms with
 * the flat CSS.
 *
 * The last plugin runs the same `optimize` step on the CSS of this package
 * after Tailwind generates it. The suites therefore read the CSS that an app
 * ships, and a benchmark times the style cost of that CSS. The CSS of a
 * dependency stays as it ships.
 */
export function servedTailwind(): Plugin[] {
	return [
		...tailwindcss(),
		{
			name: 'ui:flatten-served-css',
			apply: 'serve',
			enforce: 'pre',
			transform: {
				filter: { id: PACKAGE_CSS },
				handler(code) {
					return { code: optimize(code, { minify: false }).code, map: null }
				},
			},
		},
	]
}

/**
 * Moves the real mouse off the tester iframe, onto the runner's own page.
 *
 * The CDP cursor is page state, and one page serves every file an instance
 * runs. A `userEvent.hover` leaves it where it pointed. The next case that
 * renders a hover-driven element under that point opens it with no hover of
 * its own. `grid-cell-truncate-tooltip` did exactly that: the case before it
 * left the cursor over the same cell, and under load the tooltip opened after
 * its 250ms delay and before the case's own hover.
 *
 * A point inside the iframe can end up under whatever a later case renders.
 * A point outside it cannot, so the cursor parks in the strip that the scaled
 * iframe leaves free on the right, or below it.
 */
const parkPointer: BrowserCommand<[]> = async (context) => {
	const box = await (await context.frame()).frameElement().then((frame) => frame.boundingBox())

	const page = context.page.viewportSize()

	if (!box || !page) throw new Error('parkPointer: the tester iframe has no box on the page')

	const spot =
		box.x + box.width + 1 < page.width
			? { x: page.width - 1, y: 1 }
			: box.y + box.height + 1 < page.height
				? { x: 1, y: page.height - 1 }
				: null

	if (!spot) {
		throw new Error(
			`parkPointer: the tester iframe fills the ${page.width}x${page.height} page, so no point lies outside it`,
		)
	}

	await context.page.mouse.move(spot.x, spot.y)
}

/**
 * Moves the real mouse to the center of the element that `selector` matches in the tester
 * iframe, and holds the primary button down there.
 *
 * `userEvent.click` sends `mousedown` and `mouseup` as one step. A case that reads the page
 * between the two (the focus during a press) needs the halves apart.
 */
const pressPointer: BrowserCommand<[selector: string]> = async (context, selector) => {
	await context.iframe.locator(selector).hover()

	await context.page.mouse.down()
}

/**
 * Releases the primary button that {@link pressPointer} holds. With a `selector`, it first moves
 * the real mouse to the center of the element that the selector matches in the tester iframe.
 */
const releasePointer: BrowserCommand<[selector?: string]> = async (context, selector) => {
	if (selector) await context.iframe.locator(selector).hover()

	await context.page.mouse.up()
}

/**
 * Real-browser test suite (Vitest browser mode, Playwright/Chromium), split
 * into instances along the `@floating-ui/react` mock boundary — the mock is a
 * setup-file `vi.mock`, so it can only toggle per instance, not per file —
 * along the scrollbar mode of the browser, and along the geometry category:
 *
 * - `browser`: the layout, scroll, and computed style the jsdom suite can't
 *   see, when the subject is not layout geometry — react-virtual windowing,
 *   which renders zero rows under jsdom's zero-size viewport, scroll anchors,
 *   and hover color. `@floating-ui/react` is mocked
 *   (browser/setup/module-mocks.ts) so overlay panels render inline and
 *   settled.
 *
 * - `floating-ui` (browser/floating-ui/): the cases that need the live
 *   floating engine — modal focus containment (WCAG 2.4.3 / 2.1.2) and
 *   portal/ARIA wiring through a real `FloatingFocusManager` — with a setup
 *   variant that leaves `@floating-ui/react` real (motion stays mocked for
 *   determinism).
 *
 * - `motion` (browser/motion/): the cases that read the result of a real
 *   animation, such as the layers of a crossfade after it lands. This instance
 *   leaves `motion/react` real and mocks `@floating-ui/react` as `browser` does.
 *
 * - `geometry` (browser/geometry/): the cases whose subject is layout
 *   geometry — the boxes, hit areas, clipping, alignment, and RTL edges of a
 *   real layout — and the target-size and color-contrast axe rules. Its mocks
 *   are the ones `browser` uses, so a file moves between the two with no
 *   change. The `geometry` project of `vitest.config.ts` holds the
 *   computational half, and `pnpm test:geometry` runs the two.
 *
 * - `scrollbars` (browser/scrollbars/): the cases that measure a scroll range.
 *   Playwright starts headless Chromium with `--hide-scrollbars`. In that mode a
 *   `scrollbar-gutter: stable` scroller reserves the gutter, but it computes
 *   the scroll range as if the scrollbar had no width, so the range is 15 px
 *   short. This instance drops the flag, so its scrollers have real scrollbars.
 *   Its mocks are the ones `browser` uses.
 *
 * `pnpm test:browser` runs all five; `--project <name>` scopes to one.
 *
 * Instance-level `setupFiles` merge additively onto project-level ones
 * (project's run first), so `index.ts`/`act-environment.ts` — shared by both
 * instances — sit at project level as ordinary relative paths; only the
 * per-instance `module-mocks` boundary needs an absolute path, since
 * instance options are merged directly into the already-resolved project
 * config, unlike project-level paths which Vite resolves normally.
 */
export default defineConfig({
	plugins: [servedTailwind()],
	// The floor, not the whole set: the dependency scan finds these on its own,
	// and this list still covers the heavy graph if a later edit breaks the scan.
	// A module that the scan cannot resolve stops it, and Vite then pre-bundles
	// only this list. Each other package arrives one request at a time, and each
	// arrival runs the optimizer again and reloads the page. `@vitest/browser`
	// warns that such a reload can make tests fail or run two times. In CI a
	// reload broke a `vi.mock` factory, and the run failed before its first case.
	optimizeDeps: {
		include: [
			'@dnd-kit/core',
			'@dnd-kit/sortable',
			'@dnd-kit/utilities',
			'@floating-ui/react',
			// A subpath is its own optimizer entry, as `jest-dom/vitest` below is.
			// `use-floating-reference` imports it, and a cache built before that
			// import discovers it lazily and reloads the page mid-run.
			'@floating-ui/react/utils',
			'@internationalized/date',
			'@tanstack/virtual-core',
			'card-validator',
			'lucide-react',
			'motion',
			'motion/react',
			'motion/react-m',
			'pdfjs-dist',
			'pdfjs-dist/legacy/build/pdf.mjs',
			'react',
			'react-dom',
			'react-dom/client',
			// The Shiki worker of `CodeBlock` imports these. The scan does not follow
			// a worker, so its imports are listed here.
			'shiki/core',
			'shiki/engine/javascript',
			'shiki/langs',
			'shiki/themes',
			'tinykeys',
			'jest-axe',
			'@testing-library/react',
			'@testing-library/user-event',
			'@testing-library/jest-dom',
			// Subpath imports are separate optimizer entries from their bare
			// package: without this entry, a cold cache discovers the setup's
			// `@testing-library/jest-dom/vitest` import lazily and reloads the
			// page mid-run.
			'@testing-library/jest-dom/vitest',
		],
	},
	test: {
		// The files of the five instances, and each instance sets its own
		// `include`. Vitest starts the dependency scan of the browser server from
		// the test files of this level, and the default is each test file of the
		// package. The node suites then enter the scan too, and a module that the
		// optimizer cannot bundle for a browser stops the run, such as the native
		// binding of Tailwind that the tests of the docs build import.
		include: ['src/__tests__/browser/**/*.test.{ts,tsx}'],
		globals: true,
		// The same rule `vitest.config.ts` states: machine speed must change when a
		// test passes, never whether it passes. Both budgets were Vitest's own
		// browser defaults until now — `testTimeout ??= browser.enabled ? 15e3 :
		// 5e3` and `hookTimeout ??= browser.enabled ? 3e4 : 1e4` — so the suite ran
		// to a number no one here chose and a version bump can move. They are
		// declared at those values, which pins what a bump would take away.
		//
		// They scale on CI by `BUDGET_FACTOR`, as `budget()` does. Under load, one
		// `userEvent` call took 1.5s, and the first case of `radio-read-only` ran
		// past a flat 15s. A case that is slow but still moves then fails on a slow
		// machine only, which the rule above forbids.
		//
		// `asyncUtilTimeout` is RTL's waitFor/findBy budget, injected by
		// `browser/setup/index.ts`. The browser suite had none, so it ran at RTL's
		// own 1s default on every machine — the one suite that does real layout, on
		// the most loaded page. It scales to 4s on CI now, as the jsdom projects
		// do, and stays at 1s locally. It sits far below `testTimeout`, so a stuck
		// wait fails as an RTL timeout carrying the callback's last error rather
		// than as an opaque test timeout.
		testTimeout: 15_000 * BUDGET_FACTOR,
		hookTimeout: 30_000 * BUDGET_FACTOR,
		// A `waitFor` override in a case that needs longer than the budget above
		// scales by the same rule; `browser/helpers/wall-clock.ts` reads this.
		// It governs no real-time hold: a budget costs nothing on a green run,
		// where a hold spends its full value every time.
		provide: { asyncUtilTimeout: CI ? 4_000 : 1_000, budgetFactor: BUDGET_FACTOR },
		// The budget of `expect.poll`, by the same rule. Vitest gives each poll a
		// default of 1s on every machine, and no option above scales it. It is the
		// budget of `asyncUtilTimeout`, so a poll and a `waitFor` fail at one time.
		expect: { poll: { timeout: CI ? 4_000 : 1_000 } },
		// The cleanup of `vitest.base.ts`, for the shared registry that `isolate`
		// declares below.
		...cleanup,
		// One page per instance, and one module graph across the files it runs.
		// The default re-imports the graph for every file: measured on a
		// 4-core container, the 100-file suite spent 566s summed in import and
		// took 190s of wall clock; with the graph shared it takes 44s, and every
		// test still passes. The price is the one the jsdom `unit` project has
		// paid since August: a shared window across a page's files. The same
		// residue rules apply — remove appended nodes in `onTestFinished`, and
		// declare no per-file `vi.mock` (the two `module-mocks` setup files are
		// the only doubles, and they toggle per instance).
		isolate: false,
		// The shuffle `vitest.config.ts` runs, and for the same reason: an order
		// dependency between files that share a page fails early rather than once
		// a file moves. It could not land while clicks died at random after a
		// drag. Since #1180 closed that, ten seeds pass. Replay a red run with
		// `VITEST_SEED=<seed> pnpm test:browser`.
		sequence,
		setupFiles: [
			'./src/__tests__/browser/setup/index.ts',
			// `userEvent.setup()` patches HTMLElement.prototype.focus with a
			// getter-only accessor and never restores it. Under `isolate: false` the
			// prototype is shared across the instance's files, so the patch outlives
			// its own file. The jsdom projects have carried this guard since the
			// shared worker landed; this suite shares a page on the same terms and
			// did not. No browser file assigns `el.focus` today, so this is
			// prevention rather than a fix — seven tests hit the leak when files
			// moved into this suite.
			'./src/__tests__/setup/restore-prototype-focus.ts',
			'./src/__tests__/browser/setup/act-environment.ts',
		],
		// `test:coverage` merges this report with the report of the jsdom run.
		coverage: coverageScope,
		browser: {
			enabled: true,
			// `browser/setup/index.ts` calls it before every case.
			commands: { parkPointer, pressPointer, releasePointer },
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
			// The size every file arrives at. Vitest resets the iframe to this value
			// before each file, so a file that sets its own size keeps it to itself:
			// measured across a full run, all 108 files arrive here and sixteen
			// depart at a size of their own. A file inherits nothing from the file
			// before it, and needs no restore.
			//
			// 414x896 is the value the suite has always run at, because it is
			// Vitest's own default (`resolved.browser.viewport.width ??= 414`).
			// Declaring it changes nothing today and stops a version bump from
			// moving it. It is also the right end of the range to gate at:
			// `browser/geometry/geometry-invariants.test.tsx` states its contract as no
			// page-level horizontal overflow at the default viewport, which asserts
			// almost nothing at a desktop width. The whole suite passes at 1280x800,
			// so gating wide later costs no edits.
			//
			// `test-isolation-boundary` holds where a file may declare another size.
			viewport: { width: 414, height: 896 },
			instances: [
				{
					browser: 'chromium',
					name: 'browser',
					setupFiles: [resolve(import.meta.dirname, 'src/__tests__/browser/setup/module-mocks.ts')],
					include: ['src/__tests__/browser/**/*.test.{ts,tsx}'],
					exclude: [
						...configDefaults.exclude,
						'src/__tests__/browser/floating-ui/**',
						'src/__tests__/browser/geometry/**',
						'src/__tests__/browser/motion/**',
						'src/__tests__/browser/scrollbars/**',
					],
				},
				{
					browser: 'chromium',
					name: 'geometry',
					setupFiles: [resolve(import.meta.dirname, 'src/__tests__/browser/setup/module-mocks.ts')],
					include: ['src/__tests__/browser/geometry/**/*.test.{ts,tsx}'],
				},
				{
					browser: 'chromium',
					name: 'scrollbars',
					provider: playwright({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } }),
					setupFiles: [resolve(import.meta.dirname, 'src/__tests__/browser/setup/module-mocks.ts')],
					include: ['src/__tests__/browser/scrollbars/**/*.test.{ts,tsx}'],
				},
				{
					browser: 'chromium',
					name: 'floating-ui',
					setupFiles: [
						resolve(import.meta.dirname, 'src/__tests__/browser/floating-ui/setup/module-mocks.ts'),
					],
					include: ['src/__tests__/browser/floating-ui/**/*.test.{ts,tsx}'],
				},
				{
					browser: 'chromium',
					name: 'motion',
					setupFiles: [
						resolve(import.meta.dirname, 'src/__tests__/browser/motion/setup/module-mocks.ts'),
					],
					include: ['src/__tests__/browser/motion/**/*.test.{ts,tsx}'],
				},
			],
		},
	},
})
