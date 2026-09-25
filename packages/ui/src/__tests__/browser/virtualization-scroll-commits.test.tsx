import { Profiler, useCallback, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, frames, getSlot, renderUI, waitFor, windowBody } from '../helpers'

/**
 * The React commits of a windowed list around a `scroll` event that keeps the
 * rendered items, in a real browser. The virtualizer sets its `isScrolling`
 * flag on each `scroll` event and clears it 150 ms later. No render reads the
 * flag, so neither change must commit. The start anchor writes `scrollTop`
 * after a list change above the viewport, and that write sends a `scroll`
 * event too.
 */
describe('useVirtualWindow commits around a scroll (real browser)', () => {
	/** Longer than the 150 ms after which the virtualizer clears `isScrolling`. */
	const SCROLL_END = 400

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

	it('commits nothing for a scroll step that keeps the rendered rows', async () => {
		type Row = { id: number; name: string }

		const rows: Row[] = Array.from({ length: 1000 }, (_, i) => ({
			id: i + 1,
			name: `Row ${i + 1}`,
		}))

		const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

		let commits = 0

		const view = renderUI(
			<Profiler id="grid" onRender={() => commits++}>
				<div style={{ width: 400 }}>
					<Grid<Row>
						columns={columns}
						rows={rows}
						getKey={(row) => row.id}
						maxHeight="400px"
						header={{ position: 'sticky' }}
						virtualize
					/>
				</div>
			</Profiler>,
		)

		const scroll = getSlot(view.container, 'grid-scroll')

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector(':scope > tr[data-grid-row]')).not.toBeNull())

		const rendered = () =>
			Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]'))
				.map((row) => row.dataset.gridRow)
				.join()

		/** Whether no row edge is near the top or the bottom edge of the scroller. */
		const clearOfEdges = () => {
			const box = scroll.getBoundingClientRect()

			const edges = [box.top, box.top + scroll.clientHeight, box.bottom]

			return Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]')).every(
				(row) => {
					const { top, bottom } = row.getBoundingClientRect()

					return edges.every((edge) => Math.abs(top - edge) > 4 && Math.abs(bottom - edge) > 4)
				},
			)
		}

		// Find an offset where a step of one pixel changes no visible row.
		scroll.scrollTop = 2000

		await wait(SCROLL_END)

		while (!clearOfEdges()) {
			scroll.scrollTop += 3

			await wait(SCROLL_END)
		}

		for (let step = 0; step < 3; step++) {
			const before = rendered()

			commits = 0

			scroll.scrollTop += 1

			await wait(SCROLL_END)

			expect(rendered()).toBe(before)

			expect(commits).toBe(0)
		}
	})

	it('commits no scroll render after a list change above the viewport', async () => {
		const handle = { prepend: (_ids: number[]) => {} }

		const heightOf = (id: number) => 30 + ((id * 37) % 90)

		let commits = 0

		function List() {
			const scrollRef = useRef<HTMLDivElement>(null)

			const [ids, setIds] = useState(() => Array.from({ length: 200 }, (_, i) => i))

			handle.prepend = (next) => setIds((current) => [...next, ...current])

			const getItemKey = useCallback((index: number) => ids[index] ?? index, [ids])

			const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
				count: ids.length,
				getScrollElement: () => scrollRef.current,
				estimateSize: 44,
				overscan: 2,
				getItemKey,
			})

			return (
				<div
					ref={scrollRef}
					data-slot="anchored-list"
					style={{ height: 300, overflow: 'auto', overflowAnchor: 'none' }}
				>
					<div style={{ height: topSpacer }} />
					{virtualItems.map((item) => {
						const id = ids[item.index] ?? -1

						return (
							<div
								key={item.key}
								ref={measureRef}
								data-index={item.index}
								data-row={id}
								style={{ height: heightOf(id) }}
							>
								Row {id}
							</div>
						)
					})}
					<div style={{ height: bottomSpacer }} />
				</div>
			)
		}

		const { container } = renderUI(
			<Profiler id="list" onRender={() => commits++}>
				<List />
			</Profiler>,
		)

		const scroller = getSlot(container, 'anchored-list')

		await waitFor(() => expect(scroller.querySelector('[data-row]')).not.toBeNull())

		scroller.scrollTop = 2000

		await wait(SCROLL_END)

		for (let run = 0; run < 2; run++) {
			const before = scroller.scrollTop

			act(() => handle.prepend([1000 + run * 3, 1001 + run * 3, 1002 + run * 3]))

			// The change and the anchor move commit before the next frame.
			await frames()

			expect(scroller.scrollTop).toBeGreaterThan(before)

			commits = 0

			await wait(SCROLL_END)

			expect(commits).toBe(0)
		}
	})
})
