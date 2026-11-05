import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The app's test harness.
 *
 * A node environment and nothing else. What this app holds that is worth a test
 * is pure: the schema both edges read a body through, the geometry that decides
 * which region holds a place, the filter the bar applies, and the two backends
 * of the stores: the atomic files of `next dev` and the SQL of the database,
 * which runs on PGlite in the process. Most of it touches no DOM: the
 * components compose `ui`, which carries its own suite. A test of a hook or a
 * component that keeps state opens with `// @vitest-environment jsdom`, and
 * only that file runs in jsdom.
 *
 * The zone is pinned because a visit is a local-time day, and `toDay` and
 * `fromDay` read the machine's own clock. Unpinned, a test that writes
 * `2026-08-15` reads it back as the 14th west of UTC.
 *
 * The tsconfig of Next.js keeps JSX as it is, for Next.js to compile. A test
 * can import a module that makes elements, for example a source of the
 * palette, so the transform compiles JSX here.
 */
export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	test: {
		...sharedTest,
		environment: 'node',
		env: { TZ: 'UTC' },
	},
})
