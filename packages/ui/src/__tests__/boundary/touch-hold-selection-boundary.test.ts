import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Touch-hold selection boundary.
//
// iOS Safari selects text under a long press, also near a surface that does
// something under a hold, such as a chart readout or a context menu. A surface
// opts in to the guard that removes that selection. The guard has one home,
// `hooks/use-touch-hold-selection.ts`.
//
// Two rules keep the one source of truth:
//
//   1. Each file that times a touch hold calls the guard:
//      `useTouchHoldSelection` or `holdTouchSelection`. A file times a touch
//      hold when it reads a touch pointer and starts a timer. A file on
//      DELEGATED leaves the guard to another file, and a file on NOT_A_HOLD
//      times something that is not a hold. Each entry gives the reason.
//
//   2. No file but the home removes the selection or cancels `selectstart`.

/** The one file that owns the guard. */
const HOME = 'hooks/use-touch-hold-selection.ts'

/** The workspace root, so the scan reaches the apps too. */
const workspaceRoot = join(srcDir, '..', '..', '..')

/** The trees to scan: the ui source and the source of each app. */
const SCAN_ROOTS = [srcDir, join(workspaceRoot, 'apps')].filter((root) => existsSync(root))

/** A check of the pointer type against `touch`. */
const TOUCH_POINTER = /pointerType\s*[!=]==?\s*['"]touch['"]/

/** A timer: a direct `setTimeout`, or the `useTimeout` hook. */
const TIMER = /\bsetTimeout\(|\buseTimeout\(/

/** A call of the guard. */
const CALLS_GUARD = /\b(?:useTouchHoldSelection|holdTouchSelection)\(/

/** Script that removes the selection or cancels its start. */
const CLEARS_SELECTION = /\.removeAllRanges\(|\.empty\(\)|['"`]selectstart['"`]|\bonSelectStart\b/

/** Files that time a touch hold and leave the guard to another file, each with the reason. */
const DELEGATED: Record<string, string> = {
	'modules/chart/engine/use-chart-pointer.ts':
		'use-chart-touch-tap.ts arms the guard for the press',
	'modules/chart/sector-chart/sector-chart-marks.tsx':
		'use-chart-touch-tap.ts arms the guard for the press',
}

/** Files that read a touch pointer and start a timer for something that is not a hold. */
const NOT_A_HOLD: Record<string, string> = {
	'modules/map/use-map-zoom.ts': 'times the settle of a pinch and a wheel zoom',
	'hooks/use-hover-across-scroll.ts': 'times the settle of a scroll',
}

/** Whether a file times a touch hold. */
const timesHold = (code: string) => TOUCH_POINTER.test(code) && TIMER.test(code)

/** The key of a file in the lists above: relative to `src/` in ui, to the workspace root elsewhere. */
function keyOf(path: string): string {
	if (path.startsWith(srcDir + sep)) return srcRelative(path)

	return relative(workspaceRoot, path).split(sep).join('/')
}

/** Each source file outside the tests and the docs site, keyed, with its code and no comments. */
function sourceFiles(): Map<string, string> {
	const files = new Map<string, string>()

	for (const root of SCAN_ROOTS) {
		walkSource(root, (path, source) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

			const key = keyOf(path)

			if (key.startsWith('docs/') || key.startsWith('__tests__/') || key === HOME) return

			// Prose that names a call is not a use of it.
			files.set(key, stripSourceComments(source))
		})
	}

	return files
}

describe('touch-hold selection boundary', () => {
	const files = sourceFiles()

	const holds = [...files].filter(([, code]) => timesHold(code))

	it('arms the guard for each touch hold', () => {
		const violations = holds
			.filter(
				([key, code]) => !CALLS_GUARD.test(code) && !(key in DELEGATED) && !(key in NOT_A_HOLD),
			)
			.map(([key]) => key)

		expect(
			violations,
			`files that time a touch hold without the selection guard (call \`useTouchHoldSelection\` or \`holdTouchSelection\` from \`hooks/use-touch-hold-selection\`, or list the file in DELEGATED or NOT_A_HOLD with the reason):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('clears the selection from script only in the guard', () => {
		const violations = [...files]
			.filter(([, code]) => CLEARS_SELECTION.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that remove the selection or cancel selectstart (opt in to \`useTouchHoldSelection\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still need an entry', () => {
		const unguarded = new Set(
			holds.filter(([, code]) => !CALLS_GUARD.test(code)).map(([key]) => key),
		)

		const stale = [...Object.keys(DELEGATED), ...Object.keys(NOT_A_HOLD)].filter(
			(key) => !unguarded.has(key),
		)

		expect(stale, `entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
