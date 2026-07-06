import { useMemo, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * Infinite scroll over the real virtualizer (jsdom renders zero windowed rows,
 * so end-detection can't be driven there). Scrolling the windowed container to
 * the loaded end trips `onLoadMore`, which grows the row set — the end-to-end
 * path the pure `shouldLoadMore` seam and the boundary render tests can't
 * exercise. A full initial window, still far from the end, leaves it untripped.
 */
describe('grid infinite scroll (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const allRows: Row[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
	}))

	const getKey = (row: Row) => row.id

	/** Local infinite scroll: the grid renders a growing slice of `allRows`. */
	function InfiniteGrid({ onLoadMore }: { onLoadMore: () => void }) {
		const [count, setCount] = useState(50)

		const rows = useMemo(() => allRows.slice(0, count), [count])

		return (
			<div style={{ width: '320px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					virtualize={{ estimateSize: 36 }}
					maxHeight="180px"
					infiniteScroll={{
						onLoadMore: () => {
							onLoadMore()

							setCount((c) => Math.min(c + 50, allRows.length))
						},
						hasMore: count < allRows.length,
					}}
				/>
			</div>
		)
	}

	it('calls onLoadMore as the window nears the loaded end, growing the set', async () => {
		const onLoadMore = vi.fn()

		const { container } = renderUI(<InfiniteGrid onLoadMore={onLoadMore} />)

		// Virtualization is live: only a window of the 50 loaded rows renders.
		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		// A full window at the top, far from the loaded end, doesn't request more.
		expect(onLoadMore).not.toHaveBeenCalled()

		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		scroll.scrollTop = scroll.scrollHeight

		fireEvent.scroll(scroll)

		// The last rendered row reached the threshold zone, so the grid loaded more.
		await waitFor(() => expect(onLoadMore).toHaveBeenCalled())

		// Keep riding the growing set to its end: each scroll-to-bottom loads the next
		// batch until the final row (beyond the initial 50, only reachable once the set
		// has grown from 50 to the full 200) renders.
		await waitFor(
			() => {
				scroll.scrollTop = scroll.scrollHeight

				fireEvent.scroll(scroll)

				expect(screen.queryByText('Name 200')).not.toBeNull()
			},
			{ timeout: 5000 },
		)
	})
})
