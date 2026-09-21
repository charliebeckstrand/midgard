/**
 * What a pointer sweep across an open dropdown costs in a real engine.
 *
 * A dropdown keeps focus on its trigger, so each arrival moves a `data-active`
 * cursor rather than focus. The level reads the row off the event and repoints
 * the trigger's `aria-activedescendant` at it.
 *
 * The corridor rung is the one jsdom cannot report at all. With a submenu open,
 * every arrival on a sibling row measures that panel. The level reads the
 * pointer's course off that rect. The jsdom engine returns a 0×0 rect, so the
 * travel test exits before it reads anything. Here it does read, once per
 * move.
 *
 * Each sweep visits every row once, so a rung's cost is its row count times
 * whatever one arrival pays. The points are resolved at mount, so no sample
 * carries the layout read that resolving them needs.
 */

import { bench, describe } from 'vitest'
import { WINDOW } from './harness'
import { openCorridor, openDropdown, pointerAt, ROWS } from './menu-probe'

const plain = new Map<number, Awaited<ReturnType<typeof openDropdown>>>()

for (const count of ROWS) {
	plain.set(count, await openDropdown(count, false, `menu-sweep-${count}`))
}

const corridor = await openCorridor(24, 'menu-corridor')

describe('menu · pointer sweep · no submenu open', () => {
	for (const count of ROWS) {
		const probe = plain.get(count) as Awaited<ReturnType<typeof openDropdown>>

		bench(
			`${count} rows · one pass`,
			() => {
				for (const { row, x, y } of probe.points) pointerAt(row, x, y)
			},
			WINDOW.settled,
		)
	}
})

describe('menu · pointer sweep · submenu open (travel test runs)', () => {
	// Every arrival here measures the open submenu panel, which the rung above
	// never touches. Held beside `24 rows · one pass` it prices that read.
	bench(
		'24 rows · one pass',
		() => {
			for (const { row, x, y } of corridor.points) pointerAt(row, x, y)
		},
		WINDOW.settled,
	)
})
