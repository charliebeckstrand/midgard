/**
 * What a page pays for the menus nobody has opened.
 *
 * A grid puts a filter menu on every column and an action menu on every row, so
 * the closed menu is the one multiplied. Its panel never renders, because the
 * portal mounts nothing until the menu opens. The cost is the shell around it.
 *
 * The rungs ladder that shell apart, each one a layer further from a bare
 * button. `useMenuState only` is the hook tree: floating-ui's own, the
 * disclosure over it, and the roving handler. `trigger only` adds `MenuTrigger`
 * — its component body, the merged reference ref, and the reference-props
 * pass — with no `MenuContent` to build a panel tree. `closed menus` adds that
 * tree back, which the portal then discards.
 *
 * Read the gaps, not the rows. Each rung contains the one above it, so the step
 * between two is what that layer costs across the whole fan-out.
 */

import type { ReactNode } from 'react'
import { bench, describe } from 'vitest'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { useMenuState } from '../../components/menu/use-menu-state'
import { comboboxOptions } from '../fixtures'
import { reactHost, WINDOW } from './harness'

/** Menus on one page: a per-row action column's worth. */
const FAN_OUT = 50

/** Rows behind each closed menu — never rendered, but written by the consumer. */
const ROWS = 6

const keys = comboboxOptions(FAN_OUT).map((option) => option.value)

const rows = comboboxOptions(ROWS)

/** The rows a consumer writes. A closed menu never renders this component. */
function Rows() {
	return (
		<>
			{rows.map((option) => (
				<MenuItem key={option.value}>
					<MenuLabel>{option.label}</MenuLabel>
				</MenuItem>
			))}
		</>
	)
}

/** The hook tree a menu installs, with none of the elements around it. */
function StateOnly() {
	useMenuState({ placement: 'bottom-start' })

	return <button type="button">Options</button>
}

/** The ladder, each rung one layer further from a bare button. */
const RUNGS: [string, (key: string) => ReactNode][] = [
	[
		'1 · bare buttons',
		(key) => (
			<button key={key} type="button">
				Options
			</button>
		),
	],
	['2 · useMenuState only', (key) => <StateOnly key={key} />],
	[
		'3 · trigger only (no panel to build)',
		(key) => (
			<Menu key={key} placement="bottom-start">
				<MenuTrigger>Options</MenuTrigger>
			</Menu>
		),
	],
	[
		'4 · closed menus (the real thing)',
		(key) => (
			<Menu key={key} placement="bottom-start">
				<MenuTrigger>Options</MenuTrigger>

				<MenuContent>
					<Rows />
				</MenuContent>
			</Menu>
		),
	],
]

describe(`menu · ${FAN_OUT} per mount, closed`, () => {
	for (const [name, render] of RUNGS) {
		bench(
			name,
			() => {
				const mounted = reactHost()

				mounted.render(<div>{keys.map(render)}</div>)

				mounted.destroy()
			},
			WINDOW.slow,
		)
	}
})
