import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridSortState } from '../../modules/grid'
import { frames, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The triggers of the column fit, against a real layout engine. Each fit pass reads
 * the column gap of one header slot through `getComputedStyle` (see
 * `measureColumns`), so the calls on a `[data-grid-header]` slot count the passes.
 * A pass reads every body cell, so a pass that changes no width costs the full
 * measure for nothing.
 */
describe('grid fit passes (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		name: `Person ${String(i + 1).padStart(2, '0')}`,
		role: i === 7 ? 'A considerably longer role title' : 'Developer',
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', sortable: true, cell: (r) => r.name, value: (r) => r.name },
		{ id: 'role', title: 'Role', sortable: true, cell: (r) => r.role, value: (r) => r.role },
	]

	const getKey = (row: Row) => row.id

	let passes = 0

	beforeAll(async () => {
		// The fit skips the web-font re-measure only when the fonts have loaded.
		await document.fonts.ready
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	/** Counts the fit passes from here on. */
	function countPasses() {
		const read = window.getComputedStyle.bind(window)

		passes = 0

		vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
			if (element.hasAttribute('data-grid-header')) passes++

			return read(element, pseudo)
		})
	}

	function render(sort: GridSortState[], extra?: { pageSize?: number; navigable?: boolean }) {
		return (
			<div style={{ width: '600px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					sort={{ value: sort }}
					navigable={extra?.navigable}
					pagination={
						extra?.pageSize ? { value: { pageIndex: 0, pageSize: extra.pageSize } } : undefined
					}
				/>
			</div>
		)
	}

	it('measures no second time for web fonts that had loaded before the first fit', async () => {
		expect(document.fonts.status).toBe('loaded')

		countPasses()

		renderUI(render([]))

		await waitFor(() => expect(screen.queryByText('Person 01')).not.toBeNull())

		// The `fonts.ready` promise has settled, so any subscription to it has fired.
		await document.fonts.ready

		await frames()

		// The synchronous fit at mount. The observer's first tick finds the widths it
		// wrote and moves nothing, and nothing waits on the fonts.
		expect(passes).toBe(1)
	})

	it('measures nothing on a sort, which reorders the same rows', async () => {
		const view = renderUI(render([]))

		await waitFor(() => expect(screen.queryByText('Person 01')).not.toBeNull())

		await frames()

		countPasses()

		view.rerender(render([{ column: 'name', direction: 'desc' }]))

		await frames()

		const first = present(document.querySelector('tbody td'), 'first body cell')

		expect(first.textContent).toBe('Person 30')
		expect(passes).toBe(0)
	})

	it('measures again when a sort brings other rows onto the page', async () => {
		const view = renderUI(render([], { pageSize: 10 }))

		await waitFor(() => expect(screen.queryByText('Person 01')).not.toBeNull())

		await frames()

		countPasses()

		// The descending page holds rows 30 to 21, which the ascending page did not show.
		view.rerender(render([{ column: 'name', direction: 'desc' }], { pageSize: 10 }))

		await frames()

		expect(passes).toBeGreaterThan(0)
	})

	it('reads a navigable text cell in place, with no max-content write', async () => {
		const styleWrites: MutationRecord[] = []

		const observer = new MutationObserver((records) => styleWrites.push(...records))

		observer.observe(document.body, { subtree: true, attributeFilter: ['style'] })

		renderUI(render([], { navigable: true }))

		await waitFor(() => expect(screen.queryByText('Person 01')).not.toBeNull())

		await frames()

		styleWrites.push(...observer.takeRecords())

		observer.disconnect()

		// The cursor's hidden locator span sits in each leaf. It lays out no box, so the
		// leaf still reads as text, and the fit never widens it to `max-content`.
		const leafWrites = styleWrites.filter(
			(record) =>
				record.target instanceof HTMLElement && record.target.hasAttribute('data-grid-content'),
		)

		expect(leafWrites).toEqual([])
	})
})
