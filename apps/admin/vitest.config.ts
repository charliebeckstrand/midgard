import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared'

/**
 * The test harness of the app.
 *
 * A test renders the chrome of the app, so the environment is jsdom. The
 * tsconfig of Next.js keeps JSX as it is, for Next.js to compile, so the
 * transform compiles JSX here.
 */
export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	test: {
		...sharedTest,
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		environment: 'jsdom',
	},
})
