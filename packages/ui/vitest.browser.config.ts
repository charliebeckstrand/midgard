import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'

const CI = Boolean(process.env.CI)

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
	// `docsPlugin` serves `virtual:component-modules`. Without it the module has
	// no resolver, esbuild's dependency scan stops at the first import of it, and
	// Vite reports "Failed to run dependency scan. Skipping dependency
	// pre-bundling." The optimizer then pre-bundles only the `include` list
	// below, and finds every other package one request at a time. Measured cold
	// on a 4-core container: eight packages arrived that way, two of them after
	// the first test started. Each arrival re-runs the optimizer, and Vitest
	// reloads the page to pick up the new bundle — which drops the in-flight
	// test's imports. `@vitest/browser` names the cost in its own warning: "Vite
	// unexpectedly reloaded a test. This may cause tests to fail, lead to flaky
	// behaviour or duplicated test runs."
	//
	// The plugin is the same one `vitest.config.ts` gives `unit` and `pure`.
	// `vitest: true` keeps the real component-modules map and builds no
	// TypeScript project, so it costs one virtual module and no scan of its own.
	// With the scan whole, lazy arrivals fall to zero and the warm run takes
	// 26.3s against 30.3s.
	plugins: [tailwindcss(), docsPlugin({ vitest: true })],
	// Pre-bundle the component dependency set so the optimizer doesn't discover
	// them lazily and reload the page mid-run (which drops the in-flight test
	// import). The browser pool can't recover from that reload the way the node
	// pool can, so these must be declared up front. The scan above finds the
	// same packages on its own now, so this list is the floor and not the whole
	// set: it still covers the heavy graph if a later edit breaks the scan.
	optimizeDeps: {
		include: [
			'@dnd-kit/core',
			'@dnd-kit/sortable',
			'@dnd-kit/utilities',
			'@floating-ui/react',
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
		// `slowFactor` scales the wall-clock holds a few cases cannot express as a
		// `waitFor` — a component's own delay must expire before "nothing
		// happened" means anything. `browser/helpers/wall-clock.ts` reads it. It
		// takes 2 rather than the budget's 4, because a hold spends its time on
		// every green run where a budget only bounds a failure.
		provide: { asyncUtilTimeout: CI ? 4_000 : 1_000, slowFactor: CI ? 2 : 1 },
		// Both instances run `isolate: false`, so one page and one module registry
		// serve every file the instance runs. A spy or a stub that a test does not
		// restore therefore outlives its own file, exactly as it would in `unit`.
		// These are the four settings `vitest.config.ts` carries for that reason,
		// and the browser config carried none of them: restoreMocks reverts
		// `vi.spyOn` spies, clearMocks drops call history, and the two unstub
		// settings revert `vi.stubGlobal` and `vi.stubEnv`. All four run ahead of
		// `beforeEach`, so setup in a hook or a test body is reapplied untouched.
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
			// prevention rather than a fix — the 2026-09-11 document counts seven
			// tests that hit the leak when it moved files into a browser.
			'./src/__tests__/setup/restore-prototype-focus.ts',
			'./src/__tests__/browser/setup/act-environment.ts',
		],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
			// The size every file arrives at. Vitest resets the iframe to this
			// value before each file, so a file that sets its own size keeps it to
			// itself: measured across a full run, all 108 files arrive here and
			// sixteen depart at a size of their own. A file therefore inherits
			// nothing from the file before it, and needs no restore.
			//
			// 414x896 is the value the suite has always run at, because it is
			// Vitest's own default (`resolved.browser.viewport.width ??= 414`).
			// Declaring it changes nothing today and stops a version bump from
			// moving it. It is also the right end of the range to gate at: this is
			// the narrow width, where horizontal overflow and target-size
			// violations surface, and `browser/geometry-invariants.test.tsx` states
			// its own contract as "no page-level horizontal overflow at the default
			// viewport". At a desktop width that gate asserts almost nothing.
			//
			// A file whose geometry needs another size declares it once, in a
			// `beforeAll` at the top of its describe; `test-isolation-boundary`
			// holds that placement. The whole suite passes at 1280x800 as well, so
			// a later decision to gate at a desktop width costs no edits.
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
