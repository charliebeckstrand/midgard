import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { GridTotalRow } from '../../modules/grid/grid-total-row'
import { GridNavContext, type GridNavStore } from '../../modules/grid/use-grid-navigation'
import { useGridRevealHold } from '../../modules/grid/use-grid-reveal-hold'
import { present, renderUI } from '../helpers'

/**
 * A collapsed row wakes in two commits. The row comes back on screen at the
 * closed track, a forced style flush records that style, and only then does
 * the track open. Without the flush, the browser sees the open style first, and
 * the row snaps open. The compiled run of this test proves that the React
 * Compiler keeps the flush.
 */

it('flushes the styles before a waking row opens', () => {
	const flush = vi.spyOn(document.documentElement, 'getBoundingClientRect')

	const { result, rerender } = renderHook(({ expanded }) => useGridRevealHold(expanded), {
		initialProps: { expanded: false },
	})

	expect(result.current.open).toBe(false)

	flush.mockClear()

	rerender({ expanded: true })

	expect(flush).toHaveBeenCalledTimes(1)

	expect(result.current.open).toBe(true)
})

it('closes a collapsing row with no flush', () => {
	const flush = vi.spyOn(document.documentElement, 'getBoundingClientRect')

	const { result, rerender } = renderHook(({ expanded }) => useGridRevealHold(expanded), {
		initialProps: { expanded: true },
	})

	flush.mockClear()

	rerender({ expanded: false })

	expect(flush).not.toHaveBeenCalled()

	expect(result.current.open).toBe(false)
})

// A windowed body mounts the total of an expanded group with its leaves. The
// leaves mount at the closed track and open over the transition, so the total
// must do the same. Otherwise it shows at full height at once, and the leaves
// above it push it down as they open.
it('mounts an entering group total closed, and opens it after a flush', () => {
	type Row = { id: number; amount: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.id },
		{ id: 'amount', title: 'Amount', cell: (row) => row.amount, aggFunc: 'sum' },
	]

	const tracks: (string | null)[] = []

	vi.spyOn(document.documentElement, 'getBoundingClientRect').mockImplementation(() => {
		const track = document.querySelector('[data-total-row] td > div')

		tracks.push(track?.getAttribute('data-open') ?? null)

		return new DOMRect()
	})

	// A grid with no cursor.
	const nav: GridNavStore = {
		enabled: false,
		subscribe: () => () => {},
		isActive: () => false,
		isInRange: () => false,
		fillHandle: null,
		isStopActive: () => false,
		stopId: (key) => key,
		seatStop: () => {},
		claimReveal: () => false,
		publish: () => {},
	}

	const { container } = renderUI(
		<GridNavContext value={nav}>
			<table>
				<tbody>
					<GridTotalRow<Row>
						columns={columns}
						rows={[{ id: 1, amount: 2 }]}
						pinning={null}
						variant="group"
						expanded
						enter
					/>
				</tbody>
			</table>
		</GridNavContext>,
	)

	// One flush, while the track is still closed.
	expect(tracks).toEqual([null])

	const track = present(container.querySelector('[data-total-row] td > div'), 'total track')

	expect(track).toHaveAttribute('data-open')
})
