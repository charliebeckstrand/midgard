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
 * carrying a key no handler acts on. What remains above it is the rove. It
 * takes a menu of its own, so the rove rungs keep their own cursor.
 */

import { bench, describe, vi } from 'vitest'
import { WINDOW } from './harness'
import { MENU_ROWS, openDropdown, type Probe, pressKey } from './menu-probe'

/** One row count, mounted both ways, so the pair prices the walk at that size. */
type Rung = { count: number; uncapped: Probe; capped: Probe }

const rungs: Rung[] = []

for (const count of MENU_ROWS) {
	rungs.push({
		count,
		uncapped: await openDropdown(count, false, `menu-key-plain-${count}`),
		capped: await openDropdown(count, true, `menu-key-capped-${count}`),
	})
}

const FLOOR_ROWS = 24

const floor = await openDropdown(FLOOR_ROWS, false, 'menu-key-floor')

/** Registers one press bench per rung, against the panel `pick` names. */
function pressBenches(pick: (rung: Rung) => Probe, key: string, label: string) {
	for (const rung of rungs) {
		bench(
			`${rung.count} rows · ${label}`,
			() => {
				pressKey(pick(rung).trigger, key)
			},
			WINDOW.settled,
		)
	}
}

describe('menu · keystroke floor', () => {
	// A key the trigger's handler reads and passes over: React's own dispatch,
	// the composed handlers, and nothing else.
	bench(
		`${FLOOR_ROWS} rows · dispatch only`,
		() => {
			pressKey(floor.trigger, 'F9')
		},
		WINDOW.settled,
	)
})

describe('menu · keyboard rove · uncapped panel (the default)', () => {
	pressBenches((rung) => rung.uncapped, 'ArrowDown', 'ArrowDown')
})

describe('menu · keyboard rove · capped panel (a real scroller)', () => {
	pressBenches((rung) => rung.capped, 'ArrowDown', 'ArrowDown')
})

/**
 * A fake clock for the type-ahead buffer's timer alone, set up around each
 * rung's warmup and run. Vitest hands a bench no hook that runs between
 * iterations, so the reset runs inside the timed region, and the floor rung
 * below prices it.
 */
const FAKE_CLOCK = {
	setup: () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
	},
	teardown: () => {
		vi.useRealTimers()
	},
}

describe('menu · typeahead · uncapped panel', () => {
	// The buffer clears after an idle window, and each press restarts that timer.
	// A bench presses far faster than the window, so on a real clock the query
	// gains one letter on each iteration, and the match walks the whole of it.
	// Each press here fires the reset after it, so every press starts from an
	// empty buffer.
	for (const rung of rungs) {
		bench(
			`${rung.count} rows · one letter`,
			() => {
				pressKey(rung.uncapped.trigger, 'o')

				vi.runOnlyPendingTimers()
			},
			{ ...WINDOW.settled, ...FAKE_CLOCK },
		)
	}

	// What the reset adds to each rung above: one fake timer, scheduled and fired.
	bench(
		'fake clock · one timer, scheduled and fired',
		() => {
			setTimeout(() => {}, 500)

			vi.runOnlyPendingTimers()
		},
		{ ...WINDOW.settled, ...FAKE_CLOCK },
	)
})
