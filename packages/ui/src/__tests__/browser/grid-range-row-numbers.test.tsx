import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { expectAnnouncement, fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * The row numbers that the range announcement speaks, in a real browser. A
 * windowed body can leave a corner of the range out of the document, and the
 * announcement must still speak the number of that row.
 */
describe('grid range row numbers (real browser)', () => {
	type Person = { id: number; name: string; team: string }

	// Two teams of 30 people, so the second header sits between rows of the two teams.
	const people: Person[] = Array.from({ length: 60 }, (_, index) => ({
		id: index + 1,
		name: `Person ${index + 1}`,
		team: index < 30 ? 'Alpha' : 'Bravo',
	}))

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', width: 160, cell: (row) => row.name, value: (row) => row.name },
		{ id: 'team', title: 'Team', width: 120, cell: (row) => row.team, value: (row) => row.team },
	]

	const findCell = (name: string) => screen.getByText(name).closest('td') as HTMLElement

	it('speaks the number of a corner that a grouped window left out', async () => {
		renderUI(
			<div style={{ width: 400 }}>
				<Grid<Person>
					columns={columns}
					rows={people}
					getKey={(row) => row.id}
					groupBy={{ value: 'team', defaultExpanded: true }}
					navigable
					range
					maxHeight="300px"
					virtualize={{ estimateSize: 40, overscan: 2 }}
				/>
			</div>,
		)

		const grid = screen.getByRole('treegrid')

		await waitFor(() => expect(screen.getByText('Person 1')).toBeInTheDocument())

		// Person 1 is row 3: the column header, then the header of Alpha.
		fireEvent.mouseDown(findCell('Person 1'))

		fireEvent.mouseUp(findCell('Person 1'))

		// Down to Person 40. The header of Bravo is a stop of its own, so that is
		// 40 steps. The window then leaves Person 1 out of the document.
		for (let step = 0; step < 40; step++) {
			fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true })
		}

		await waitFor(() => expect(screen.getByText('Person 40')).toBeInTheDocument())

		expect(screen.queryByText('Person 1')).toBeNull()

		// Person 40 is row 43: three header rows above it, the column header included.
		expect(findCell('Person 40').closest('tr')).toHaveAttribute('aria-rowindex', '43')

		await expectAnnouncement('Range of 40 rows and 1 column, Name row 3 to Name row 43')
	})
})
