import { defineConfig } from 'vitest/config'

/**
 * The app's test harness.
 *
 * A node environment and nothing else. What this app holds that is worth a test
 * is pure: the schema every edge reads a body through, the fold that turns the
 * cook log into counts and orders, the filter the bar applies, the week the
 * board is cut to, the move the board resolves a drop into, and the atomic file
 * mechanism the stores write through. None of it touches a DOM, so none of it
 * needs one — the components compose `ui`, which carries its own suite.
 *
 * The zone is pinned because a plan day and a cook day are both local-time days.
 * Unpinned, a test that writes `2026-08-17` reads it back as the 16th west of
 * UTC.
 */
export default defineConfig({
	test: {
		environment: 'node',
		env: { TZ: 'UTC' },
		include: ['src/__tests__/**/*.test.ts'],
		restoreMocks: true,
		unstubGlobals: true,
	},
})
