/**
 * What one keystroke on an open dropdown costs in a real engine.
 *
 * The jsdom suite (`../menu.bench.tsx`) reads about 1.4 ms per arrow press. It
 * puts nearly all of that on the scroll-ancestor walk in `moveTo`, which calls
 * `getComputedStyle` at each level from the row up to `<html>`. The jsdom
 * engine resolves style in JavaScript, so it prices that walk far above what a
 * browser charges. This bench is the honest number.
 *
 * Each rung runs twice, capped and uncapped. A capped panel has a real
 * scroller, so the walk stops at the first ancestor. An uncapped panel — the
 * default — has none, so the walk runs to the top of the document and returns
 * nothing. The gap between the two pairs is the cost of the fruitless walk.
 *
 * `dispatch only` is the floor to subtract: the same event on the same trigger,
 * carrying a key no handler acts on. What remains above it is the rove.
 */

import { bench, describe } from 'vitest'
import { WINDOW } from './harness'
import { openDropdown, pressKey, ROWS } from './menu-probe'

const uncapped = new Map<number, Awaited<ReturnType<typeof openDropdown>>>()

const capped = new Map<number, Awaited<ReturnType<typeof openDropdown>>>()

for (const count of ROWS) {
	uncapped.set(count, await openDropdown(count, false, `menu-key-plain-${count}`))

	capped.set(count, await openDropdown(count, true, `menu-key-capped-${count}`))
}

const floor = uncapped.get(24) as Awaited<ReturnType<typeof openDropdown>>

describe('menu · keystroke floor', () => {
	// A key the trigger's handler reads and passes over: React's own dispatch,
	// the composed handlers, and nothing else.
	bench(
		'24 rows · dispatch only',
		() => {
			pressKey(floor.trigger, 'F9')
		},
		WINDOW.settled,
	)
})

describe('menu · keyboard rove · uncapped panel (the default)', () => {
	for (const count of ROWS) {
		const probe = uncapped.get(count) as Awaited<ReturnType<typeof openDropdown>>

		bench(
			`${count} rows · ArrowDown`,
			() => {
				pressKey(probe.trigger, 'ArrowDown')
			},
			WINDOW.settled,
		)
	}
})

describe('menu · keyboard rove · capped panel (a real scroller)', () => {
	for (const count of ROWS) {
		const probe = capped.get(count) as Awaited<ReturnType<typeof openDropdown>>

		bench(
			`${count} rows · ArrowDown`,
			() => {
				pressKey(probe.trigger, 'ArrowDown')
			},
			WINDOW.settled,
		)
	}
})

describe('menu · typeahead · uncapped panel', () => {
	for (const count of ROWS) {
		const probe = uncapped.get(count) as Awaited<ReturnType<typeof openDropdown>>

		bench(
			`${count} rows · one letter`,
			() => {
				pressKey(probe.trigger, 'o')
			},
			WINDOW.settled,
		)
	}
})
