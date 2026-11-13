import { describe, expect, it } from 'vitest'
import { ChartHeaderActionsFallback, ScatterChart, SeatChart } from '../../../modules/chart'
import { HeaderActions, HeaderActionsSlot } from '../../../primitives/header-actions'
import { attach, present } from '../../helpers'
import { hydrate, serverMarkup } from '../../helpers/hydrate'

/**
 * A chart puts its buttons in the header row of a box with a portal, which
 * needs the element of the slot. The server render thus had no buttons, and
 * they came into the row at hydration. A fallback in the slot draws the same
 * buttons in the server render. These tests hold the button at the same box
 * before and after the hydration, with one copy on the screen.
 */
const GROUPS = [
	{ seats: 47, color: 'blue', label: 'Democrats' },
	{ seats: 53, color: 'red', label: 'Republicans' },
] as const

const chart = (
	<SeatChart
		aria-label="Senate seats"
		groups={[...GROUPS]}
		contextMenu={{ button: true }}
		height={200}
	/>
)

const box = (
	<HeaderActions slotted>
		<div style={{ width: 360 }}>
			<div className="flex min-h-9 justify-between">
				<span>Senate</span>

				<div className="flex items-center gap-1">
					<HeaderActionsSlot>
						<ChartHeaderActionsFallback chart={chart} />
					</HeaderActionsSlot>
				</div>
			</div>

			{chart}
		</div>
	</HeaderActions>
)

/** The buttons of a slot that show, with their boxes. */
function shown(container: Element) {
	return [...container.querySelectorAll('[data-slot="chart-view-data"]')]
		.filter((node) => node.getClientRects().length > 0)
		.map((node) => {
			const { left, top, right, bottom } = node.getBoundingClientRect()

			return { label: node.getAttribute('aria-label'), box: { left, top, right, bottom } }
		})
}

describe('chart buttons in the header row before the mount (real browser)', () => {
	it('draws the buttons in the server render where the chart puts them', () => {
		const container = attach(serverMarkup(box))

		const before = shown(container)

		expect(before).toHaveLength(1)

		const { onRecoverableError } = hydrate(container, box)

		expect(onRecoverableError).not.toHaveBeenCalled()

		const fallback = present(
			container.querySelector('[data-slot="header-actions-fallback"]'),
			'the fallback',
		)

		// The chart has put its own buttons in the slot, and the fallback hides.
		expect(container.querySelector('[data-slot="chart-header-actions"]')).not.toBeNull()

		expect(getComputedStyle(fallback).display).toBe('none')

		const after = shown(container)

		expect(after).toHaveLength(1)

		const [server] = before

		if (!server) throw new Error('expected the button of the server render')

		expect(after[0]?.label).toBe(server.label)

		expect(after[0]?.box).toMatchBox(server.box)

		// The touch menu button shows only on a coarse pointer, which this browser
		// cannot emulate. The two copies have the same box rules.
		const menuBox = (root: Element) =>
			root.querySelector('[data-slot="chart-menu-button"]')?.getAttribute('class')

		expect(menuBox(fallback)).toBe(
			menuBox(present(container.querySelector('[data-slot="chart-header-actions"]'), 'the row')),
		)
	})

	// A scatter chart with rows but no row where the x and the y are numbers has
	// no readout, and so no View data button in the row. The fallback reads only
	// whether the chart has rows, so it draws the button until the mount. The
	// chart then claims the slot with an empty row, and the fallback hides.
	it('hides the fallback of a chart that puts no button in the row', () => {
		const empty = (
			<ScatterChart
				aria-label="Turnout"
				data={[{ age: null, turnout: null }]}
				series={[{ xKey: 'age', yKey: 'turnout' }]}
				height={200}
			/>
		)

		const emptyBox = (
			<HeaderActions slotted>
				<div style={{ width: 360 }}>
					<div className="flex min-h-9 justify-between">
						<span>Turnout</span>

						<HeaderActionsSlot>
							<ChartHeaderActionsFallback chart={empty} />
						</HeaderActionsSlot>
					</div>

					{empty}
				</div>
			</HeaderActions>
		)

		const container = attach(serverMarkup(emptyBox))

		expect(shown(container)).toHaveLength(1)

		const { onRecoverableError } = hydrate(container, emptyBox)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(shown(container)).toEqual([])
	})
})
