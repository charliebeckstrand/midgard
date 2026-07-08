import { useMemo, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * Infinite scroll over the real virtualizer (jsdom renders zero windowed rows,
 * so end-detection can't be driven there). Scrolling the windowed container to
 * the loaded end trips `onLoadMore`, which grows the row set — the end-to-end
 * path the pure `resolveLoadMore` seam and the boundary render tests can't
 * exercise. Real layout also backs the firing invariant's window checks: the
 * viewport-fill for an under-filled bounded container, the capped fetches +
 * dev error for an unbounded one (the OOM regression), the scroll-driven
 * retry after a failed fetch, and the reset on row-set replacement.
 */
describe('grid infinite scroll (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const allRows: Row[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
	}))

	const getKey = (row: Row) => row.id

	afterEach(() => {
		vi.restoreAllMocks()
	})

	/** Local infinite scroll: the grid renders a growing slice of `allRows`. */
	function InfiniteGrid({
		onLoadMore,
		initialCount = 50,
		maxHeight = '180px',
	}: {
		onLoadMore: () => void
		initialCount?: number
		maxHeight?: string
	}) {
		const [count, setCount] = useState(initialCount)

		const rows = useMemo(() => allRows.slice(0, count), [count])

		return (
			<div style={{ width: '320px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					virtualize={{ estimateSize: 36 }}
					maxHeight={maxHeight}
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

	it('auto-fills an under-filled bounded viewport without any scroll', async () => {
		const onLoadMore = vi.fn()

		// 2 rows (72px) in a 180px viewport: the loaded rows don't overflow, so the
		// grid fetches to fill — no scroll interaction exists to arm it.
		renderUI(<InfiniteGrid onLoadMore={onLoadMore} initialCount={2} />)

		// The fill fetches until the rows overflow the viewport (180px / 36px ≈ 5
		// rows; one 50-row batch overshoots that), then stops without a scroll.
		await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1))

		const scroll = document.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		await waitFor(() => expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight))

		// Overflow reached: no further fill fires at rest.
		await new Promise((resolve) => setTimeout(resolve, 100))

		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it('holds after an append without a fresh scroll, even inside the threshold', async () => {
		const onLoadMore = vi.fn()

		// Threshold past the batch size: the appended page lands with the window
		// still inside the new end's zone — the once-per-scroll-interaction
		// invariant keeps it from chain-fetching back-to-back.
		function ChainBait() {
			const [count, setCount] = useState(20)

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

								setCount((c) => Math.min(c + 10, allRows.length))
							},
							hasMore: count < allRows.length,
							threshold: 30,
						}}
					/>
				</div>
			)
		}

		const { container } = renderUI(<ChainBait />)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		scroll.scrollTop = scroll.scrollHeight

		fireEvent.scroll(scroll)

		// One scroll interaction, one fire — the 10-row append lands still within
		// the 30-row threshold, but the next fetch waits for the next scroll.
		await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1))

		await new Promise((resolve) => setTimeout(resolve, 150))

		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it('caps the fetches and fails loud when the scroll container is unbounded', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const onLoadMore = vi.fn()

		// The OOM regression: a percentage maxHeight inside an auto-height parent
		// never binds, so the container grows with its content instead of
		// windowing it — every loaded row renders and the load-more condition is
		// permanently true. The firing invariant must cap this at the bounded
		// viewport-fill instead of chain-fetching the entire backend.
		renderUI(<InfiniteGrid onLoadMore={onLoadMore} maxHeight="100%" />)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		// The grid detects the container growing with the appended batch and stops.
		await waitFor(() =>
			expect(error).toHaveBeenCalledWith(expect.stringContaining('not windowing')),
		)

		// At most the bounded fill fired — nothing close to draining the 200-row set.
		expect(onLoadMore.mock.calls.length).toBeLessThanOrEqual(2)

		await new Promise((resolve) => setTimeout(resolve, 150))

		expect(screen.queryByText('Name 200')).toBeNull()
	})

	it('re-arms on scroll after a failed fetch instead of dead-locking', async () => {
		const onLoadMore = vi.fn()

		// A "failing" source: onLoadMore never grows the rows, so the loaded count
		// never re-arms the old latch.
		function FailingGrid() {
			const rows = useMemo(() => allRows.slice(0, 50), [])

			return (
				<div style={{ width: '320px' }}>
					<Grid
						columns={columns}
						rows={rows}
						getKey={getKey}
						virtualize={{ estimateSize: 36 }}
						maxHeight="180px"
						infiniteScroll={{ onLoadMore, hasMore: true }}
					/>
				</div>
			)
		}

		const { container } = renderUI(<FailingGrid />)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		scroll.scrollTop = scroll.scrollHeight

		fireEvent.scroll(scroll)

		await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1))

		// The fetch failed (the count never grew). Scrolling away and back to the
		// end re-arms and retries, where the old count-growth latch dead-locked.
		scroll.scrollTop = 0

		fireEvent.scroll(scroll)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		scroll.scrollTop = scroll.scrollHeight

		fireEvent.scroll(scroll)

		await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(2))
	})

	it('scrolls to the top and holds fire when the row set is replaced', async () => {
		const onLoadMore = vi.fn()

		// Replacement: a "sort/filter change" swaps the accumulated 200 rows for a
		// fresh, shorter first page while the user sits scrolled deep in the old set.
		function ReplaceableGrid() {
			const [replaced, setReplaced] = useState(false)

			const rows = useMemo(
				() => (replaced ? allRows.slice(100, 130) : allRows.slice(0, 200)),
				[replaced],
			)

			return (
				<div style={{ width: '320px' }}>
					<button type="button" onClick={() => setReplaced(true)}>
						Replace
					</button>

					<Grid
						columns={columns}
						rows={rows}
						getKey={getKey}
						virtualize={{ estimateSize: 36 }}
						maxHeight="180px"
						infiniteScroll={{ onLoadMore, hasMore: true }}
					/>
				</div>
			)
		}

		const { container } = renderUI(<ReplaceableGrid />)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		// Park deep in the old set — short of its end, so nothing fires yet.
		scroll.scrollTop = scroll.scrollHeight / 2

		fireEvent.scroll(scroll)

		await waitFor(() => expect(Number(scroll.scrollTop)).toBeGreaterThan(0))

		fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

		// The shorter new set resets the scroll to the top…
		await waitFor(() => expect(scroll.scrollTop).toBe(0))

		await waitFor(() => expect(screen.queryByText('Name 101')).not.toBeNull())

		// …and the stale deep position doesn't cascade a fetch against it: the new
		// 30 rows overflow the 180px viewport, so the next fetch needs a real scroll.
		await new Promise((resolve) => setTimeout(resolve, 150))

		expect(onLoadMore).not.toHaveBeenCalled()
	})

	it('windows and loads inside a CSS-sized parent under maxHeight="fill"', async () => {
		const onLoadMore = vi.fn()

		function FillGrid() {
			const [count, setCount] = useState(50)

			const rows = useMemo(() => allRows.slice(0, count), [count])

			return (
				<div style={{ width: '320px', height: '200px' }}>
					<Grid
						columns={columns}
						rows={rows}
						getKey={getKey}
						virtualize={{ estimateSize: 36 }}
						maxHeight="fill"
						infiniteScroll={{
							onLoadMore: () => {
								onLoadMore()

								setCount((c) => Math.min(c + 50, allRows.length))
							},
							totalRows: allRows.length,
						}}
					/>
				</div>
			)
		}

		const { container } = renderUI(<FillGrid />)

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		const scroll = container.querySelector('[data-slot="grid-scroll"]') as HTMLElement

		// The scroll region bound to the parent's 200px box: it overflows (windowing
		// is real) instead of growing to the 50 loaded rows' full height.
		expect(scroll.clientHeight).toBeGreaterThan(0)

		expect(scroll.clientHeight).toBeLessThan(400)

		expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight)

		// And infinite scroll works through it, `hasMore` derived from `totalRows`.
		scroll.scrollTop = scroll.scrollHeight

		fireEvent.scroll(scroll)

		await waitFor(() => expect(onLoadMore).toHaveBeenCalled())
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
