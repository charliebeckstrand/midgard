import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSpecTile,
	DashboardTile,
	DashboardTiles,
	type DashboardWidget,
	DashboardWidgetProvider,
} from '../../modules/dashboard'
import { fireEvent, renderUI, screen } from '../helpers'
import { stubCanvasWidth } from '../helpers/dashboard-board'

stubCanvasWidth()

/** A controlled board that reports each committed layout. */
function Controlled({
	initial,
	onLayout,
	children,
}: {
	initial: DashboardLayoutItem[]
	onLayout: (next: DashboardLayoutItem[]) => void
	children: React.ReactNode
}) {
	const [value, setValue] = useState(initial)

	return (
		<Dashboard
			aria-label="Board"
			editing
			layout={{
				value,
				onValueChange: (next) => {
					onLayout(next)

					setValue(next)
				},
			}}
		>
			{children}
		</Dashboard>
	)
}

/** Presses one arrow key on a splitter of the tile `name`: `0` is the east edge, `1` the south. */
function step(name: string, edge: 0 | 1, key: string): void {
	const splitter = screen.getAllByRole('separator', { name: `Resize ${name}` })[edge]

	fireEvent.keyDown(splitter as HTMLElement, { key })
}

/** The entry of `id` in the last layout that the board committed. */
function last(onLayout: ReturnType<typeof vi.fn>, id: string): DashboardLayoutItem | undefined {
	const layout = onLayout.mock.lastCall?.[0] as DashboardLayoutItem[] | undefined

	return layout?.find((item) => item.id === id)
}

describe('DashboardTile limits', () => {
	it('stops a keyboard resize at maxSize, and commits nothing past it', () => {
		const onLayout = vi.fn()

		renderUI(
			<Controlled initial={[{ id: 'a', x: 0, y: 0, w: 9, h: 10 }]} onLayout={onLayout}>
				<DashboardTile id="a" minWidth={0} maxSize={{ w: 10, h: 11 }} />
			</Controlled>,
		)

		step('a', 0, 'ArrowRight')

		step('a', 0, 'ArrowRight')

		step('a', 1, 'ArrowDown')

		step('a', 1, 'ArrowDown')

		expect(onLayout).toHaveBeenCalledTimes(2)

		expect(last(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 10, h: 11 })
	})

	it('reads a minWidth that is not a usable number as no floor, so a resize commits a width', () => {
		const onLayout = vi.fn()

		renderUI(
			<Controlled initial={[{ id: 'a', x: 0, y: 0, w: 5, h: 9 }]} onLayout={onLayout}>
				<DashboardTile id="a" minWidth={Number.NaN} />
			</Controlled>,
		)

		step('a', 0, 'ArrowRight')

		expect(last(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 6, h: 9 })
	})

	it('stops a keyboard resize at minSize', () => {
		const onLayout = vi.fn()

		renderUI(
			<Controlled initial={[{ id: 'a', x: 0, y: 0, w: 5, h: 9 }]} onLayout={onLayout}>
				<DashboardTile id="a" minWidth={0} minSize={{ w: 4, h: 8 }} />
			</Controlled>,
		)

		for (let press = 0; press < 3; press += 1) {
			step('a', 0, 'ArrowLeft')

			step('a', 1, 'ArrowUp')
		}

		expect(onLayout).toHaveBeenCalledTimes(2)

		expect(last(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 4, h: 8 })
	})

	it('floors the width at the span that minWidth needs when it is larger', () => {
		const onLayout = vi.fn()

		// At a 50 px pitch and a 12 px gap, 320 px needs 7 columns.
		renderUI(
			<Controlled initial={[{ id: 'a', x: 0, y: 0, w: 8, h: 10 }]} onLayout={onLayout}>
				<DashboardTile id="a" minWidth={320} minSize={{ w: 2 }} />
			</Controlled>,
		)

		step('a', 0, 'ArrowLeft')

		step('a', 0, 'ArrowLeft')

		expect(onLayout).toHaveBeenCalledTimes(1)

		expect(last(onLayout, 'a')).toMatchObject({ w: 7 })
	})

	it('places a new tile within its limits', () => {
		const onLayout = vi.fn()

		renderUI(
			<Controlled initial={[]} onLayout={onLayout}>
				<DashboardTile
					id="a"
					minWidth={0}
					defaultSize={{ w: 20, h: 40 }}
					maxSize={{ w: 12, h: 30 }}
				/>
			</Controlled>,
		)

		// A step down from the placed span commits it, so the saved entry shows the placement.
		step('a', 1, 'ArrowUp')

		expect(last(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 12, h: 29 })
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
				<Controlled initial={[{ id: 'units', x: 0, y: 0, w: 5, h: 10 }]} onLayout={onLayout}>
					<DashboardTiles tiles={TILES} />
				</Controlled>
			</DashboardWidgetProvider>,
		)

		step('Units', 0, 'ArrowRight')

		step('Units', 0, 'ArrowRight')

		expect(onLayout).toHaveBeenCalledTimes(1)

		expect(last(onLayout, 'units')).toEqual({ id: 'units', x: 0, y: 0, w: 6, h: 10 })
	})
})
