import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/__tests__/setup.ts'],
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		css: false,
		// @tanstack/virtual-core's debounced timer fires after jsdom teardown,
		// causing a false-positive "window is not defined" unhandled error.
		dangerouslyIgnoreUnhandledErrors: true,
	},
})
