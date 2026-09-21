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
import {
	CORRIDOR_ROWS,
	MENU_ROWS,
	openCorridor,
	openDropdown,
	type Probe,
	pointerMove,
} from './menu-probe'

const plain: { count: number; probe: Probe }[] = []

for (const count of MENU_ROWS) {
	plain.push({ count, probe: await openDropdown(count, false, `menu-sweep-${count}`) })
}

const corridor = await openCorridor('menu-corridor')

describe('menu · pointer sweep · no submenu open', () => {
	for (const { count, probe } of plain) {
		bench(
			`${count} rows · one pass`,
			() => {
				for (const { row, x, y } of probe.points) pointerMove(row, x, y)
			},
			WINDOW.settled,
		)
	}
})

describe('menu · pointer sweep · submenu open (travel test runs)', () => {
	// Every arrival here measures the open submenu panel, which the rungs above
	// never touch. Held beside the plain rung of the same size it prices that read.
	bench(
		`${CORRIDOR_ROWS} rows · one pass`,
		() => {
			for (const { row, x, y } of corridor.points) pointerMove(row, x, y)
		},
		WINDOW.settled,
	)
})
