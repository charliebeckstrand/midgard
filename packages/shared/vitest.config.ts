import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/__tests__/**/*.test.ts'],
		// Restore each spy, stubbed global, and stubbed variable after its test, so no case leaks
		// into the next.
		restoreMocks: true,
		unstubGlobals: true,
		unstubEnvs: true,
	},
})
