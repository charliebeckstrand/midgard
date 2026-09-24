import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import {
	frames,
	getSlot,
	present,
	renderUI,
	sampleDrift,
	waitFor,
	watchReveals,
	windowBody,
} from '../helpers'

/**
 * The master-detail body over a measured window, in a real browser. Each open
 * detail panel is an item of its own, and it guesses 0 pixels until it
 * measures. A panel that opens or closes in view animates. A panel above the
 * viewport opens and closes at once. In each case the rows in view hold still.
 */
describe('grid virtualized master-detail body (real browser)', () => {
	type Item = { id: number; name: string; height: number }

	const rows: Item[] = Array.from({ length: 300 }, (_, i) => ({
		id: i + 1,
		name: `Row ${i + 1}`,
		height: 60 + ((i * 37) % 240),
	}))

	const columns: GridColumn<Item>[] = [
		{ id: 'expand', expander: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	/** The open keys, which the test writes from outside the grid. */
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
					maxHeight="400px"
					header={{ position: 'sticky' }}
					// A row measures 46 pixels, so each first guess is exact, and the
					// cases hold the panels alone. The grouped suite holds rows whose
					// first guess is wrong.
					virtualize={{ estimateSize: 46, overscan: 4 }}
					expandable={{
						value,
						onValueChange: setValue,
						render: (row) => <div style={{ height: row.height }}>Detail {row.name}</div>,
					}}
				/>
			</div>
		)
	}

	async function renderGrid() {
		const view = renderUI(<Harness />)

		const scroll = getSlot(view.container, 'grid-scroll')

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector(':scope > tr[data-index]')).not.toBeNull())

		scroll.scrollTop = 2000

		await frames()

		await frames()

		return { ...view, scroll, body }
	}

	/** The data rows whose top sits below the sticky head. */
	function rowsInView(scroll: HTMLElement, body: HTMLElement) {
		const top = scroll.getBoundingClientRect().top + 50

		return Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]')).filter(
			(row) => row.getBoundingClientRect().top > top,
		)
	}

	/** The data rows that end above the top of the scroller. */
	function rowsAbove(scroll: HTMLElement, body: HTMLElement) {
		const top = scroll.getBoundingClientRect().top

		return Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]')).filter(
			(row) => row.getBoundingClientRect().bottom < top,
		)
	}

	/** Records the panel key of each reveal transition that starts under `root`. */
	const watchPanels = (root: HTMLElement) =>
		watchReveals(root, (row) => row?.getAttribute('data-detail-row') ?? '')

	/** Samples the drift of `anchor` from where it is now, after each of `count` paints. */
	const drift = (anchor: HTMLElement, count: number) =>
		sampleDrift(() => anchor, anchor.getBoundingClientRect().top, count)

	const keyOf = (row: HTMLElement) => Number(row.getAttribute('data-grid-row'))

	it('animates a panel open and closed in view, and holds the row above it still', async () => {
		const { scroll, body } = await renderGrid()

		const runs = watchPanels(body)

		const [anchor, target] = rowsInView(scroll, body) as [HTMLElement, HTMLElement]

		const key = keyOf(target)

		control.set(new Set([key]))

		const openDrift = await drift(anchor, 20)

		expect(runs).toContain(String(key))

		const panel = present(body.querySelector(`tr[data-detail-row="${key}"]`), 'the panel')

		expect(panel.getBoundingClientRect().height).toBeGreaterThan(50)

		runs.length = 0

		control.set(new Set())

		const closeDrift = await drift(anchor, 20)

		expect(runs).toContain(String(key))

		// Once the reveal lands, the closed panel leaves the item list.
		await waitFor(() => expect(body.querySelector(`tr[data-detail-row="${key}"]`)).toBeNull())

		expect(openDrift).toBeLessThanOrEqual(1)

		expect(closeDrift).toBeLessThanOrEqual(1)
	})

	it('opens and closes a panel above the viewport at once, with no jump', async () => {
		const { scroll, body } = await renderGrid()

		const runs = watchPanels(body)

		const above = present(rowsAbove(scroll, body).at(-1), 'a row above the viewport')

		const anchor = present(rowsInView(scroll, body)[0], 'a row in view')

		const key = keyOf(above)

		control.set(new Set([key]))

		const openDrift = await drift(anchor, 20)

		expect(present(body.querySelector(`tr[data-detail-row="${key}"]`), 'the panel')).toBeTruthy()

		control.set(new Set())

		const closeDrift = await drift(anchor, 20)

		expect(body.querySelector(`tr[data-detail-row="${key}"]`)).toBeNull()

		expect(runs).toEqual([])

		expect(openDrift).toBeLessThanOrEqual(1)

		expect(closeDrift).toBeLessThanOrEqual(1)
	})

	it('indexes rows and open panels over the item list and counts them', async () => {
		const { scroll, body } = await renderGrid()

		const table = present(body.closest('table'), 'table')

		expect(table).toHaveAttribute('role', 'table')

		expect(table).toHaveAttribute('aria-rowcount', String(rows.length + 1))

		const key = keyOf(present(rowsInView(scroll, body)[1], 'a row in view'))

		control.set(new Set([key]))

		await waitFor(() => expect(table).toHaveAttribute('aria-rowcount', String(rows.length + 2)))

		await frames()

		for (const row of Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-index]'))) {
			expect(row).toHaveAttribute('aria-rowindex', String(Number(row.dataset.index) + 2))
		}

		// The panel follows its row.
		const panel = present(body.querySelector<HTMLElement>(`tr[data-detail-row="${key}"]`), 'panel')

		const row = present(body.querySelector<HTMLElement>(`tr[data-grid-row="${key}"]`), 'row')

		expect(Number(panel.getAttribute('aria-rowindex'))).toBe(
			Number(row.getAttribute('aria-rowindex')) + 1,
		)
	})
})
