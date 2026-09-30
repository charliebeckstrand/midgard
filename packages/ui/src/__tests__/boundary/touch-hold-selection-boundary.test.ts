import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Touch-hold selection boundary.
//
// On iOS, a long press selects text when the node under the finger is
// selectable at the moment of the gesture, and the selection can land far from
// the finger. A touch hold must therefore select no text on the page from the
// press to the lift. The rule has one home, `hooks/use-touch-hold-selection.ts`.
// It sets `select-none` on `<html>` for the span of the hold.
//
// Two rules keep the one source of truth:
//
//   1. Each file that times a touch hold calls the rule: `useTouchHoldSelection`
//      or `holdTouchSelection`. A file times a touch hold when it reads a touch
//      pointer and starts a timer, or when it runs the HoldButton gesture. A file
//      on DELEGATED leaves the rule to another file, and a file on NOT_A_HOLD
//      times something that is not a hold. Each entry gives the reason.
//
//   2. No file but the home sets `user-select` from script.

/** The one file that owns the rule. */
const HOME = 'hooks/use-touch-hold-selection.ts'

/** The workspace root, so the scan reaches the apps too. */
const workspaceRoot = join(srcDir, '..', '..', '..')

/** The trees to scan: the ui source and the source of each app. */
const SCAN_ROOTS = [srcDir, join(workspaceRoot, 'apps')].filter((root) => existsSync(root))

/** A check of the pointer type against `touch`. */
const TOUCH_POINTER = /pointerType\s*[!=]==?\s*['"]touch['"]/

/** A timer: a direct `setTimeout`, or the `useTimeout` hook. */
const TIMER = /\bsetTimeout\(|\buseTimeout\(/

/** The HoldButton gesture, which times its hold for each pointer type. */
const HOLD_BUTTON = /\buseHoldButtonGesture\(/

/** A call of the rule. */
const CALLS_RULE = /\b(?:useTouchHoldSelection|holdTouchSelection)\(/

/** A `user-select` that script sets: an inline style write, a class toggle, or an injected rule. */
const SCRIPTED_SELECT =
	/\.style\.(?:webkitU|u)serSelect\s*=|classList\.(?:add|remove|toggle)\(\s*['"`]select-none|user-select:[^;'"`]*!important/

/** Files that time a touch hold and leave the rule to another file, each with the reason. */
const DELEGATED: Record<string, string> = {
	'components/hold-button/use-hold-button-gesture.ts':
		'defines the gesture; hold-button.tsx holds the rule for the pointer press',
	'modules/chart/engine/use-chart-pointer.ts':
		'use-chart-touch-tap.ts holds the rule for the press',
	'modules/chart/sector-chart/sector-chart-marks.tsx':
		'use-chart-touch-tap.ts holds the rule for the press',
}

/** Files that read a touch pointer and start a timer for something that is not a hold. */
const NOT_A_HOLD: Record<string, string> = {
	'modules/map/use-map-zoom.ts': 'times the settle of a pinch and a wheel zoom',
	'hooks/use-hover-across-scroll.ts': 'times the settle of a scroll',
}

/** Whether a file times a touch hold. */
const timesHold = (code: string) =>
	(TOUCH_POINTER.test(code) && TIMER.test(code)) || HOLD_BUTTON.test(code)

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

			if (key.startsWith('docs/') || key === HOME) return

			// Prose that names a call is not a use of it.
			files.set(key, stripSourceComments(source))
		})
	}

	return files
}

describe('touch-hold selection boundary', () => {
	const files = sourceFiles()

	const holds = [...files].filter(([, code]) => timesHold(code))

	it('guards the selection through the rule for each touch hold', () => {
		const violations = holds
			.filter(
				([key, code]) => !CALLS_RULE.test(code) && !(key in DELEGATED) && !(key in NOT_A_HOLD),
			)
			.map(([key]) => key)

		expect(
			violations,
			`files that time a touch hold without the selection rule (call \`useTouchHoldSelection\` or \`holdTouchSelection\` from \`hooks/use-touch-hold-selection\`, or list the file in DELEGATED or NOT_A_HOLD with the reason):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('sets user-select from script only in the rule', () => {
		const violations = [...files]
			.filter(([, code]) => SCRIPTED_SELECT.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that set user-select from script (hold a touch-hold selection through \`useTouchHoldSelection\`):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still need an entry', () => {
		const unguarded = new Set(
			holds.filter(([, code]) => !CALLS_RULE.test(code)).map(([key]) => key),
		)

		const stale = [...Object.keys(DELEGATED), ...Object.keys(NOT_A_HOLD)].filter(
			(key) => !unguarded.has(key),
		)

		expect(stale, `entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
