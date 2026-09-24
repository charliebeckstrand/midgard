import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, getSlot, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The client-grouped body over a measured window, in a real browser. Each row
 * wraps a note of a different length, so the rows do not share one height.
 * The body renders each group header, leaf, and total as an item, and each row
 * measures its own height.
 */
describe('grid virtualized grouped body (real browser)', () => {
	type Person = { id: number; name: string; role: string; note: string; n: number }

	const ROLES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']

	const people: Person[] = Array.from({ length: 400 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		role: ROLES[i % ROLES.length] as string,
		note: 'lorem ipsum '.repeat(1 + ((i * 7) % 13)).trim(),
		n: i,
	}))

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', width: 120, cell: (r) => r.name, value: (r) => r.name },
		{ id: 'role', title: 'Role', width: 100, cell: (r) => r.role, value: (r) => r.role },
		{ id: 'note', title: 'Note', width: 200, cell: (r) => r.note, value: (r) => r.note },
		{ id: 'n', title: 'N', width: 80, cell: (r) => r.n, value: (r) => r.n, aggFunc: 'sum' },
	]

	/** The count of items with every group open: 8 headers, 400 leaves, 8 totals. */
	const ITEMS = ROLES.length + people.length + ROLES.length

	function renderGrid({ virtualize = true, overscan = 4 } = {}) {
		const view = renderUI(
			<div style={{ width: 560 }}>
				<Grid<Person>
					columns={columns}
					rows={people}
					getKey={(r) => r.id}
					groupBy={{ value: 'role' }}
					groupTotalRow
					truncate={false}
					maxHeight="400px"
					header={{ position: 'sticky' }}
					{...(virtualize ? { virtualize: { estimateSize: 44, overscan } } : {})}
				/>
			</div>,
		)

		const scroll = getSlot(view.container, 'grid-scroll')

		const body = present<HTMLTableSectionElement>(
			scroll.querySelector('table > tbody'),
			'the data body',
		)

		return { ...view, scroll, body }
	}

	/** The rendered item rows of the window, in DOM order. */
	const itemRows = (body: HTMLElement) =>
		Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-index]'))

	/** The spacer heights, and the rendered rows' heights between them. */
	function bodyHeights(body: HTMLElement) {
		let spacers = 0

		let rows = 0

		for (const row of Array.from(body.children)) {
			const height = row.getBoundingClientRect().height

			if (row.getAttribute('data-slot') === 'grid-spacer') spacers += height
			else rows += height
		}

		return { spacers, rows, total: spacers + rows }
	}

	async function settle(count = 3) {
		for (let i = 0; i < count; i++) await frames()
	}

	it('holds the view still on a scroll up, matches the full height, and keeps the head stuck', async () => {
		const reference = renderGrid({ virtualize: false })

		await settle()

		const fullHeight = reference.body.getBoundingClientRect().height

		reference.unmount()

		const measured = renderGrid()

		const { scroll, body } = measured

		await waitFor(() => expect(itemRows(body).length).toBeGreaterThan(0))

		const head = present(scroll.querySelector('thead th'), 'a head cell')

		let headDrift = 0

		// Scroll down through the whole list, so each row measures once.
		for (let top = 0; top < scroll.scrollHeight; top += 400) {
			scroll.scrollTop = top

			await settle(1)

			headDrift = Math.max(
				headDrift,
				Math.abs(head.getBoundingClientRect().top - scroll.getBoundingClientRect().top),
			)
		}

		// The spacers stand in for the rows outside the window, so the body is as
		// tall as the unwindowed body.
		expect(Math.abs(bodyHeights(body).total - fullHeight)).toBeLessThanOrEqual(2)

		// Jump far down, where no row has measured on the way up, and scroll up in
		// steps. A row that stays in view moves down by the step and no more.
		measured.unmount()

		const fresh = renderGrid()

		await waitFor(() => expect(itemRows(fresh.body).length).toBeGreaterThan(0))

		fresh.scroll.scrollTop = 12_000

		await settle(4)

		let drift = 0

		for (let step = 0; step < 40 && fresh.scroll.scrollTop > 0; step++) {
			const top = fresh.scroll.getBoundingClientRect().top

			const anchor = itemRows(fresh.body).find((row) => row.getBoundingClientRect().top - top > 60)

			if (!anchor) break

			const before = anchor.getBoundingClientRect().top

			const from = fresh.scroll.scrollTop

			fresh.scroll.scrollTop = from - 100

			await settle(2)

			if (!anchor.isConnected) continue

			const moved = anchor.getBoundingClientRect().top - before

			drift = Math.max(drift, Math.abs(moved - Math.min(100, from)))

			headDrift = Math.max(
				headDrift,
				Math.abs(
					present(fresh.scroll.querySelector('thead th'), 'a head cell').getBoundingClientRect()
						.top - top,
				),
			)
		}

		expect(drift).toBeLessThanOrEqual(1)

		expect(headDrift).toBeLessThanOrEqual(1)
	})

	it('animates the collapse of a group in view, then releases its rows', async () => {
		const { body } = renderGrid()

		await waitFor(() => expect(itemRows(body).length).toBeGreaterThan(0))

		const runs: (EventTarget | null)[] = []

		body.addEventListener('transitionrun', (event) => {
			if ((event as TransitionEvent).propertyName === 'grid-template-rows') runs.push(event.target)
		})

		const leavesBefore = body.querySelectorAll(':scope > tr[data-grid-row]').length

		screen.getByRole('button', { name: 'Collapse group Alpha' }).click()

		// The rows in view stay as items while they close, and each one animates.
		await waitFor(() => expect(runs.length).toBeGreaterThan(0))

		expect(body.querySelectorAll(':scope > tr[aria-hidden="true"][data-grid-row]').length).toBe(
			leavesBefore,
		)

		// Once the reveal lands, the closed rows leave the item list.
		await waitFor(() =>
			expect(body.querySelectorAll(':scope > tr[aria-hidden="true"][data-grid-row]').length).toBe(
				0,
			),
		)

		const table = present(body.closest('table'), 'table')

		expect(table).toHaveAttribute('aria-rowcount', String(ITEMS - 50 - 1 + 1))
	})

	it('bounds the expand animation to the rows that fit in one viewport', async () => {
		const { scroll, body } = renderGrid({ overscan: 30 })

		await waitFor(() => expect(itemRows(body).length).toBeGreaterThan(0))

		screen.getByRole('button', { name: 'Collapse group Alpha' }).click()

		// Person 1 is the first leaf of Alpha. It leaves once its reveal lands.
		await waitFor(() => expect(body.querySelector('tr[data-grid-row="1"]')).toBeNull())

		const animated = new Set<Element>()

		body.addEventListener('transitionrun', (event) => {
			if ((event as TransitionEvent).propertyName !== 'grid-template-rows') return

			const row = (event.target as Element).closest('tr')

			if (row) animated.add(row)
		})

		screen.getByRole('button', { name: 'Expand group Alpha' }).click()

		await waitFor(() => expect(animated.size).toBeGreaterThan(0))

		await settle(20)

		// Alpha is the first group, so its leaves follow its header at the top.
		const bound = Math.ceil(scroll.clientHeight / 44)

		const rendered = itemRows(body).filter(
			(row) => row.hasAttribute('data-grid-row') || row.dataset.totalRow === 'group',
		)

		expect(animated.size).toBeLessThanOrEqual(bound)

		// The window renders more rows than the bound, and those mount open.
		expect(rendered.length).toBeGreaterThan(bound)

		expect(present(body.closest('table'), 'table')).toHaveAttribute(
			'aria-rowcount',
			String(ITEMS + 1),
		)
	})

	it('indexes each rendered row over the item list and counts the items', async () => {
		const { scroll, body } = renderGrid()

		await waitFor(() => expect(itemRows(body).length).toBeGreaterThan(0))

		const table = present(body.closest('table'), 'table')

		expect(table).toHaveAttribute('role', 'table')

		// The column header row is row 1.
		expect(table).toHaveAttribute('aria-rowcount', String(ITEMS + 1))

		scroll.scrollTop = 5000

		await settle(4)

		const rows = itemRows(body)

		expect(rows.length).toBeGreaterThan(0)

		for (const row of rows) {
			expect(row).toHaveAttribute('aria-rowindex', String(Number(row.dataset.index) + 2))
		}

		// Each kind of row is in the window: a header, a leaf, and a total.
		const kinds = new Set(
			rows.map((row) =>
				row.hasAttribute('data-group-row')
					? 'group'
					: row.dataset.totalRow === 'group'
						? 'total'
						: 'leaf',
			),
		)

		expect(kinds).toEqual(new Set(['group', 'leaf', 'total']))
	})
})
