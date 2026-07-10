import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

/**
 * Competitive chart benchmarks in real Chromium (`pnpm bench:browser`) — the
 * ui chart module against AG Charts and Highcharts, per
 * `src/__benchmarks__/browser/README.md`. A real browser because the
 * comparison needs one: AG Charts draws to a real canvas and all three
 * contenders deserve real layout, so jsdom numbers would not be credible.
 *
 * Chromium launches with the frame-rate limit off: AG defers scene renders
 * to animation frames and the hover benches settle one frame per iteration,
 * so a vsync'd browser would quantize every such sample to ~16ms.
 */
export default defineConfig({
	plugins: [tailwindcss()],
	// Pre-bundle the bench dependency set so the optimizer doesn't discover it
	// lazily and reload the page mid-run (see vitest.browser.config.ts).
	optimizeDeps: {
		include: [
			'@floating-ui/react',
			'@internationalized/date',
			'ag-charts-community',
			'highcharts',
			'lucide-react',
			'motion',
			'motion/react',
			'react',
			'react-dom',
			'react-dom/client',
			'tinykeys',
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
