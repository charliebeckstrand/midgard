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
			// The browser-mode competitive suite (vitest.bench.browser.config.ts)
			// can't run under jsdom — AG Charts needs a real canvas. The docs
			// ts-morph suite (vitest.bench.docs.config.ts) pays multi-second
			// project setups per iteration and runs on its own command.
			exclude: [
				'**/node_modules/**',
				'src/__benchmarks__/browser/**',
				'src/__benchmarks__/docs/**',
			],
		},
	},
})
