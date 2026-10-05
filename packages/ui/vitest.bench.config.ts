import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		// Date/calendar tests construct local-time dates (`new Date(y, m, d)`);
		// pin the zone so every machine renders the same wall-clock day.
		env: { TZ: 'UTC' },
		setupFiles: ['./src/__benchmarks__/setup.ts'],
		benchmark: {
			// The browser-mode suite (vitest.bench.browser.config.ts) needs real
			// layout and scroll geometry, so it can't run under jsdom.
			exclude: ['**/node_modules/**', 'src/__benchmarks__/browser/**'],
		},
	},
})
