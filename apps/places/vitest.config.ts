import { defineConfig } from 'vitest/config'
import { nextApp, sharedTest } from '../../vitest.shared.mts'

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
 * The shared config pins the zone, and this app needs it: a visit is a
 * local-time day, and `toDay` and `fromDay` read the machine's own clock.
 * Unpinned, a test that writes `2026-08-15` reads it back as the 14th west of
 * UTC. A module that makes elements, for example a source of the palette, needs
 * the JSX transform of the shared config.
 */
export default defineConfig({
	...nextApp,
	test: { ...sharedTest, environment: 'node' },
})
