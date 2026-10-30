import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, getSlot, present, renderUI, sampleDrift, waitFor, windowBody } from '../helpers'

/**
 * The flat master-detail body against the native scroll anchoring of the
 * browser. The body has no window, so the grid scroller keeps the default
 * `overflow-anchor: auto`. Each case holds a row in view to a drift of one
 * pixel.
 *
 * A panel that closes at the scroll end clamps the scroll offset. Chromium kept
 * its anchor through the clamp, with a correction equal to the panel. The next
 * open then moved the rows in view up by the panel. The windowed bodies have
 * the same cases in `grid-virtualized-scroll-anchor.test.tsx`.
 *
 * Each case runs with and without `resizable`. A resizable grid renders a
 * `<colgroup>`, which the native anchor skips. Before, Chromium selected the
 * first `<col>` as its anchor. That node does not move, so no native correction
 * held the view when a panel above the viewport opened or closed.
 */
describe('grid master-detail body under native scroll anchoring (real browser)', () => {
	type Item = { id: number; name: string }

	const rows: Item[] = Array.from({ length: 60 }, (_, index) => ({
		id: index + 1,
		name: `Row ${index + 1}`,
	}))

	const columns: GridColumn<Item>[] = [
		{ id: 'expand', expander: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	/** Renders the grid, and returns its scroller, its body, and the setter of its open keys. */
	const renderGrid = vi.defineHelper(async (resizable: boolean) => {
		const control: { set: (keys: Set<string | number>) => void } = { set: () => {} }

		function Harness() {
			const [value, setValue] = useState<Set<string | number>>(new Set())

			control.set = setValue

			return (
				<div style={{ width: 500 }}>
					<Grid<Item>
						columns={columns}
						rows={rows}
						getKey={(row) => row.id}
						resizable={resizable}
						maxHeight="400px"
						header={{ position: 'sticky' }}
						expandable={{
							value,
							onValueChange: setValue,
							render: (row) => <div style={{ height: 80 }}>Detail {row.name}</div>,
						}}
					/>
				</div>
			)
		}

		const view = renderUI(<Harness />)

		const scroll = getSlot(view.container, 'grid-scroll')

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector(':scope > tr[data-grid-row]')).not.toBeNull())

		expect(getComputedStyle(scroll).overflowAnchor).toBe('auto')

		expect(scroll.querySelector('colgroup') !== null).toBe(resizable)

		const dataRows = () =>
			Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]'))

		return { scroll, body, control, dataRows }
	})

	for (const resizable of [true, false]) {
		it(`holds the view still when a panel at the scroll end closes and opens again (resizable: ${resizable})`, async () => {
			const { scroll, body, control, dataRows } = await renderGrid(resizable)

			const toEnd = async () => {
				for (let i = 0; i < 4; i++) {
					scroll.scrollTop = scroll.scrollHeight

					await frames()
				}
			}

			await toEnd()

			const key = Number(present(dataRows().at(-2), 'a row near the end').dataset.gridRow)

			const target = () => body.querySelector<HTMLElement>(`:scope > tr[data-grid-row="${key}"]`)

			const panel = () =>
				present(body.querySelector<HTMLElement>(`tr[data-detail-row="${key}"]`), 'the panel')

			// The reveal lands when the row is as tall as the panel content.
			const height = () => panel().getBoundingClientRect().height

			const full = () =>
				present(panel().querySelector('section'), 'the panel content').getBoundingClientRect()
					.height

			control.set(new Set([key]))

			await waitFor(() => expect(Math.abs(height() - full())).toBeLessThan(0.5))

			// The end moved down by the panel, so the close has room to clamp.
			await toEnd()

			const beforeClose = scroll.scrollTop

			control.set(new Set())

			await waitFor(() => expect(height()).toBe(0))

			await frames(3)

			expect(scroll.scrollTop).toBeLessThan(beforeClose)

			const beforeOpen = present(target(), 'the target').getBoundingClientRect().top

			control.set(new Set([key]))

			expect(await sampleDrift(target, beforeOpen, 30)).toBeLessThanOrEqual(1)
		})
	}

	for (const resizable of [true, false]) {
		it(`holds the view still when a panel above the viewport opens and closes (resizable: ${resizable})`, async () => {
			const { scroll, body, control, dataRows } = await renderGrid(resizable)

			// Once in the middle, and once at the scroll end, where a close above the
			// viewport clamps the offset before the panel opens again.
			for (const at of [1000, scroll.scrollHeight]) {
				scroll.scrollTop = at

				await frames(4)

				const top = scroll.getBoundingClientRect().top

				const above = present(
					dataRows()
						.filter((row) => row.getBoundingClientRect().bottom < top)
						.at(-2),
					'a row above the viewport',
				)

				const inView = present(
					dataRows().find((row) => row.getBoundingClientRect().top > top + 50),
					'a row in view',
				)

				const anchor = () =>
					body.querySelector<HTMLElement>(`:scope > tr[data-grid-row="${inView.dataset.gridRow}"]`)

				const key = Number(above.dataset.gridRow)

				for (const open of [true, false, true]) {
					const before = present(anchor(), 'the anchor').getBoundingClientRect().top

					control.set(open ? new Set([key]) : new Set())

					expect(await sampleDrift(anchor, before, 20)).toBeLessThanOrEqual(1)
				}
			}
		})
	}
})
