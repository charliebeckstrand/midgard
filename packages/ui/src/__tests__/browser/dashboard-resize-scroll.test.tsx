import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { fireEvent, frames, getSlot, present, renderUI, screen } from '../helpers'
import { lastEntry, useControlledLayout } from '../helpers/dashboard-board'

/**
 * A resize of a dashboard tile in a scroll box. jsdom lays nothing out and
 * scrolls nothing, so the travel of a pointer through a scroll runs here.
 */
describe('dashboard resize in a scroll box (real browser)', () => {
	// At 384 px, a column is 16 px and a row is 4 px.
	const LAYOUT: DashboardLayoutItem[] = [{ id: 'a', x: 0, y: 0, w: 24, h: 20 }]

	type BoardProps = {
		initial?: DashboardLayoutItem[]
		onLayout?: (next: DashboardLayoutItem[]) => void
	}

	function Board({ initial = LAYOUT, onLayout }: BoardProps) {
		return (
			<div data-testid="scroller" style={{ width: 384, height: 300, overflowY: 'auto' }}>
				<Dashboard
					aria-label="Board"
					editing
					gap={0}
					layout={useControlledLayout(initial, onLayout)}
				>
					<DashboardTile id="a" title="A" minWidth={0} />
				</Dashboard>

				<div style={{ height: 1000 }} />
			</div>
		)
	}

	/** The south splitter of the tile. */
	const southSplitter = () =>
		present(screen.getAllByRole('separator', { name: 'Resize A' })[1], 'the south splitter')

	it('counts a scroll during a pointer resize into the travel of the edge', async () => {
		const onLayout = vi.fn()

		renderUI(<Board onLayout={onLayout} />)

		const south = southSplitter()

		const scroller = screen.getByTestId('scroller')

		const box = south.getBoundingClientRect()

		const x = box.left + box.width / 2

		const y = box.top + box.height / 2

		const pointer = { pointerId: 1, isPrimary: true, button: 0, clientX: x }

		fireEvent.pointerDown(south, { ...pointer, clientY: y })

		// 40 px is 10 rows.
		fireEvent.pointerMove(south, { ...pointer, clientY: y + 40 })

		await frames()

		const readout = getSlot(present(scroller, 'the scroller'), 'dashboard-resize-readout')

		expect(readout).toHaveTextContent('24 × 30')

		// The scroll moves the content 100 px under a still pointer, so the edge follows by 25 rows.
		scroller.scrollTop = 100

		await frames()

		expect(readout).toHaveTextContent('24 × 55')

		// 20 px more in the client is 5 rows more.
		fireEvent.pointerMove(south, { ...pointer, clientY: y + 60 })

		fireEvent.pointerUp(south, { ...pointer, clientY: y + 60 })

		expect(lastEntry(onLayout, 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 24, h: 60 })
	})

	it('keeps a focused south splitter in the scroll box through its keyboard steps', async () => {
		// The splitter starts at 240 px of the 300 px box, and 30 steps put it at 360 px.
		renderUI(<Board initial={[{ id: 'a', x: 0, y: 0, w: 24, h: 60 }]} />)

		const south = southSplitter()

		const scroller = screen.getByTestId('scroller')

		south.focus()

		for (let step = 0; step < 30; step++) await userEvent.keyboard('{ArrowDown}')

		expect(south).toHaveAttribute('aria-valuenow', '90')

		expect(south).toHaveFocus()

		const view = scroller.getBoundingClientRect()

		const box = south.getBoundingClientRect()

		expect(scroller.scrollTop).toBeGreaterThan(0)

		expect(box.top).toBeGreaterThanOrEqual(view.top)

		expect(box.bottom).toBeLessThanOrEqual(view.bottom)
	})
})
