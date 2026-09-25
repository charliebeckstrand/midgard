import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import {
	act,
	frames,
	getSlot,
	present,
	renderUI,
	sampleDrift,
	waitFor,
	windowBody,
} from '../helpers'

/**
 * The virtualized grouped body when a quick search narrows the rows and then
 * clears. The groups grow back above the rows in view.
 *
 * Before, the start anchor of the window held the first row in view through
 * the clear, also at the offset zero. A reader at the top of the results then
 * saw the header of the found group, below the end of each group before it.
 * Now the window keeps the top at the offset zero, as the native scroll
 * anchoring of the browser does. Below the top, it holds the row in view.
 */
describe('grid grouped virtualized body after a search clears (real browser)', () => {
	type Item = { id: string; carrier: string }

	const carriers = ['Acme', 'Globex', 'Initech']

	// Three groups of 300 rows.
	const rows: Item[] = Array.from({ length: 900 }, (_, i) => ({
		id: `S${String(i).padStart(4, '0')}`,
		carrier: carriers[i % 3] as string,
	}))

	const columns: GridColumn<Item>[] = [
		{ id: 'id', title: 'ID', cell: (row) => row.id, value: (row) => row.id },
		{ id: 'carrier', title: 'Carrier', cell: (row) => row.carrier, value: (row) => row.carrier },
	]

	const search = { set: (_: string) => {} }

	function Harness() {
		const [value, setValue] = useState('')

		search.set = setValue

		return (
			<div style={{ width: 500 }}>
				<Grid<Item>
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					virtualize
					maxHeight="600px"
					search={{ value }}
					groupBy={{ value: 'carrier' }}
				/>
			</div>
		)
	}

	async function settle(count: number) {
		for (let i = 0; i < count; i++) await frames()
	}

	/** Renders the grid, and returns its scroller and the first row below the head. */
	async function renderGrid() {
		const view = renderUI(<Harness />)

		const scroll = getSlot(view.container, 'grid-scroll')

		const body = windowBody(view.container)

		await waitFor(() => expect(body.textContent).toContain('S0000'))

		const head = present(view.container.querySelector('thead'), 'the head')

		const firstInView = () => {
			const top = head.getBoundingClientRect().bottom

			return present(
				Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-index]')).find(
					(row) => row.getBoundingClientRect().bottom > top + 1,
				),
				'a row in view',
			)
		}

		return { scroll, body, firstInView }
	}

	it('shows the top of the grid when a search clears at the top of its results', async () => {
		const { scroll, body, firstInView } = await renderGrid()

		act(() => search.set('Globex'))

		await waitFor(() => expect(body.textContent).not.toContain('Acme'))

		await settle(5)

		expect(scroll.scrollTop).toBe(0)

		act(() => search.set(''))

		await waitFor(() => expect(body.textContent).toContain('Acme'))

		await settle(10)

		expect(scroll.scrollTop).toBe(0)

		expect(firstInView().textContent).toContain('Acme')
	})

	it('holds the row in view when a search clears below the top of its results', async () => {
		const { scroll, body, firstInView } = await renderGrid()

		act(() => search.set('Globex'))

		await waitFor(() => expect(body.textContent).not.toContain('Acme'))

		scroll.scrollTop = 2000

		await settle(5)

		const anchor = firstInView()

		const id = anchor.textContent?.match(/S\d{4}/)?.[0]

		if (!id) throw new Error('the anchor has no id')

		const row = () =>
			Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-index]')).find((tr) =>
				tr.textContent?.includes(id),
			) ?? null

		const before = anchor.getBoundingClientRect().top

		act(() => search.set(''))

		expect(await sampleDrift(row, before, 20)).toBeLessThanOrEqual(1)
	})
})
