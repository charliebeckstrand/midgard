import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/plugins'

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
 *   variant that leaves `@floating-ui/react` real (motion/maplibre stay
 *   mocked for determinism).
 *
 * `pnpm test:browser` runs both; `--project <name>` scopes to one.
 */
export default defineConfig({
	plugins: [...docsPlugin({ vitest: true }), tailwindcss()],
	// Pre-bundle the component dependency set so the optimizer doesn't discover
	// them lazily and reload the page mid-run (which drops the in-flight test
	// import). The browser pool can't recover from that reload the way the node
	// pool can, so these must be declared up front.
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
			'maplibre-gl',
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
		],
	},
	test: {
		globals: true,
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
			// Instance-level paths must be absolute: Vitest merges raw instance
			// options into the already-resolved project config, so relative
			// setupFiles would reach the browser runner unnormalized.
			instances: [
				{
					browser: 'chromium',
					name: 'browser',
					setupFiles: [
						resolve(import.meta.dirname, 'src/__tests__/browser/setup/index.ts'),
						resolve(import.meta.dirname, 'src/__tests__/browser/setup/module-mocks.ts'),
					],
					include: ['src/__tests__/browser/**/*.test.{ts,tsx}'],
					exclude: [...configDefaults.exclude, 'src/__tests__/browser/floating-ui/**'],
				},
				{
					browser: 'chromium',
					name: 'floating-ui',
					setupFiles: [
						resolve(import.meta.dirname, 'src/__tests__/browser/setup/index.ts'),
						resolve(
							import.meta.dirname,
							'src/__tests__/browser/floating-ui/setup/act-environment.ts',
						),
						resolve(import.meta.dirname, 'src/__tests__/browser/floating-ui/setup/module-mocks.ts'),
					],
					include: ['src/__tests__/browser/floating-ui/**/*.test.{ts,tsx}'],
				},
			],
		},
	},
})
