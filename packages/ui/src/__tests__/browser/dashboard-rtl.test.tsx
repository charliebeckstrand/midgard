import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { renderUI, screen } from '../helpers'

/**
 * A right-to-left board mirrors the saved layout in CSS: the grid puts column 0
 * at the right edge. jsdom lays nothing out, so the placement of the tiles and
 * the splitters, and a real pointer resize, run here.
 */
describe('dashboard right to left (real browser)', () => {
	// At 960 px, a column is 40 px.
	const LAYOUT: DashboardLayoutItem[] = [
		{ id: 'a', x: 0, y: 0, w: 6, h: 10 },
		{ id: 'b', x: 12, y: 0, w: 6, h: 10 },
	]

	function Board({ onLayout }: { onLayout?: (next: DashboardLayoutItem[]) => void }) {
		const [value, setValue] = useState(LAYOUT)

		return (
			<div dir="rtl" style={{ width: 960 }}>
				<Dashboard
					aria-label="Board"
					editing
					gap={0}
					layout={{
						value,
						onValueChange: (next) => {
							onLayout?.(next)

							setValue(next)
						},
					}}
				>
					<DashboardTile id="a" title="A" minWidth={0} />

					<DashboardTile id="b" title="B" minWidth={0} />
				</Dashboard>
			</div>
		)
	}

	const rect = (element: Element | undefined) => (element as Element).getBoundingClientRect()

	it('puts column 0 at the right edge of the board', () => {
		renderUI(<Board />)

		const board = rect(screen.getByRole('region', { name: 'Board' }))

		const a = rect(screen.getByRole('group', { name: 'A' }))

		const b = rect(screen.getByRole('group', { name: 'B' }))

		expect(a.right).toBeCloseTo(board.right, 0)

		expect(b.right).toBeCloseTo(board.right - 12 * 40, 0)
	})

	it('puts the end splitter on the left edge, and slants the corner cursor for it', () => {
		renderUI(<Board />)

		const shell = screen.getByRole('group', { name: 'A' }).closest('[data-slot="dashboard-tile"]')

		const edge = (name: string) => shell?.querySelector(`[data-edge="${name}"]`) ?? undefined

		const tile = rect(shell ?? undefined)

		expect(rect(edge('e')).left).toBeCloseTo(tile.left, 0)

		expect(rect(edge('se')).left).toBeCloseTo(tile.left, 0)

		expect(getComputedStyle(edge('se') as Element).cursor).toBe('nesw-resize')
	})

	it('grows a tile when a pointer drags its end splitter to the left', async () => {
		const onLayout = vi.fn()

		renderUI(<Board onLayout={onLayout} />)

		const [end] = screen.getAllByRole('separator', { name: 'Resize A' })

		const board = screen.getByRole('region', { name: 'Board' })

		const from = rect(end)

		const frame = rect(board)

		// Two columns to the left of the splitter's centre, on the board.
		await userEvent.dragAndDrop(end as Element, board, {
			sourcePosition: { x: from.width / 2, y: from.height / 2 },
			targetPosition: {
				x: from.left + from.width / 2 - 80 - frame.left,
				y: from.top + from.height / 2 - frame.top,
			},
		})

		const next = onLayout.mock.lastCall?.[0] as DashboardLayoutItem[] | undefined

		expect(next?.find((item) => item.id === 'a')).toEqual({ id: 'a', x: 0, y: 0, w: 8, h: 10 })
	})
})
