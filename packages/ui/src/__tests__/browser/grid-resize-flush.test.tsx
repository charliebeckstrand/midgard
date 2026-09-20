import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * The grid's table is `table-fixed` at a pixel width the autosizer computes, so between a
 * container changing width and that state committing there is a window where the table is
 * laid out for a width the page no longer has — it sits narrow inside its box, or overflows
 * it. Anything that resizes the container discretely paints that as a flash: a sidebar
 * switching to its floating variant, a docked panel opening beside the grid.
 *
 * The autosizer's `ResizeObserver` therefore flushes its refit. This is where that is
 * pinned, because it is unobservable in jsdom — no layout, so `clientWidth` is 0 and the
 * autosizer stands down before it ever measures.
 */
describe('grid refit on container resize (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const rows: Row[] = Array.from({ length: 4 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		role: 'Role',
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	/** One turn of the rendering steps: rAF runs before layout, so this lands after a paint. */
	const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

	it('carries the matching widths in the frame that resized the container', async () => {
		const frameEl = document.createElement('div')

		frameEl.style.width = '800px'

		document.body.append(frameEl)

		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={(row) => row.id} />,
			{ container: frameEl },
		)

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() => expect(table.getBoundingClientRect().width).toBeGreaterThan(700))

		/*
		 * A probe observer on the same element. Resize observations are delivered in the order
		 * their observers were created, so the grid's — created in a layout effect at mount —
		 * has already run by the time this one does. Whatever it reads here is therefore what
		 * the frame is about to paint.
		 */
		const painted: { container: number; table: number }[] = []

		const probe = new ResizeObserver(() => {
			painted.push({
				container: frameEl.clientWidth,
				table: Math.round(table.getBoundingClientRect().width),
			})
		})

		probe.observe(frameEl)

		// Drop the observation `observe()` itself schedules; only the resize below is under test.
		await frame()
		await frame()

		painted.length = 0

		frameEl.style.width = '500px'

		await frame()
		await frame()
		await frame()

		probe.disconnect()

		const settled = Math.round(table.getBoundingClientRect().width)

		// The refit happened at all, and landed narrower than the 800px fit.
		expect(settled).toBeLessThan(700)

		const atNewWidth = painted.filter((entry) => entry.container === 500)

		expect(atNewWidth.length).toBeGreaterThan(0)

		// Nothing was ever about to paint at the new container width carrying the old table
		// width. Before the refit was flushed, the first of these entries read the 800px table
		// inside a 500px box — the flash.
		for (const entry of atNewWidth) expect(entry.table).toBe(settled)

		frameEl.remove()
	})
})
