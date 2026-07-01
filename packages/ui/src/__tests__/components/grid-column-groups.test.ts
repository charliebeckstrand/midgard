import { describe, expect, it } from 'vitest'
import type { GridColumnGroup } from '../../modules/grid/grid-group-types'
import {
	buildGroupSpans,
	collapsedHiddenIds,
	groupByColumn,
	groupedColumnOrder,
} from '../../modules/grid/use-grid-group'

const noPin = () => undefined

describe('groupedColumnOrder', () => {
	const groups: GridColumnGroup[] = [{ id: 'g', title: 'Group', columns: ['b', 'd'] }]

	it('pulls a group’s members contiguous at the first member’s position', () => {
		expect(groupedColumnOrder(['a', 'b', 'c', 'd', 'e'], groups)).toEqual(['a', 'b', 'd', 'c', 'e'])
	})

	it('orders members by the group’s column order, not the incoming order', () => {
		const g: GridColumnGroup[] = [{ id: 'g', columns: ['d', 'b'] }]

		expect(groupedColumnOrder(['a', 'b', 'c', 'd'], g)).toEqual(['a', 'd', 'b', 'c'])
	})

	it('is idempotent on an already-grouped order', () => {
		const once = groupedColumnOrder(['a', 'b', 'c', 'd', 'e'], groups)

		expect(groupedColumnOrder(once, groups)).toEqual(once)
	})

	it('ignores group members absent from the order', () => {
		expect(groupedColumnOrder(['a', 'b', 'c'], groups)).toEqual(['a', 'b', 'c'])
	})

	it('returns the order untouched with no groups', () => {
		const order = ['a', 'b', 'c']

		expect(groupedColumnOrder(order, [])).toBe(order)
	})
})

describe('groupByColumn', () => {
	it('binds a column shared by two groups to the first', () => {
		const groups: GridColumnGroup[] = [
			{ id: 'g1', columns: ['a', 'b'] },
			{ id: 'g2', columns: ['b', 'c'] },
		]

		const map = groupByColumn(groups)

		expect(map.get('b')?.id).toBe('g1')

		expect(map.get('c')?.id).toBe('g2')
	})
})

describe('collapsedHiddenIds', () => {
	const groups: GridColumnGroup[] = [
		{ id: 'g', columns: ['a', 'b', 'c'] },
		{ id: 'h', columns: ['d', 'e'] },
	]

	it('hides every member but the first anchor of a collapsed group', () => {
		expect(collapsedHiddenIds(groups, new Set(['g']))).toEqual(new Set(['b', 'c']))
	})

	it('leaves expanded groups fully visible', () => {
		expect(collapsedHiddenIds(groups, new Set())).toEqual(new Set())
	})

	it('accumulates hidden ids across several collapsed groups', () => {
		expect(collapsedHiddenIds(groups, new Set(['g', 'h']))).toEqual(new Set(['b', 'c', 'e']))
	})
})

describe('buildGroupSpans', () => {
	const groups: GridColumnGroup[] = [{ id: 'g', title: 'Group', columns: ['b', 'c'] }]

	const colToGroup = groupByColumn(groups)

	it('bands a contiguous run and fills ungrouped columns singly', () => {
		const spans = buildGroupSpans(['a', 'b', 'c', 'd'], colToGroup, noPin)

		expect(spans).toEqual([
			{ kind: 'plain', colSpan: 1, leadColumnId: 'a' },
			{ kind: 'group', group: groups[0], colSpan: 2, leadColumnId: 'b' },
			{ kind: 'plain', colSpan: 1, leadColumnId: 'd' },
		])
	})

	it('total span matches the column count so the rows align', () => {
		const ids = ['a', 'b', 'c', 'd']

		const total = buildGroupSpans(ids, colToGroup, noPin).reduce((n, s) => n + s.colSpan, 0)

		expect(total).toBe(ids.length)
	})

	it('splits a group when a member is not contiguous', () => {
		const spans = buildGroupSpans(['b', 'x', 'c'], colToGroup, noPin)

		expect(spans.map((s) => s.kind)).toEqual(['group', 'plain', 'group'])

		expect(spans[0]).toMatchObject({ colSpan: 1, leadColumnId: 'b' })

		expect(spans[2]).toMatchObject({ colSpan: 1, leadColumnId: 'c' })
	})

	it('keeps a pinned member out of the band as a plain filler', () => {
		const pinLeft = (id: string | number) => (id === 'b' ? ('left' as const) : undefined)

		const spans = buildGroupSpans(['b', 'c'], colToGroup, pinLeft)

		expect(spans[0]).toEqual({ kind: 'plain', colSpan: 1, leadColumnId: 'b' })

		expect(spans[1]).toMatchObject({ kind: 'group', colSpan: 1, leadColumnId: 'c' })
	})
})
