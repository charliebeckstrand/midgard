import { describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
} from '../../modules/dashboard'
import { getSlot, renderUI, screen } from '../helpers'
import {
	ControlledDashboard,
	lastEntry,
	pressSplitter,
	stubCanvasWidth,
} from '../helpers/dashboard-board'

stubCanvasWidth()

describe('DashboardTile limits', () => {
	it('stops a keyboard resize at maxSize, and commits nothing past it', () => {
		const onLayout = vi.fn()

		renderUI(
			<ControlledDashboard
				aria-label="Board"
				editing
				initial={[{ id: 'a', x: 0, y: 0, w: 9, h: 10 }]}
				onLayout={onLayout}
			>
				<DashboardTile id="a" minWidth={0} maxSize={{ w: 10, h: 11 }} />
			</ControlledDashboard>,
		)

		pressSplitter('a', 0, 'ArrowRight')

		pressSplitter('a', 0, 'ArrowRight')

		pressSplitter('a', 1, 'ArrowDown')

		pressSplitter('a', 1, 'ArrowDown')

		expect(onLayout).toHaveBeenCalledTimes(2)

		expect(lastEntry(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 10, h: 11 })
	})

	it('reads a minWidth that is not a usable number as no floor, so a resize commits a width', () => {
		const onLayout = vi.fn()

		renderUI(
			<ControlledDashboard
				aria-label="Board"
				editing
				initial={[{ id: 'a', x: 0, y: 0, w: 5, h: 9 }]}
				onLayout={onLayout}
			>
				<DashboardTile id="a" minWidth={Number.NaN} />
			</ControlledDashboard>,
		)

		pressSplitter('a', 0, 'ArrowRight')

		expect(lastEntry(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 6, h: 9 })
	})

	it('stops a keyboard resize at minSize', () => {
		const onLayout = vi.fn()

		renderUI(
			<ControlledDashboard
				aria-label="Board"
				editing
				initial={[{ id: 'a', x: 0, y: 0, w: 5, h: 9 }]}
				onLayout={onLayout}
			>
				<DashboardTile id="a" minWidth={0} minSize={{ w: 4, h: 8 }} />
			</ControlledDashboard>,
		)

		for (let press = 0; press < 3; press += 1) {
			pressSplitter('a', 0, 'ArrowLeft')

			pressSplitter('a', 1, 'ArrowUp')
		}

		expect(onLayout).toHaveBeenCalledTimes(2)

		expect(lastEntry(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 4, h: 8 })
	})

	it('floors the width at the span that minWidth needs when it is larger', () => {
		const onLayout = vi.fn()

		// At a 50 px pitch and a 12 px gap, 320 px needs 7 columns.
		renderUI(
			<ControlledDashboard
				aria-label="Board"
				editing
				initial={[{ id: 'a', x: 0, y: 0, w: 8, h: 10 }]}
				onLayout={onLayout}
			>
				<DashboardTile id="a" minWidth={320} minSize={{ w: 2 }} />
			</ControlledDashboard>,
		)

		pressSplitter('a', 0, 'ArrowLeft')

		pressSplitter('a', 0, 'ArrowLeft')

		expect(onLayout).toHaveBeenCalledTimes(1)

		expect(lastEntry(onLayout, 'a')).toMatchObject({ w: 7 })
	})

	it('reports the range of the limits on each splitter, where the arrow keys stop', () => {
		renderUI(
			<ControlledDashboard
				aria-label="Board"
				editing
				initial={[{ id: 'a', x: 0, y: 0, w: 8, h: 10 }]}
			>
				<DashboardTile id="a" minWidth={0} minSize={{ w: 6, h: 4 }} maxSize={{ w: 10, h: 30 }} />
			</ControlledDashboard>,
		)

		const splitter = (edge: 0 | 1) => screen.getAllByRole('separator', { name: 'Resize a' })[edge]

		expect(splitter(0)).toHaveAttribute('aria-valuemin', '6')

		expect(splitter(0)).toHaveAttribute('aria-valuemax', '10')

		expect(splitter(1)).toHaveAttribute('aria-valuemin', '4')

		expect(splitter(1)).toHaveAttribute('aria-valuemax', '30')

		for (let press = 0; press < 4; press += 1) pressSplitter('a', 0, 'ArrowLeft')

		expect(splitter(0)).toHaveAttribute('aria-valuenow', '6')

		for (let press = 0; press < 6; press += 1) pressSplitter('a', 0, 'ArrowRight')

		expect(splitter(0)).toHaveAttribute('aria-valuenow', '10')
	})

	it('reports the minWidth floor as the least width, and the right edge as the most', () => {
		// At a 50 px pitch and a 12 px gap, the default minWidth of 320 px needs 7 columns.
		renderUI(
			<Dashboard
				aria-label="Board"
				editing
				layout={{ value: [{ id: 'a', x: 4, y: 0, w: 8, h: 10 }] }}
			>
				<DashboardTile id="a" />
			</Dashboard>,
		)

		const [east, south] = screen.getAllByRole('separator', { name: 'Resize a' })

		expect(east).toHaveAttribute('aria-valuemin', '7')

		expect(east).toHaveAttribute('aria-valuemax', '20')

		expect(south).toHaveAttribute('aria-valuemin', '1')

		expect(south).not.toHaveAttribute('aria-valuemax')
	})

	it('places a new tile within its limits', () => {
		const { container } = renderUI(
			<Dashboard aria-label="Board">
				<DashboardTile
					id="a"
					minWidth={0}
					defaultSize={{ w: 20, h: 40 }}
					maxSize={{ w: 12, h: 30 }}
				/>
			</Dashboard>,
		)

		expect(getSlot(container, 'dashboard-tile').style.gridArea).toBe('1 / 1 / span 30 / span 12')
	})
})

describe('DashboardWidget limits', () => {
	const WIDGETS: Readonly<Record<string, DashboardWidget>> = {
		stat: { render: () => <p>Stat</p>, minWidth: 0, maxSize: { w: 6 } },
	}

	const TILES: DashboardSpecTile[] = [{ id: 'units', widget: 'stat', title: 'Units' }]

	it('hands the limits of the kind to each of its tiles', () => {
		const onLayout = vi.fn()

		renderUI(
			<DashboardWidgetProvider widgets={WIDGETS}>
				<ControlledDashboard
					aria-label="Board"
					editing
					initial={[{ id: 'units', x: 0, y: 0, w: 5, h: 10 }]}
					onLayout={onLayout}
				>
					<DashboardTiles tiles={TILES} />
				</ControlledDashboard>
			</DashboardWidgetProvider>,
		)

		pressSplitter('Units', 0, 'ArrowRight')

		pressSplitter('Units', 0, 'ArrowRight')

		expect(onLayout).toHaveBeenCalledTimes(1)

		expect(lastEntry(onLayout, 'units')).toEqual({ id: 'units', x: 0, y: 0, w: 6, h: 10 })
	})
})
