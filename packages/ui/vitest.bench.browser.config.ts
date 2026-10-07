import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { servedTailwind } from './vitest.browser.config'

/**
 * The benchmarks of the ui modules in real Chromium (`pnpm bench:browser`),
 * per `src/__benchmarks__/browser/README.md`. The grids virtualize against
 * real scroll geometry, and the charts and maps settle against real layout
 * and style, so jsdom numbers would not be credible.
 *
 * Chromium launches with the frame-rate limit off: the hover benches settle
 * one frame per iteration, so a vsync'd browser would quantize every such
 * sample to ~16ms.
 */
export default defineConfig({
	plugins: [servedTailwind()],
	// Measure the React the module actually ships: production, not the
	// development build Vite serves by default. The dev build's invariant checks
	// and warnings run several times the work per render, so a dev-React number
	// would score the module's diagnostics, not its shipped speed. Defined at
	// both layers because React selects its build through a
	// `process.env.NODE_ENV` require that both the app transform and the
	// dependency pre-bundle must fold to `'production'`.
	define: { 'process.env.NODE_ENV': '"production"' },
	// Pre-bundle the bench dependency set so the optimizer doesn't discover it
	// lazily and reload the page mid-run (see vitest.browser.config.ts).
	optimizeDeps: {
		esbuildOptions: { define: { 'process.env.NODE_ENV': '"production"' } },
		include: [
			'@floating-ui/react',
			'@internationalized/date',
			'd3-geo',
			'lucide-react',
			'motion',
			'motion/react',
			'motion/react-m',
			'pdfjs-dist',
			'pdfjs-dist/legacy/build/pdf.mjs',
			'react',
			'react-dom',
			'react-dom/client',
			'tinykeys',
			'topojson-client',
		],
	},
	test: {
		globals: true,
		include: [],
		setupFiles: ['./src/__benchmarks__/browser/setup.ts'],
		benchmark: {
			include: ['src/__benchmarks__/browser/**/*.bench.{ts,tsx}'],
		},
		browser: {
			enabled: true,
			provider: playwright({
				launchOptions: { args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] },
			}),
			headless: true,
			screenshotFailures: false,
			instances: [{ browser: 'chromium' }],
		},
	},
})
