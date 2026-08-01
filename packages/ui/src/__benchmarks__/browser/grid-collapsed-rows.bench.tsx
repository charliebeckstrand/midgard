/**
 * Bounds what resting a grouped grid's collapsed leaf rows in
 * `<Activity mode="hidden">` saves on the visible commit.
 *
 * A grouped body stands virtualization down, so every leaf of every group is
 * mounted whatever its group's expansion, and a body-wide update re-renders the
 * collapsed ones alongside the visible few. A hidden Activity does not delete
 * that work — its children still render and their DOM still catches up — but it
 * moves the work off the synchronous commit, so what the user waits on is the
 * expanded rows alone.
 *
 * `flushSync` is therefore the measurement: it returns when the visible commit
 * lands, before React runs whatever it deferred. The two bars are the same tree
 * and the same update, differing only in whether the collapsed rows sit inside a
 * hidden Activity; their gap is the latency the change buys per update, and the
 * `all expanded` bar is the ceiling — the cost when nothing can be deferred.
 *
 * Shaped after the module's grouped body rather than importing it: `Grid` owns
 * the engine, the column model, and the reveal recipe, none of which this
 * measures. The row and cell counts below track a realistic grouped page.
 */

import { Activity, type ReactNode, useState } from 'react'
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

function Leaf({ tick }: { tick: number }) {
	return (
		<tr>
			{CELL_IDS.map((col) => (
				<Cell key={col} tick={tick} col={col} />
			))}
		</tr>
	)
}

/** Wraps a collapsed group's leaves per the mode under test. */
function Hold({ rested, children }: { rested: boolean; children: ReactNode }) {
	if (!rested) return children

	return <Activity mode="hidden">{children}</Activity>
}

/**
 * One grouped body. `expandedGroups` groups are open and re-render visibly; the
 * rest are collapsed, and `rest` decides whether they are held in a hidden
 * Activity or left live the way the module renders them today.
 */
function Body({
	tick,
	rest,
	expandedGroups,
}: {
	tick: number
	rest: boolean
	expandedGroups: number
}) {
	return (
		<table>
			<tbody>
				{GROUP_IDS.map((group, index) => {
					const expanded = index < expandedGroups

					return (
						<Hold key={group} rested={rest && !expanded}>
							{LEAF_IDS.map((leaf) => (
								<Leaf key={leaf} tick={tick} />
							))}
						</Hold>
					)
				})}
			</tbody>
		</table>
	)
}

/** Mounts one body and returns the driver that ticks it under `flushSync`. */
function mount(rest: boolean, expandedGroups: number) {
	const host = document.createElement('div')

	document.body.append(host)

	const root = createRoot(host)

	let set: (tick: number) => void = () => {}

	function Probe() {
		const [tick, setTick] = useState(0)

		set = setTick

		return <Body tick={tick} rest={rest} expandedGroups={expandedGroups} />
	}

	flushSync(() => root.render(<Probe />))

	let tick = 0

	return () => {
		tick += 1

		flushSync(() => set(tick))
	}
}

const WINDOW = { time: 2_500 }

const live = mount(false, 1)

const rested = mount(true, 1)

const allExpanded = mount(false, GROUPS)

describe('grid · grouped body · collapsed-row update', () => {
	// Today's shape: one group open, the other 19 collapsed but live, so all 500
	// rows re-render on the synchronous commit.
	bench('collapsed rows live', () => live(), WINDOW)

	// The same update with the 19 collapsed groups held in a hidden Activity: the
	// commit carries the 25 visible rows and defers the other 475.
	bench('collapsed rows rested', () => rested(), WINDOW)

	// The ceiling: every group open, so nothing can be deferred. The gap between
	// this and `collapsed rows live` is what the collapsed rows cost today.
	bench('all expanded (ceiling)', () => allExpanded(), WINDOW)
})
