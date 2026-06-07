import { defineConfig } from 'vitest/config'
import { browserOptimizeDeps, browserPlugins, browserTest } from './vitest.browser.base'

/**
 * Real-floating-engine browser suite (Vitest browser mode, Playwright/Chromium).
 *
 * The main browser suite (vitest.browser.config.ts) globally mocks
 * `@floating-ui/react` so anchored popovers render inline and settled, which
 * neuters `FloatingFocusManager` into a pass-through that does no trapping. A few
 * behaviours can only be verified against the real engine — modal focus
 * containment (WCAG 2.4.3 / 2.1.2), which jsdom also can't see because it
 * resolves tabbability to zero-size. This config reuses the shared browser setup
 * but swaps in a module-mocks variant that leaves `@floating-ui/react` real
 * (motion/maplibre stay mocked for determinism), and scopes itself to the
 * `browser-real/` directory. Run with `pnpm test:browser-real`.
 */
export default defineConfig({
	plugins: browserPlugins,
	optimizeDeps: browserOptimizeDeps,
	test: {
		...browserTest,
		setupFiles: [
			'./src/__tests__/browser/setup/index.ts',
			'./src/__tests__/browser-real/setup/module-mocks.ts',
		],
		include: ['src/__tests__/browser-real/**/*.test.{ts,tsx}'],
	},
})
