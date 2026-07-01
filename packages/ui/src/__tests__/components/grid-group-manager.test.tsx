import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridColumnGroup } from '../../modules/grid'
import {
	addGroupTo,
	assignColumn,
	buildManagerZones,
	findZoneId,
	moveBetweenZones,
	recolorGroupIn,
	removeGroupFrom,
	renameGroupIn,
	reorderGroups,
	settleDragEnd,
	UNGROUPED,
	type ZoneMap,
	zoneMapToStores,
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

	it('reorders the groups array, moving a group to another’s slot', () => {
		expect(reorderGroups(groups, 'g2', 'g1').map((g) => g.id)).toEqual(['g2', 'g1'])

		// A missing id or a no-op returns the array unchanged (same reference).
		expect(reorderGroups(groups, 'g1', 'g1')).toBe(groups)

		expect(reorderGroups(groups, 'missing', 'g1')).toBe(groups)
	})

	it('partitions orderable columns into group zones and an ungrouped pool', () => {
		const zones = buildManagerZones(groups, ['a', 'b', 'c', 'd'])

		expect(zones.map((z) => z.id)).toEqual(['g1', 'g2', UNGROUPED])

		expect(zones[0]?.columnIds).toEqual(['a', 'b'])

		expect(zones[2]?.columnIds).toEqual(['d'])
	})
})

describe('group manager drag helpers', () => {
	const map: ZoneMap = { g: ['a', 'b'], [UNGROUPED]: ['c', 'd'] }

	it('finds the zone owning a column, and a zone id itself', () => {
		expect(findZoneId(map, 'a')).toBe('g')

		expect(findZoneId(map, 'd')).toBe(UNGROUPED)

		// A drop on the zone droppable (e.g. an empty zone) resolves to that zone.
		expect(findZoneId(map, 'g')).toBe('g')

		expect(findZoneId(map, 'missing')).toBeUndefined()
	})

	it('moves a column into another zone at the over-item slot', () => {
		// Drop 'c' onto 'a' (top half) → into g before 'a'.
		expect(moveBetweenZones(map, 'c', 'a', false)).toEqual({
			g: ['c', 'a', 'b'],
			[UNGROUPED]: ['d'],
		})

		// Below the over-item's midpoint inserts after it.
		expect(moveBetweenZones(map, 'c', 'a', true)).toEqual({
			g: ['a', 'c', 'b'],
			[UNGROUPED]: ['d'],
		})
	})

	it('appends when dropped on the target zone id itself', () => {
		expect(moveBetweenZones(map, 'c', 'g', false)).toEqual({
			g: ['a', 'b', 'c'],
			[UNGROUPED]: ['d'],
		})
	})

	it('is a no-op (same reference) for a within-zone move', () => {
		expect(moveBetweenZones(map, 'a', 'b', false)).toBe(map)
	})

	it('settles a same-zone reorder on drop, and leaves cross-zone maps untouched', () => {
		expect(settleDragEnd(map, 'd', 'c')).toEqual({ g: ['a', 'b'], [UNGROUPED]: ['d', 'c'] })

		// Dropped on the zone id → move to the end.
		expect(settleDragEnd(map, 'a', 'g')).toEqual({ g: ['b', 'a'], [UNGROUPED]: ['c', 'd'] })

		// Cross-zone (already applied live in onDragOver) → unchanged.
		expect(settleDragEnd(map, 'a', 'c')).toBe(map)
	})
})

describe('zoneMapToStores', () => {
	const groups: GridColumnGroup[] = [{ id: 'g', title: 'G', columns: ['a', 'b'] }]

	const order = ['a', 'b', 'c', 'd']

	const orderableIds = ['a', 'b', 'c', 'd']

	it('rebuilds group membership + order and reorders the ungrouped pool', () => {
		// 'b' moved out to ungrouped between c and d; 'a' stays in g.
		const map: ZoneMap = { g: ['a'], [UNGROUPED]: ['c', 'b', 'd'] }

		const next = zoneMapToStores(groups, order, orderableIds, map)

		expect(next.groups[0]?.columns).toEqual(['a'])

		// The ungrouped ids are spliced back in their new order, holding 'a' (grouped).
		expect(next.order).toEqual(['a', 'c', 'b', 'd'])
	})

	it('captures a column pulled into a group', () => {
		const map: ZoneMap = { g: ['a', 'b', 'c'], [UNGROUPED]: ['d'] }

		const next = zoneMapToStores(groups, order, orderableIds, map)

		expect(next.groups[0]?.columns).toEqual(['a', 'b', 'c'])
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

	it('withholds the move menu until a group exists', () => {
		renderUI(<Harness />)

		// No groups yet — nothing to move a column into.
		expect(screen.queryByRole('button', { name: /^Move / })).toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'New group' }))

		// Now the move menu appears on each column row.
		expect(screen.getAllByRole('button', { name: /^Move / }).length).toBeGreaterThan(0)
	})

	it('disables a color already taken by another group', () => {
		function ColoredHarness() {
			const [groups, setGroups] = useState<GridColumnGroup[]>([
				{ id: 'contact', title: 'Contact', color: 'blue', columns: ['first'] },
				{ id: 'org', title: 'Org', columns: ['last'] },
			])

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

		renderUI(<ColoredHarness />)

		// Open the second group's color picker; blue (used by the first group) is
		// offered disabled, while a free color stays selectable.
		fireEvent.click(screen.getByRole('combobox', { name: 'Color for Org' }))

		expect(screen.getByRole('option', { name: 'Blue' }).getAttribute('aria-disabled')).toBe('true')

		expect(screen.getByRole('option', { name: 'Red' }).getAttribute('aria-disabled')).not.toBe(
			'true',
		)
	})
})
