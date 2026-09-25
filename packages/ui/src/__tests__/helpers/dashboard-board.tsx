import { useState } from 'react'
import { afterEach, beforeEach } from 'vitest'

/**
 * Harnesses for the component suites of the dashboard.
 *
 * Not re-exported from `helpers/index.ts`. Only the dashboard suites use this
 * module, and that barrel reaches about 360 test files.
 */

/**
 * Gives the canvas of each board a width, in each case of the calling suite.
 *
 * @remarks
 * jsdom lays nothing out, so each element reports a `clientWidth` of 0. The
 * board divides the width of its canvas into the column pitch, and a gesture
 * starts only with a pitch. The stub answers for the canvas alone, so each
 * other element keeps the width that jsdom gives it.
 *
 * Call it once at the top level of a suite. It registers its own `beforeEach`
 * and `afterEach`.
 *
 * @param width - The width of the canvas, in px. The default gives a pitch of
 * 50 px at 24 columns.
 */
export function stubCanvasWidth(width = 1200): void {
	const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

	beforeEach(() => {
		Object.defineProperty(Element.prototype, 'clientWidth', {
			configurable: true,
			get(this: Element) {
				if (this.getAttribute('data-slot') === 'dashboard-canvas') return width

				return original?.get?.call(this) ?? 0
			},
		})
	})

	afterEach(() => {
		if (original) Object.defineProperty(Element.prototype, 'clientWidth', original)
	})
}

/** A widget with its own state, as a grid holds its sort. Each click counts up. */
export function Counter() {
	const [count, setCount] = useState(0)

	return (
		<button type="button" onClick={() => setCount((value) => value + 1)}>
			{`Count ${count}`}
		</button>
	)
}
