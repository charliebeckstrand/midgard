// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import {
	buildGroupSpans,
	collapsedHiddenIds,
	groupByColumn,
	groupedColumnOrder,
} from '../../modules/grid/engine/grid-group/compute'
import type { GridColumnGroup } from '../../modules/grid/grid-group-types'

const noPin = () => undefined

describe('groupedColumnOrder', () => {
	const groups: GridColumnGroup[] = [{ id: 'g', title: 'Group', columns: ['b', 'd'] }]

	// Every id is a manager-controlled (orderable) data column present in the order.
	const orderable = (order: (string | number)[]) => (id: string | number) => order.includes(id)

	it('leads with the group’s members, then the ungrouped columns in order', () => {
		const order = ['a', 'b', 'c', 'd', 'e']

		expect(groupedColumnOrder(order, groups, orderable(order))).toEqual(['b', 'd', 'a', 'c', 'e'])
	})

	it('orders group blocks by the groups array, then each group’s column order', () => {
		const order = ['a', 'b', 'c', 'd']

		const g: GridColumnGroup[] = [
			{ id: 'g1', columns: ['d', 'b'] },
			{ id: 'g2', columns: ['a'] },
		]

		expect(groupedColumnOrder(order, g, orderable(order))).toEqual(['d', 'b', 'a', 'c'])
	})

	it('holds non-orderable (selection/actions/frozen) columns in place', () => {
		const order = ['sel', 'a', 'b', 'c', 'd', 'act']

		// Only the data columns a–d are orderable; sel/act keep their slots.
		const isData = (id: string | number) => id !== 'sel' && id !== 'act'

		expect(groupedColumnOrder(order, groups, isData)).toEqual(['sel', 'b', 'd', 'a', 'c', 'act'])
	})

	it('is idempotent on an already-grouped order', () => {
		const order = ['a', 'b', 'c', 'd', 'e']

		const once = groupedColumnOrder(order, groups, orderable(order))

		expect(groupedColumnOrder(once, groups, orderable(once))).toEqual(once)
	})

	it('ignores group members absent from the order', () => {
		const order = ['a', 'b', 'c']

		expect(groupedColumnOrder(order, groups, orderable(order))).toEqual(['b', 'a', 'c'])
	})

	it('returns the order untouched with no groups', () => {
		const order = ['a', 'b', 'c']

		expect(groupedColumnOrder(order, [], () => true)).toBe(order)
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

// The tables above hold the documented examples. The properties below read the
// same four functions over generated groups, so a band that tiles wrongly
// shrinks to the smallest column set that shows it.

/** The column ids every generator draws from, so overlap and absence are common. */
const POOL: (string | number)[] = ['a', 'b', 'c', 'd', 'e', 'f']

const columnIds = () => fc.shuffledSubarray(POOL, { minLength: 1 })

/** Groups over the pool. Two groups can claim one column, which is the case that parts them. */
const groupList = () =>
	fc
		.array(fc.shuffledSubarray(POOL, { minLength: 1, maxLength: 4 }), { maxLength: 3 })
		.map((sets) => sets.map((columns, index) => ({ id: `g${index}`, title: `G${index}`, columns })))

/** A pin predicate over a generated subset; the side never changes the logic, only its presence. */
const pinning = () =>
	fc.shuffledSubarray(POOL, { minLength: 0, maxLength: 3 }).map((ids) => {
		const pinned = new Set(ids)

		return (id: string | number) => (pinned.has(id) ? ('left' as const) : undefined)
	})

describe('buildGroupSpans · properties', () => {
	test.prop([columnIds(), groupList(), pinning()])(
		'tiles the columns in order, leaving no gap and no overlap',
		(visible, groups, pinnedSide) => {
			const spans = buildGroupSpans(visible, groupByColumn(groups), pinnedSide)

			let offset = 0

			for (const span of spans) {
				expect(span.leadColumnId).toBe(visible[offset])

				expect(span.colSpan).toBeGreaterThanOrEqual(1)

				offset += span.colSpan
			}

			expect(offset).toBe(visible.length)
		},
	)

	test.prop([columnIds(), groupList(), pinning()])(
		'covers a single column with each plain filler',
		(visible, groups, pinnedSide) => {
			for (const span of buildGroupSpans(visible, groupByColumn(groups), pinnedSide)) {
				if (span.kind === 'plain') expect(span.colSpan).toBe(1)
			}
		},
	)

	test.prop([columnIds(), groupList(), pinning()])(
		'bands only unpinned columns of the band’s own group',
		(visible, groups, pinnedSide) => {
			const colToGroup = groupByColumn(groups)

			let offset = 0

			for (const span of buildGroupSpans(visible, colToGroup, pinnedSide)) {
				if (span.kind === 'group') {
					for (let step = 0; step < span.colSpan; step++) {
						const id = visible[offset + step] as string | number

						expect(pinnedSide(id)).toBeUndefined()

						expect(colToGroup.get(id)?.id).toBe(span.group.id)
					}
				}

				offset += span.colSpan
			}
		},
	)

	// A run is maximal, so two neighbours never carry one group between them.
	test.prop([columnIds(), groupList(), pinning()])(
		'never splits one group across two neighbouring bands',
		(visible, groups, pinnedSide) => {
			const spans = buildGroupSpans(visible, groupByColumn(groups), pinnedSide)

			for (let at = 0; at + 1 < spans.length; at++) {
				const before = spans[at]

				const after = spans[at + 1]

				if (before?.kind === 'group' && after?.kind === 'group') {
					expect(before.group.id).not.toBe(after.group.id)
				}
			}
		},
	)

	test.prop([columnIds(), groupList(), pinning()])(
		'leaves a pinned column out of every band',
		(visible, groups, pinnedSide) => {
			let offset = 0

			for (const span of buildGroupSpans(visible, groupByColumn(groups), pinnedSide)) {
				if (span.kind === 'plain' && pinnedSide(visible[offset] as string | number)) {
					expect(span.colSpan).toBe(1)
				}

				if (span.kind === 'group') {
					for (let step = 0; step < span.colSpan; step++) {
						expect(pinnedSide(visible[offset + step] as string | number)).toBeUndefined()
					}
				}

				offset += span.colSpan
			}
		},
	)
})

describe('groupedColumnOrder · properties', () => {
	/** An order, its groups, and the orderable subset the manager controls. */
	const layout = () =>
		columnIds().chain((order) =>
			fc.record({
				order: fc.constant(order),
				groups: groupList(),
				orderable: fc
					.shuffledSubarray(order, { minLength: 0 })
					.map((ids) => new Set<string | number>(ids)),
			}),
		)

	test.prop([layout()])('keeps every column, once', ({ order, groups, orderable }) => {
		const next = groupedColumnOrder(order, groups, (id) => orderable.has(id))

		expect([...next].sort()).toEqual([...order].sort())
	})

	test.prop([layout()])(
		'holds each unorderable column in its slot',
		({ order, groups, orderable }) => {
			const next = groupedColumnOrder(order, groups, (id) => orderable.has(id))

			order.forEach((id, index) => {
				if (!orderable.has(id)) expect(next[index]).toBe(id)
			})
		},
	)

	// The engine takes this every render, so a second pass must change nothing.
	test.prop([layout()])('maps a grouped order to itself', ({ order, groups, orderable }) => {
		const isOrderable = (id: string | number) => orderable.has(id)

		const once = groupedColumnOrder(order, groups, isOrderable)

		expect(groupedColumnOrder(once, groups, isOrderable)).toEqual(once)
	})

	test.prop([layout()])('leads with the grouped columns', ({ order, groups, orderable }) => {
		const next = groupedColumnOrder(order, groups, (id) => orderable.has(id))

		const claimed = new Set(
			groups.flatMap((group) => group.columns).filter((id) => orderable.has(id)),
		)

		const slots = next.filter((id) => orderable.has(id))

		const grouped = slots.filter((id) => claimed.has(id))

		expect(slots.slice(0, grouped.length)).toEqual(grouped)
	})
})

describe('groupByColumn · properties', () => {
	test.prop([groupList()])('binds a shared column to the first group that claims it', (groups) => {
		const map = groupByColumn(groups)

		for (const [id, group] of map) {
			expect(group.id).toBe(groups.find((candidate) => candidate.columns.includes(id))?.id)
		}
	})
})

describe('collapsedHiddenIds · properties', () => {
	test.prop([groupList(), fc.shuffledSubarray(['g0', 'g1', 'g2'], { minLength: 0 })])(
		'hides every member but the anchor of a collapsed group',
		(groups, collapsedIds) => {
			const collapsed = new Set<string | number>(collapsedIds)

			const hidden = collapsedHiddenIds(groups, collapsed)

			const expected = new Set<string | number>()

			for (const group of groups) {
				if (collapsed.has(group.id)) for (const id of group.columns.slice(1)) expected.add(id)
			}

			expect(hidden).toEqual(expected)
		},
	)

	test.prop([groupList()])('hides nothing while every group is expanded', (groups) => {
		expect(collapsedHiddenIds(groups, new Set())).toEqual(new Set())
	})
})
