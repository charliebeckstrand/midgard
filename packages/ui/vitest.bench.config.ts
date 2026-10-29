import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		// Date/calendar tests construct local-time dates (`new Date(y, m, d)`);
		// pin the zone so every machine renders the same wall-clock day.
		env: { TZ: 'UTC' },
		setupFiles: ['./src/__benchmarks__/setup.ts'],
		// A mount bench of the largest kanban board or query tree reaches the
		// default heap limit of a worker before the garbage of its earlier
		// samples is gone. Vitest 4 ran it just under that limit, and Vitest 5
		// takes a little more.
		execArgv: ['--max-old-space-size=4096'],
		benchmark: {
			// The browser-mode suite (vitest.bench.browser.config.ts) needs real
			// layout and scroll geometry, so it can't run under jsdom.
			exclude: ['**/node_modules/**', 'src/__benchmarks__/browser/**'],
		},
	},
})
