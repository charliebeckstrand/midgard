import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { componentTagsPlugin, virtualStubsPlugin } from './src/docs/plugins'

/**
 * Real-browser test suite (Vitest browser mode, Playwright/Chromium).
 *
 * The jsdom suite (vitest.config.ts) cannot see layout, geometry, or computed
 * colour, so a documented set of behaviours is either disabled or asserted only
 * at a synchronous seam: the `color-contrast` / `target-size` axe rules
 * (helpers/axe.ts) and react-virtual windowing, which renders zero rows under
 * jsdom's zero-size viewport. This config runs those cases against a real engine
 * so they can be verified for real. `tailwindcss()` compiles the production
 * utility CSS the contrast check reads; the docs plugins mirror the jsdom config
 * so component modules resolve identically.
 */
export default defineConfig({
	plugins: [componentTagsPlugin(), virtualStubsPlugin(), tailwindcss()],
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
		setupFiles: [
			'./src/__tests__/browser/setup/index.ts',
			'./src/__tests__/browser/setup/module-mocks.ts',
		],
		include: ['src/__tests__/browser/**/*.test.{ts,tsx}'],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
			instances: [{ browser: 'chromium' }],
		},
	},
})
