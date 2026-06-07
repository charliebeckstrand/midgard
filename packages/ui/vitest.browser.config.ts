import { defineConfig } from 'vitest/config'
import { browserOptimizeDeps, browserPlugins, browserTest } from './vitest.browser.base'

/**
 * Real-browser test suite (Vitest browser mode, Playwright/Chromium).
 *
 * The jsdom suite (vitest.config.ts) cannot see layout, geometry, or computed
 * colour, so a documented set of behaviours is either disabled or asserted only
 * at a synchronous seam: the `color-contrast` / `target-size` axe rules
 * (helpers/axe.ts) and react-virtual windowing, which renders zero rows under
 * jsdom's zero-size viewport. This config runs those cases against a real engine
 * so they can be verified for real. Shared Chromium/Tailwind/plugin/pre-bundle
 * setup lives in vitest.browser.base.ts; here `@floating-ui/react` is mocked
 * (setup/module-mocks.ts) so overlay panels render inline and settled — the
 * cases that need the real focus engine live in vitest.browser-real.config.ts.
 */
export default defineConfig({
	plugins: browserPlugins,
	optimizeDeps: browserOptimizeDeps,
	test: {
		...browserTest,
		setupFiles: [
			'./src/__tests__/browser/setup/index.ts',
			'./src/__tests__/browser/setup/module-mocks.ts',
		],
		include: ['src/__tests__/browser/**/*.test.{ts,tsx}'],
	},
})
