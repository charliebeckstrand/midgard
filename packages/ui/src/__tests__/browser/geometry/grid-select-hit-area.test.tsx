import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridProps } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * The hit area of a selection checkbox of a Grid, in a real browser. The hit
 * area fills the cell of the checkbox. Each point in the cell gives that
 * checkbox, and no point out of the cell gives it.
 */
describe('grid selection hit area (real browser)', () => {
	type Person = { id: number; name: string; team: string }

	const people: Person[] = Array.from({ length: 6 }, (_, index) => ({
		id: index + 1,
		name: `Person ${index + 1}`,
		team: index < 3 ? 'Alpha' : 'Bravo',
	}))

	const columns: GridColumn<Person>[] = [
		{ id: 'select', selectable: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'team', title: 'Team', cell: (row) => row.team, value: (row) => row.team },
	]

	function Harness(props: Partial<GridProps<Person>>) {
		const [value, setValue] = useState<Set<string | number>>(new Set())

		return (
			<div style={{ width: 480 }}>
				<Grid<Person>
					columns={columns}
					rows={people}
					getKey={(row) => row.id}
					rowLabel={(row) => row.name}
					selection={{ value, onValueChange: setValue }}
					{...props}
				/>
			</div>
		)
	}

	/** The checkbox that a press at a point toggles, or `null`. */
	function checkboxAt(x: number, y: number): HTMLInputElement | null {
		const node = document.elementFromPoint(x, y)

		if (node instanceof HTMLInputElement) return node

		return node?.closest('label')?.control instanceof HTMLInputElement
			? (node.closest('label')?.control as HTMLInputElement)
			: null
	}

	/** Points just inside each edge and corner of a rect, and its center. */
	function inside(rect: DOMRect): Array<[number, number]> {
		const left = rect.left + 1
		const right = rect.right - 1
		const top = rect.top + 1
		const bottom = rect.bottom - 1
		const midX = (rect.left + rect.right) / 2
		const midY = (rect.top + rect.bottom) / 2

		return [
			[left, top],
			[right, top],
			[left, bottom],
			[right, bottom],
			[midX, top],
			[midX, bottom],
			[left, midY],
			[right, midY],
			[midX, midY],
		]
	}

	/** Each selection checkbox and its cell. */
	function selectCells() {
		return screen.getAllByRole('checkbox').map((input) => {
			const cell = input.closest('td, th') as HTMLElement

			return { input: input as HTMLInputElement, cell }
		})
	}

	// A pinned Name column pins the selection column before it.
	const pinned: GridColumn<Person>[] = columns.map((column) =>
		column.id === 'name' ? { ...column, pinned: 'left' } : column,
	)

	const cases: Array<[string, Partial<GridProps<Person>>]> = [
		['a flat grid', {}],
		[
			'a pinned grid with a sticky header',
			{ columns: pinned, header: { position: 'sticky' }, maxHeight: '480px' },
		],
		['a grouped grid', { groupBy: { value: 'team', defaultExpanded: true } }],
	]

	it.each(cases)('fills the cell of each checkbox in %s', async (_, props) => {
		renderUI(<Harness {...props} />)

		await waitFor(() => expect(screen.getByText('Person 1')).toBeInTheDocument())

		const cells = selectCells()

		// The header and the six rows.
		expect(cells).toHaveLength(7)

		for (const { input, cell } of cells) {
			const rect = cell.getBoundingClientRect()

			// The box is smaller than the cell, so the hit area is larger than the box.
			const box = (input.parentElement as HTMLElement).getBoundingClientRect()

			expect(rect.height).toBeGreaterThan(box.height)

			for (const [x, y] of inside(rect)) {
				expect(checkboxAt(x, y), `${input.labels?.[0]?.textContent} at ${x},${y}`).toBe(input)
			}

			// Just past the inline end and the bottom edge: a data cell or the next row.
			expect(checkboxAt(rect.right + 1, (rect.top + rect.bottom) / 2)).not.toBe(input)

			expect(checkboxAt((rect.left + rect.right) / 2, rect.bottom + 1)).not.toBe(input)
		}
	})

	it('toggles only the checkbox of the cell that a press in a corner hits', async () => {
		renderUI(<Harness />)

		await waitFor(() => expect(screen.getByText('Person 1')).toBeInTheDocument())

		// The label of the hit area names the checkbox.
		const first = screen.getByRole('checkbox', { name: 'Select Person 1' })

		const second = screen.getByRole('checkbox', { name: 'Select Person 2' })

		const rect = (second.closest('td') as HTMLElement).getBoundingClientRect()

		const node = document.elementFromPoint(rect.left + 1, rect.top + 1) as HTMLElement

		fireEvent.click(node)

		await waitFor(() => expect(second).toBeChecked())

		expect(first).not.toBeChecked()
	})
})
