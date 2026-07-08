import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, renderUI, screen, userEvent, within } from '../helpers'

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

		const panelId = toggle.getAttribute('aria-controls')

		expect(panelId).toBe('grid-detail-1')

		expect(detailRow(container, 1)?.querySelector(`#${panelId}`)).not.toBeNull()
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

	it('stands the navigable cursor down while expandable (its own body)', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				navigable
				expandable={{ render: detail }}
			/>,
		)

		// The cursor makes the table role="grid"; master-detail stands it down, so
		// the table stays a plain table.
		expect(bySlot(container, 'grid')?.querySelector('table')).not.toHaveAttribute('role', 'grid')
	})
})
