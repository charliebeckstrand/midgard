import { defineConfig } from 'vitest/config'

/**
 * The app's test harness.
 *
 * A node environment and nothing else. What this app holds that is worth a test
 * is pure: the schema both edges read a body through, the geometry that decides
 * which region holds a place, the filter the bar applies, and the atomic file
 * mechanism the stores write through. None of it touches a DOM, so none of it
 * needs one — the components compose `ui`, which carries its own suite.
 *
 * The zone is pinned because a visit is a local-time day, and `toDay` and
 * `fromDay` read the machine's own clock. Unpinned, a test that writes
 * `2026-08-15` reads it back as the 14th west of UTC.
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
