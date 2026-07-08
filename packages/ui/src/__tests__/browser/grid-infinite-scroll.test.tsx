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

/**
 * `stableColumnWidths` freezes the auto-fit column widths against appended
 * batches: a wide row scrolling in past the initial fit truncates to the frozen
 * width instead of reflowing the columns. Only observable over the real
 * virtualizer + layout (jsdom neither windows rows nor measures widths).
 */
describe('grid infinite scroll — stable column widths (real browser)', () => {
	type WideRow = { id: number; label: string }

	const wideColumns: GridColumn<WideRow>[] = [
		{ id: 'label', title: 'Label', cell: (row) => row.label },
		{ id: 'id', title: 'ID', cell: (row) => row.id },
	]

	// The first 50 rows are short; every row past them carries a very long label, so
	// the batch that appends them would widen the label column unless it's frozen.
	const wideRows: WideRow[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		label: i < 50 ? `Row ${i + 1}` : `Row ${i + 1} ${'wide '.repeat(30)}`,
	}))

	const getKey = (row: WideRow) => row.id

	function WideInfiniteGrid({ stable }: { stable: boolean }) {
		const [count, setCount] = useState(50)

		const rows = useMemo(() => wideRows.slice(0, count), [count])

		return (
			<div style={{ width: '360px' }}>
				<Grid
					columns={wideColumns}
					rows={rows}
					getKey={getKey}
					virtualize={{ estimateSize: 36 }}
					maxHeight="180px"
					infiniteScroll={{
						onLoadMore: () => setCount((c) => Math.min(c + 50, wideRows.length)),
						hasMore: count < wideRows.length,
						stableColumnWidths: stable,
					}}
				/>
			</div>
		)
	}

	// The label column's frozen width, read off the fixed-layout `<colgroup>`.
	const labelWidth = (container: HTMLElement) =>
		(container.querySelector('colgroup col') as HTMLElement | null)?.style.width ?? ''

	/** Scroll to the wide tail, appending batches until the last (wide) row renders. */
	async function loadWideTail(container: HTMLElement) {
		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		await waitFor(
			() => {
				scroll.scrollTop = scroll.scrollHeight

				fireEvent.scroll(scroll)

				expect(screen.queryByText(/Row 200/)).not.toBeNull()
			},
			{ timeout: 5000 },
		)
	}

	it('holds the column widths steady as wider batches append', async () => {
		const { container } = renderUI(<WideInfiniteGrid stable />)

		await waitFor(() => expect(screen.queryByText('Row 1')).not.toBeNull())

		// Let the web-font settle re-fit land before snapshotting the initial width.
		await document.fonts.ready

		const initial = labelWidth(container)

		expect(initial).not.toBe('')

		await loadWideTail(container)

		// The wide tail loaded, but the frozen fit never re-measured it — the label
		// column holds its initial width to the pixel.
		expect(labelWidth(container)).toBe(initial)
	})

	it('widens the columns for wider batches without the freeze', async () => {
		const { container } = renderUI(<WideInfiniteGrid stable={false} />)

		await waitFor(() => expect(screen.queryByText('Row 1')).not.toBeNull())

		await document.fonts.ready

		const initial = Number.parseFloat(labelWidth(container))

		await loadWideTail(container)

		// Without the freeze the appended wide rows re-fit the label column wider than
		// its initial short-content fit — the shift `stableColumnWidths` suppresses.
		await waitFor(() => expect(Number.parseFloat(labelWidth(container))).toBeGreaterThan(initial))
	})
})
