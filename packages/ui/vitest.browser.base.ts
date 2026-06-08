import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { docsPlugin } from './src/docs/plugins'

/**
 * Shared Vitest browser-mode setup, factored so the two browser configs can't
 * drift apart silently (mirrors how vitest.base.config.ts factors the jsdom
 * suite). `vitest.browser.config.ts` runs the bulk of the browser suite with
 * `@floating-ui/react` mocked for settled, position-free overlays;
 * `vitest.browser-real.config.ts` runs the few cases that need the real floating
 * engine (modal focus trapping). Both share Chromium, the Tailwind compile, the
 * docs plugins, and the dependency pre-bundle below — only their setup files and
 * test globs differ.
 */
export const browserPlugins = [...docsPlugin({ vitest: true }), tailwindcss()]

// Pre-bundle the component dependency set so the optimizer doesn't discover them
// lazily and reload the page mid-run (which drops the in-flight test import). The
// browser pool can't recover from that reload the way the node pool can, so these
// must be declared up front.
export const browserOptimizeDeps = {
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
}

export const browserTest = {
	globals: true,
	browser: {
		enabled: true,
		provider: playwright(),
		headless: true,
		screenshotFailures: false,
		instances: [{ browser: 'chromium' as const }],
	},
}
