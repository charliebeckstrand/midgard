import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Primary-press boundary.
//
// A press that starts a gesture, or that a handler takes as a plain click, is
// a primary press. The test has one home, `isPrimaryPress` in
// `utilities/primary-press.ts`. On macOS a Ctrl-click is the secondary click,
// and it sends `button === 0` with `ctrlKey`. Before, seven handlers in six
// files compared `event.button` with 0 by hand, so a Ctrl-click passed as a
// primary press.
//
// So no source file compares a `button` with 0 by hand, in either order. A
// file that must read the button itself is on the list below with the reason.
// The scan reads the docs site too.

/** The one file that owns the test. */
const HOME = 'utilities/primary-press.ts'

/** Files that compare a `button` with 0 by hand, each with the reason. */
const KEPT: Record<string, string> = {
	'modules/map/use-map-zoom.ts':
		'a further pointer of a pinch is not the primary pointer, so `onPointerDown` reads its button after `isPrimaryPress` refuses it',
}

const EQ = '[!=]==?'

/** A `button` compared with 0, in either order. `buttons` is a bit mask, not a button. */
const BUTTON_ZERO = new RegExp(
	String.raw`\bbutton\s*${EQ}\s*0(?![\w.])|(?<![\w.])0\s*${EQ}\s*(?:[\w$]+\??\.)*button\b`,
)

/** Whether a source text compares a `button` with 0 by hand. */
function readsButtonZero(code: string): boolean {
	return BUTTON_ZERO.test(code)
}

/** Every source file, the docs site included, that compares a `button` with 0 by hand. */
function buttonFiles(): Set<string> {
	const files = new Set<string>()

	walkSource(srcDir, (path, source) => {
		if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

		const rel = srcRelative(path)

		if (rel === HOME) return

		// Prose that names the button is not a use of it.
		if (readsButtonZero(stripSourceComments(source))) files.add(rel)
	})

	return files
}

describe('primary-press boundary', () => {
	it('finds each spelling of the comparison', () => {
		expect(readsButtonZero('if (event.button !== 0) return')).toBe(true)
		expect(readsButtonZero('const source = event.button === 0 ? read() : null')).toBe(true)
		expect(readsButtonZero('if (0 === event.button) start()')).toBe(true)
		expect(readsButtonZero('if (event?.button != 0) return')).toBe(true)
		expect(readsButtonZero('const { button } = event; if (button !== 0) return')).toBe(true)
		expect(readsButtonZero('if ((next.buttons & 1) === 0) stop()')).toBe(false)
		expect(readsButtonZero('if (event.buttons === 0) stop()')).toBe(false)
		expect(readsButtonZero('return event.ctrlKey && event.button === 2')).toBe(false)
		expect(readsButtonZero('if (event.button === 0.5) return')).toBe(false)
	})

	it('routes every primary-press test through the helper', () => {
		const violations = [...buttonFiles()].filter((rel) => !(rel in KEPT))

		expect(
			violations,
			`files that compare a button with 0 by hand (call \`isPrimaryPress\` from \`utilities/primary-press\`, or list the file in KEPT with the reason):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still compare a button', () => {
		const files = buttonFiles()

		const stale = Object.keys(KEPT).filter((rel) => !files.has(rel))

		expect(stale, `KEPT entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
