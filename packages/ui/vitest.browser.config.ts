import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/engine/plugins'

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
			'./src/__tests__/browser/setup/act-environment.ts',
		],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
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
