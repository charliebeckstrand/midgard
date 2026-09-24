// @vitest-environment node
import type { Row } from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import { resolveGroupingGates } from '../../modules/grid/engine/grid-group/resolve'
import {
	bodyRowCount,
	detailWindowItems,
	detailWindowRowCount,
	type GridRowMotion,
	groupedWindowItems,
	groupedWindowRowCount,
	windowItemEstimate,
} from '../../modules/grid/engine/grid-items/items'
import type { GridColumn } from '../../modules/grid/types'

type Person = { id: number }

/** A group row as the item builders read it: an id, an expansion flag, and leaves. */
function group(id: string, open: boolean, leafIds: string[]): Row<Person> {
	return {
		id,
		getIsExpanded: () => open,
		subRows: leafIds.map((leafId) => ({ id: leafId, original: { id: Number(leafId) } })),
	} as unknown as Row<Person>
}

const NO_MOTIONS = new Map<string, GridRowMotion>()

describe('resolveGroupingGates', () => {
	const base = {
		groupingActive: false,
		manualGroupingActive: false,
		expandableActive: false,
		navigable: true,
		virtualize: true,
		virtualizeProp: true,
		pagination: undefined,
	}

	it('keeps an explicit virtualize and the cursor under client grouping and master-detail', () => {
		for (const active of ['groupingActive', 'expandableActive'] as const) {
			const gates = resolveGroupingGates({ ...base, [active]: true })

			expect(gates.virtualize).toBe(true)

			expect(gates.navigable).toBe(true)

			expect(gates.infiniteScroll).toBe(false)
		}
	})

	it('stands virtualize down under manual grouping', () => {
		const gates = resolveGroupingGates({ ...base, manualGroupingActive: true })

		expect(gates).toMatchObject({ virtualize: false, navigable: false, infiniteScroll: false })
	})

	it('keeps virtualize off for a self-rendering body that infinite scroll alone implies', () => {
		const gates = resolveGroupingGates({
			...base,
			groupingActive: true,
			virtualizeProp: undefined,
		})

		expect(gates.virtualize).toBe(false)
	})

	it('passes each flag through when no self-rendering body is active', () => {
		expect(resolveGroupingGates(base)).toMatchObject({
			virtualize: true,
			navigable: true,
			infiniteScroll: true,
		})

		expect(
			resolveGroupingGates({ ...base, virtualize: false, virtualizeProp: false }),
		).toMatchObject({ virtualize: false, infiniteScroll: false })
	})
})

describe('groupedWindowItems', () => {
	const groups = [group('role:A', true, ['1', '2']), group('role:B', false, ['3'])]

	it('prefixes the key of each item kind', () => {
		const items = groupedWindowItems(groups, { totalled: true, motions: NO_MOTIONS })

		expect(items.map((item) => item.key)).toEqual([
			'group:role:A',
			'leaf:1',
			'leaf:2',
			'total:role:A',
			'group:role:B',
		])

		expect(items.map((item) => item.position)).toEqual([0, 1, 2, 3, 4])
	})

	it('keeps a key that looks like a group id apart from the group', () => {
		const items = groupedWindowItems([group('7', true, ['7'])], {
			totalled: false,
			motions: NO_MOTIONS,
		})

		expect(new Set(items.map((item) => item.key)).size).toBe(items.length)
	})

	it('keeps the closing rows of a collapsed group under their own keys', () => {
		const motions = new Map<string, GridRowMotion>([
			['leaf:3', { phase: 'closing', size: 40 }],
			['total:role:B', { phase: 'closing', size: 30 }],
		])

		const items = groupedWindowItems(groups, { totalled: true, motions })

		const closed = items.slice(5)

		expect(
			closed.map((item) => [item.key, item.reactKey, item.position, item.phase, item.size]),
		).toEqual([
			['closing:3', 'leaf:3', -1, 'closing', 40],
			['closing-total:role:B', 'total:role:B', -1, 'closing', 30],
		])
	})

	it('leaves out the rows of a collapsed group that are not closing', () => {
		const motions = new Map<string, GridRowMotion>([['leaf:3', { phase: 'entering' }]])

		const items = groupedWindowItems(groups, { totalled: true, motions })

		expect(items.slice(5)).toEqual([])
	})

	it('counts the exposed items without the list', () => {
		for (const totalled of [false, true]) {
			const items = groupedWindowItems(groups, { totalled, motions: NO_MOTIONS })

			expect(groupedWindowRowCount(groups, totalled)).toBe(items.length)
		}
	})
})

describe('detailWindowItems', () => {
	const rows: Person[] = [{ id: 1 }, { id: 2 }, { id: 3 }]

	const rowKeys = rows.map((row) => row.id)

	const expansion = { expanded: new Set<string | number>([2]), rowExpandable: () => true }

	it('follows each open row with its panel, under prefixed keys', () => {
		const items = detailWindowItems({ rows, rowKeys, expansion, motions: new Map() })

		expect(items.map((item) => item.key)).toEqual(['row:1', 'row:2', 'detail:2', 'row:3'])

		expect(items.map((item) => item.position)).toEqual([0, 1, 2, 3])

		expect(detailWindowRowCount(rows, rowKeys, expansion)).toBe(items.length)
	})

	it('keeps a closing panel as an item that assistive tech does not count', () => {
		const items = detailWindowItems({
			rows,
			rowKeys,
			expansion,
			motions: new Map([[3, { phase: 'closing', size: 80 }]]),
		})

		expect(items.at(-1)).toMatchObject({
			key: 'closing:3',
			reactKey: 'detail:3',
			phase: 'closing',
			size: 80,
			position: -1,
		})
	})

	it('gives no panel to a row that cannot expand', () => {
		const items = detailWindowItems({
			rows,
			rowKeys,
			expansion: { ...expansion, rowExpandable: () => false },
			motions: new Map(),
		})

		expect(items.map((item) => item.kind)).toEqual(['row', 'row', 'row'])
	})
})

describe('windowItemEstimate', () => {
	it('guesses the row height for each kind', () => {
		for (const kind of ['group', 'leaf', 'total', 'row', 'detail']) {
			expect(windowItemEstimate({ kind }, 44)).toBe(44)
		}
	})

	it('guesses the height that a closing row had in view', () => {
		expect(windowItemEstimate({ kind: 'leaf', size: 112 }, 44)).toBe(112)
	})
})

describe('bodyRowCount', () => {
	const columns: GridColumn<Person>[] = [{ id: 'n', title: 'N', aggFunc: 'sum' }]

	const rows: Person[] = [{ id: 1 }, { id: 2 }, { id: 3 }]

	it('counts the data rows when the body is not windowed', () => {
		expect(
			bodyRowCount({
				virtualize: false,
				rows,
				rowKeys: [1, 2, 3],
				groupedRows: [group('role:A', true, ['1', '2', '3'])],
				groupTotalRow: true,
				columns,
				expansion: null,
			}),
		).toBe(3)
	})

	it('counts the headers and totals of a windowed grouped body', () => {
		expect(
			bodyRowCount({
				virtualize: true,
				rows,
				rowKeys: [1, 2, 3],
				groupedRows: [group('role:A', true, ['1', '2']), group('role:B', false, ['3'])],
				groupTotalRow: true,
				columns,
				expansion: null,
			}),
		).toBe(5)
	})
})
