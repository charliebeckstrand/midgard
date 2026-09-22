import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import type { Plugin } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

const CI = Boolean(process.env.CI)

const COMPONENT_MODULES = 'virtual:component-modules'

/**
 * Resolves `virtual:component-modules` to an empty map.
 *
 * Nothing this suite runs imports it — a crawl of every relative import from
 * `src/__tests__/browser/` reaches 1,492 files and none under `src/docs/`.
 * Esbuild's dependency scan reaches it anyway, and an unresolvable module stops
 * the scan dead: Vite then reports "Failed to run dependency scan. Skipping
 * dependency pre-bundling" and pre-bundles only the `include` list below,
 * finding every other package one request at a time. Measured cold on a 4-core
 * container: eight packages arrived that way, two of them after the first test
 * started, and each arrival re-runs the optimizer and reloads the page.
 * `@vitest/browser` names the cost in its own warning — "Vite unexpectedly
 * reloaded a test. This may cause tests to fail, lead to flaky behaviour or
 * duplicated test runs."
 *
 * A stub rather than the real `docsPlugin` the node config gives `unit` and
 * `pure`. The plugin resolves the module, but it also imports ts-morph and
 * typescript at module scope, walks every barrel and demo to build the real
 * map, and rewrites each barrel it serves to carry `__module` / `__name` — so
 * the suite would test docs-tagged barrels rather than the ones it ships. An
 * empty map is semantically exact here, because no file reads it.
 *
 * With the scan whole, lazy arrivals fall to zero and the warm run takes 26.3s
 * against 30.3s.
 */
function componentModulesStub(): Plugin {
	return {
		name: 'component-modules-stub',
		resolveId: (source) => (source === COMPONENT_MODULES ? `\0${COMPONENT_MODULES}` : null),
		load: (resolved) =>
			resolved === `\0${COMPONENT_MODULES}`
				? 'export default { packageName: "", names: {} }'
				: null,
	}
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
 * Real-browser test suite (Vitest browser mode, Playwright/Chromium), split
 * into two instances along the `@floating-ui/react` mock boundary — the mock
 * is a setup-file `vi.mock`, so it can only toggle per instance, not per file:
 *
 * - `browser`: layout, geometry, and computed colour the jsdom suite can't
 *   see — the `color-contrast` / `target-size` axe rules (helpers/axe.ts) and
 *   react-virtual windowing, which renders zero rows under jsdom's zero-size
 *   viewport. `@floating-ui/react` is mocked (browser/setup/module-mocks.ts)
 *   so overlay panels render inline and settled.
 *
 * - `floating-ui` (browser/floating-ui/): the cases that need the live
 *   floating engine — modal focus containment (WCAG 2.4.3 / 2.1.2) and
 *   portal/ARIA wiring through a real `FloatingFocusManager` — with a setup
 *   variant that leaves `@floating-ui/react` real (motion stays mocked for
 *   determinism).
 *
 * `pnpm test:browser` runs both; `--project <name>` scopes to one.
 *
 * Instance-level `setupFiles` merge additively onto project-level ones
 * (project's run first), so `index.ts`/`act-environment.ts` — shared by both
 * instances — sit at project level as ordinary relative paths; only the
 * per-instance `module-mocks` boundary needs an absolute path, since
 * instance options are merged directly into the already-resolved project
 * config, unlike project-level paths which Vite resolves normally.
 */
export default defineConfig({
	plugins: [tailwindcss(), componentModulesStub()],
	// The floor, not the whole set: the scan above finds these on its own, and
	// this list still covers the heavy graph if a later edit breaks it. The cost
	// of a package the optimizer finds late is written above the stub.
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
			'@tanstack/react-virtual',
			'card-validator',
			'lucide-react',
			'motion',
			'motion/react',
			'pdfjs-dist',
			'react',
			'react-dom',
			'react-dom/client',
			'shiki',
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
		globals: true,
		// The same rule `vitest.config.ts` states: machine speed must change when a
		// test passes, never whether it passes. Both budgets were Vitest's own
		// browser defaults until now — `testTimeout ??= browser.enabled ? 15e3 :
		// 5e3` and `hookTimeout ??= browser.enabled ? 3e4 : 1e4` — so the suite ran
		// to a number no one here chose and a version bump can move. They are
		// declared at those values, which changes nothing today and pins what a
		// bump would take away.
		//
		// `asyncUtilTimeout` is RTL's waitFor/findBy budget, injected by
		// `browser/setup/index.ts`. The browser suite had none, so it ran at RTL's
		// own 1s default on every machine — the one suite that does real layout, on
		// the most loaded page. It scales to 4s on CI now, as the jsdom projects
		// do, and stays at 1s locally. It sits far below `testTimeout`, so a stuck
		// wait fails as an RTL timeout carrying the callback's last error rather
		// than as an opaque test timeout.
		testTimeout: 15_000,
		hookTimeout: 30_000,
		// A `waitFor` override in a case that needs longer than the budget above
		// scales by the same rule; `browser/helpers/wall-clock.ts` reads this.
		// It governs no real-time hold: a budget costs nothing on a green run,
		// where a hold spends its full value every time.
		provide: { asyncUtilTimeout: CI ? 4_000 : 1_000, budgetFactor: CI ? 2 : 1 },
		// The four settings `vitest.config.ts` carries for the shared registry
		// `isolate` declares below, and which this config carried none of:
		// restoreMocks reverts `vi.spyOn` spies, clearMocks drops call history,
		// and the two unstub settings revert `vi.stubGlobal` and `vi.stubEnv`.
		// All four run ahead of `beforeEach`, so setup in a hook or a test body
		// is reapplied untouched.
		restoreMocks: true,
		clearMocks: true,
		unstubGlobals: true,
		unstubEnvs: true,
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
		browser: {
			enabled: true,
			// `browser/setup/index.ts` calls it before every case.
			commands: { parkPointer },
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
			// `browser/geometry-invariants.test.tsx` states its contract as no
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
					exclude: [...configDefaults.exclude, 'src/__tests__/browser/floating-ui/**'],
				},
				{
					browser: 'chromium',
					name: 'floating-ui',
					setupFiles: [
						resolve(import.meta.dirname, 'src/__tests__/browser/floating-ui/setup/module-mocks.ts'),
					],
					include: ['src/__tests__/browser/floating-ui/**/*.test.{ts,tsx}'],
				},
			],
		},
	},
})
