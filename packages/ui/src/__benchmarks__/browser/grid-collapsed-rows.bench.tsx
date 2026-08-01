/**
 * What resting a grouped grid's collapsed leaf rows in `<Activity mode="hidden">`
 * saves on the visible commit — and where the boundary has to sit for the saving
 * to be real.
 *
 * A grouped body stands virtualization down, so every leaf of every group is
 * mounted whatever its group's expansion, and a body-wide update re-renders the
 * collapsed ones alongside the visible few. A hidden Activity does not delete
 * that work — its children still render, at a lower priority, and their DOM
 * still catches up — but it moves the work off the synchronous commit, so what
 * the user waits on is the expanded rows alone.
 *
 * `flushSync` is therefore the measurement: it returns when the visible commit
 * lands, before React runs whatever it deferred.
 *
 * The two rested bars differ only in where the boundary sits, which is the whole
 * point. React defers what is *below* an Activity and nothing above it, so a row
 * that wraps its own `<tr>` — `RowInside`, the shape a row component reaches for
 * first — still runs its body on the visible commit: the props object, the class
 * join, the per-column element map. Only its children's fibers are deferred.
 * Hoisting the boundary above the row body — `RowAbove`, a hold shell around a
 * separate body component — is what actually takes the row off the commit.
 *
 * Shaped after the module's grouped body rather than importing it: `Grid` owns
 * the engine, the column model, and the reveal recipe, none of which this
 * measures. The per-row work below stands in for what a real leaf row does
 * before it returns — enough of it that the two boundaries are distinguishable.
 */

import { Activity, Fragment, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { bench, describe } from 'vitest'

const GROUPS = 20

const LEAVES_PER_GROUP = 25

const CELLS = 5

/** Stable identity per group, leaf, and column, so the keys below aren't list indices. */
const ids = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, index) => `${prefix}${index}`)

const GROUP_IDS = ids('g', GROUPS)

const LEAF_IDS = ids('l', LEAVES_PER_GROUP)

const CELL_IDS = ids('c', CELLS)

/** One leaf cell, sized so a row's render is a handful of elements rather than one text node. */
function Cell({ tick, col }: { tick: number; col: string }) {
	return (
		<td>
			<div>
				<span>{`r${tick}`}</span>
				<span>{col}</span>
			</div>
		</td>
	)
}

/**
 * The per-row work a real leaf row does before it returns: the shared row-shell
 * props object, a class join, and one element per column.
 */
function rowBody(tick: number, expanded: boolean) {
	const shell = {
		'data-row': `r${tick}`,
		'aria-hidden': expanded ? undefined : true,
		inert: !expanded,
		className: ['group/row', expanded && 'is-open', tick % 2 === 0 && 'even']
			.filter(Boolean)
			.join(' '),
	}

	return (
		<tr {...shell}>
			{CELL_IDS.map((col) => (
				<Cell key={col} tick={tick} col={col} />
			))}
		</tr>
	)
}

/** Boundary inside the row: the body runs on the visible commit, only its children defer. */
function RowInside({ tick, expanded, rest }: { tick: number; expanded: boolean; rest: boolean }) {
	const row = rowBody(tick, expanded)

	if (!rest) return row

	return <Activity mode={expanded ? 'visible' : 'hidden'}>{row}</Activity>
}

/** The row body as its own component, so an Activity above it defers the body too. */
function RowBody({ tick, expanded }: { tick: number; expanded: boolean }) {
	return rowBody(tick, expanded)
}

/** Boundary above the row body: the hold shell renders, the body defers with its children. */
function RowAbove({ tick, expanded, rest }: { tick: number; expanded: boolean; rest: boolean }) {
	const body = <RowBody tick={tick} expanded={expanded} />

	if (!rest) return body

	return <Activity mode={expanded ? 'visible' : 'hidden'}>{body}</Activity>
}

type RowComponent = typeof RowInside

/** One grouped body: `expandedGroups` groups are open, the rest collapsed. */
function Body({
	tick,
	Row,
	rest,
	expandedGroups,
}: {
	tick: number
	Row: RowComponent
	rest: boolean
	expandedGroups: number
}) {
	return (
		<table>
			<tbody>
				{GROUP_IDS.map((group, index) => {
					const expanded = index < expandedGroups

					return (
						<Fragment key={group}>
							{LEAF_IDS.map((leaf) => (
								<Row key={leaf} tick={tick} expanded={expanded} rest={rest} />
							))}
						</Fragment>
					)
				})}
			</tbody>
		</table>
	)
}

/** Mounts one body and returns the driver that ticks it under `flushSync`. */
function mount(Row: RowComponent, rest: boolean, expandedGroups: number) {
	const host = document.createElement('div')

	document.body.append(host)

	const root = createRoot(host)

	let set: (tick: number) => void = () => {}

	function Probe() {
		const [tick, setTick] = useState(0)

		set = setTick

		return <Body tick={tick} Row={Row} rest={rest} expandedGroups={expandedGroups} />
	}

	flushSync(() => root.render(<Probe />))

	let tick = 0

	return () => {
		tick += 1

		flushSync(() => set(tick))
	}
}

const WINDOW = { time: 2_500 }

const live = mount(RowInside, false, 1)

const restedInside = mount(RowInside, true, 1)

const restedAbove = mount(RowAbove, true, 1)

const allExpandedLive = mount(RowInside, false, GROUPS)

const allExpandedRested = mount(RowInside, true, GROUPS)

describe('grid · grouped body · collapsed-row update', () => {
	// One group open, the other 19 collapsed but live: all 500 rows re-render on
	// the synchronous commit, which is what the module did before the hold.
	bench('collapsed rows live', () => live(), WINDOW)

	// Held, but from inside the row — the 475 collapsed row bodies still run.
	bench('rested · boundary inside the row', () => restedInside(), WINDOW)

	// Held from above the row body, which is what actually defers it.
	bench('rested · boundary above the row', () => restedAbove(), WINDOW)

	// The ceiling: every group open, so nothing can be deferred. Against
	// `collapsed rows live` it shows what collapsing bought before the hold —
	// nothing, since a zero-height row still renders.
	bench('all expanded · live', () => allExpandedLive(), WINDOW)

	// The same fully-expanded body with every row carrying the wrapper it can
	// never use: the price the hold charges a grid that collapses nothing.
	bench('all expanded · rested', () => allExpandedRested(), WINDOW)
})
