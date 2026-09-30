import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, stubMatchMedia, userEvent, within } from '../helpers'

type Person = { id: number; name: string; role: string }

const people: Person[] = [
	{ id: 1, name: 'Wade', role: 'Developer' },
	{ id: 2, name: 'Arlene', role: 'Designer' },
	{ id: 3, name: 'Devon', role: 'Manager' },
]

const columns: GridColumn<Person>[] = [
	{ id: 'expand', expander: true },
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
]

const getKey = (row: Person) => row.id

const detail = (row: Person) => <div data-slot="person-detail">Detail for {row.name}</div>

function detailRow(container: HTMLElement, rowKey: number): HTMLElement | null {
	return container.querySelector(`[data-detail-row="${rowKey}"]`)
}

describe('Grid master-detail', () => {
	it('renders a collapsed detail row per row, hidden from assistive tech', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={people} getKey={getKey} expandable={{ render: detail }} />,
		)

		// One detail row per data row, all closed and out of the AT tree.
		for (const person of people) {
			const row = detailRow(container, person.id)

			expect(row).not.toBeNull()

			expect(row).toHaveAttribute('aria-hidden', 'true')
		}
	})

	it('opens a panel from its expander chevron and closes it again', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Grid columns={columns} rows={people} getKey={getKey} expandable={{ render: detail }} />,
		)

		const toggle = screen.getByRole('button', { name: 'Expand details for row 1' })

		expect(toggle).toHaveAttribute('aria-expanded', 'false')

		// The chevron `<svg>` carries `data-open` so its CSS rotate fires when the
		// panel opens. It is the toggle's `data-slot="icon"` element (the lucide glyph
		// the Icon clones), which also lets the Button read the control as icon-only.
		expect(toggle.querySelector('[data-slot="icon"]')).not.toHaveAttribute('data-open')

		await user.click(toggle)

		expect(
			screen
				.getByRole('button', { name: 'Collapse details for row 1' })
				.querySelector('[data-slot="icon"]'),
		).toHaveAttribute('data-open')

		// The panel opens: aria-expanded flips, the detail row leaves the hidden state.
		expect(screen.getByRole('button', { name: 'Collapse details for row 1' })).toHaveAttribute(
			'aria-expanded',
			'true',
		)

		expect(detailRow(container, 1)).not.toHaveAttribute('aria-hidden')

		expect(
			within(detailRow(container, 1) as HTMLElement).getByText('Detail for Wade'),
		).toBeVisible()

		// The other rows stay closed.
		expect(detailRow(container, 2)).toHaveAttribute('aria-hidden', 'true')

		await user.click(screen.getByRole('button', { name: 'Collapse details for row 1' }))

		expect(detailRow(container, 1)).toHaveAttribute('aria-hidden', 'true')
	})

	it('ties the expander to its panel through aria-controls', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={people} getKey={getKey} expandable={{ render: detail }} />,
		)

		const toggle = screen.getByRole('button', { name: 'Expand details for row 1' })

		const panelId = toggle.getAttribute('aria-controls') ?? ''

		// The id carries the grid's own scope, so it is unique in the document.
		expect(panelId).toMatch(/-detail-1$/)

		const panel = document.getElementById(panelId)

		expect(panel).not.toBeNull()

		expect(detailRow(container, 1)?.contains(panel)).toBe(true)
	})

	it('drives expansion through a controlled binding', async () => {
		const user = userEvent.setup()

		function Harness() {
			const [expanded, setExpanded] = useState<Set<string | number>>(new Set())

			return (
				<Grid
					columns={columns}
					rows={people}
					getKey={getKey}
					expandable={{
						value: expanded,
						onValueChange: setExpanded,
						render: detail,
					}}
				/>
			)
		}

		const { container } = renderUI(<Harness />)

		await user.click(screen.getByRole('button', { name: 'Expand details for row 2' }))

		expect(detailRow(container, 2)).not.toHaveAttribute('aria-hidden')
	})

	it('withholds the chevron from a row rowExpandable rejects', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				expandable={{ render: detail, rowExpandable: (row) => row.role !== 'Manager' }}
			/>,
		)

		// Devon is a Manager — no toggle; the others have one.
		expect(screen.queryByRole('button', { name: /details for row 3/ })).toBeNull()

		expect(screen.getByRole('button', { name: 'Expand details for row 1' })).toBeInTheDocument()
	})

	it('never renders the detail of a row rowExpandable rejects', () => {
		type Order = { id: number; lines?: { items: string[] } }

		const orders: Order[] = [{ id: 1, lines: { items: ['Pen'] } }, { id: 2 }]

		// The renderer trusts the predicate, so it reads `lines` without a guard.
		const render = (order: Order) => {
			if (!order.lines) throw new Error(`render called for rejected row ${order.id}`)

			return <div data-slot="order-detail">{order.lines.items.join(', ')}</div>
		}

		const { container } = renderUI(
			<Grid<Order>
				columns={[
					{ id: 'expand', expander: true },
					{ id: 'id', title: 'Id', cell: (r) => r.id },
				]}
				rows={orders}
				getKey={(r) => r.id}
				expandable={{ render, rowExpandable: (order) => order.lines != null }}
			/>,
		)

		expect(detailRow(container, 1)).not.toBeNull()

		expect(detailRow(container, 2)).toBeNull()
	})

	it('opens the panel on the toggle itself under reduced motion', async () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		const user = userEvent.setup()

		const { container } = renderUI(
			<Grid columns={columns} rows={people} getKey={getKey} expandable={{ render: detail }} />,
		)

		// The reveal track under the panel's cell; `data-open` drives its height tween.
		const track = () => detailRow(container, 1)?.querySelector('td > div')

		expect(track()).not.toHaveAttribute('data-open')

		await user.click(screen.getByRole('button', { name: 'Expand details for row 1' }))

		// Reduced motion drops the transition, so the track has nothing to prime and
		// opens in the commit the toggle lands in — no wake, no second pass.
		expect(track()).toHaveAttribute('data-open')

		await user.click(screen.getByRole('button', { name: 'Collapse details for row 1' }))

		expect(track()).not.toHaveAttribute('data-open')
	})
})
