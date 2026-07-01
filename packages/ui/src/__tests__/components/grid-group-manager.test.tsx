import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridColumnGroup } from '../../modules/grid'
import {
	addGroupTo,
	assignColumn,
	buildManagerZones,
	recolorGroupIn,
	removeGroupFrom,
	renameGroupIn,
	UNGROUPED,
} from '../../modules/grid/use-grid-group-manager'
import { fireEvent, renderUI, screen } from '../helpers'

describe('group manager reducers', () => {
	const groups: GridColumnGroup[] = [
		{ id: 'g1', title: 'One', columns: ['a', 'b'] },
		{ id: 'g2', title: 'Two', columns: ['c'] },
	]

	it('appends a new group', () => {
		const next = addGroupTo(groups, { id: 'g3', columns: [] })

		expect(next).toHaveLength(3)

		expect(next[2]?.id).toBe('g3')
	})

	it('removes a group by id', () => {
		expect(removeGroupFrom(groups, 'g1').map((g) => g.id)).toEqual(['g2'])
	})

	it('renames and recolors a group without touching others', () => {
		expect(renameGroupIn(groups, 'g1', 'Renamed')[0]?.title).toBe('Renamed')

		expect(recolorGroupIn(groups, 'g2', 'violet')[1]?.color).toBe('violet')

		expect(recolorGroupIn(groups, 'g2', 'violet')[0]).toBe(groups[0])
	})

	it('moves a column into a group, pulling it from any prior group', () => {
		const next = assignColumn(groups, 'a', 'g2')

		expect(next[0]?.columns).toEqual(['b'])

		expect(next[1]?.columns).toEqual(['c', 'a'])
	})

	it('removes a column from all groups when ungrouped', () => {
		const next = assignColumn(groups, 'a', null)

		expect(next[0]?.columns).toEqual(['b'])
	})

	it('partitions orderable columns into group zones and an ungrouped pool', () => {
		const zones = buildManagerZones(groups, ['a', 'b', 'c', 'd'])

		expect(zones.map((z) => z.id)).toEqual(['g1', 'g2', UNGROUPED])

		expect(zones[0]?.columnIds).toEqual(['a', 'b'])

		expect(zones[2]?.columnIds).toEqual(['d'])
	})
})

describe('Grid column-group editor', () => {
	type Row = { id: number; first: string; last: string; email: string }

	const rows: Row[] = [{ id: 1, first: 'Ada', last: 'Byron', email: 'ada@example.com' }]

	const columns: GridColumn<Row>[] = [
		{ id: 'first', title: 'First', cell: (r) => r.first },
		{ id: 'last', title: 'Last', cell: (r) => r.last },
		{ id: 'email', title: 'Email', cell: (r) => r.email },
	]

	function Harness() {
		const [groups, setGroups] = useState<GridColumnGroup[]>([])

		return (
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				groups={{ value: groups, onValueChange: setGroups }}
				columnManager={{ toolbarButton: true, defaultOpen: true }}
			/>
		)
	}

	const band = (root: HTMLElement) => root.querySelector('thead th[scope="colgroup"]')

	it('creates a group, moves a column into it, and renames it — updating the band', () => {
		const { container } = renderUI(<Harness />)

		// No band yet — no group configured.
		expect(band(container)).toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'New group' }))

		// Move the "First" column into the new group via its accessible move menu.
		fireEvent.click(screen.getByRole('button', { name: 'Move First' }))

		fireEvent.click(screen.getByText('Move to New group'))

		// The band now spans the grouped column.
		expect(band(container)?.textContent).toContain('New group')

		// Rename the group through its name input; the band follows.
		const nameInput = screen.getByLabelText('Group name for New group')

		fireEvent.change(nameInput, { target: { value: 'Identity' } })

		expect(band(container)?.textContent).toContain('Identity')
	})
})
