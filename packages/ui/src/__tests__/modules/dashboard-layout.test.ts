// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	bottom,
	clampSpan,
	collides,
	type DashboardCell,
	type DashboardTileDemands,
	deriveHeight,
	fits,
	mergeLayout,
	minColumns,
	placeEntries,
	readingOrder,
	resolveCell,
	resolveLayout,
	sameGeometry,
	shiftCells,
	sortByOrder,
	swapCells,
	toLayoutItem,
} from '../../modules/dashboard/engine/dashboard-layout'
import { cell } from '../helpers/dashboard-cells'

/** The ids of each pair of cells that overlap. */
const overlaps = (cells: readonly DashboardCell[]) =>
	cells.flatMap((a, index) =>
		cells
			.slice(index + 1)
			.filter((b) => collides(a, b))
			.map((b) => [a.id, b.id]),
	)

describe('deriveHeight', () => {
	it('gives equal tiles equal heights', () => {
		expect(deriveHeight(8, 16 / 9)).toBe(deriveHeight(8, 16 / 9))

		expect(deriveHeight(12, 16 / 9)).toBe(27)
	})

	it('never returns less than one row', () => {
		expect(deriveHeight(1, 100)).toBe(1)
	})
})

describe('minColumns', () => {
	it('covers the demand plus one gap', () => {
		// 320 px + 8 px gap over a 40 px pitch needs 9 columns.
		expect(minColumns(320, 8, 40, 24)).toBe(9)
	})

	it('caps at the column count and survives an unmeasured pitch', () => {
		expect(minColumns(9999, 8, 40, 24)).toBe(24)

		expect(minColumns(320, 8, 0, 24)).toBe(1)
	})
})

describe('resolveCell and toLayoutItem', () => {
	it('clamps into the canvas and derives a ratio height', () => {
		const resolved = resolveCell({ id: 'a', x: 30, y: -2, w: 12, h: 99 }, { ratio: 16 / 9 }, 24)

		expect(resolved).toEqual(cell('a', 12, 0, 12, 27))
	})

	it('reads a ratio that is not a finite number above 0 as a free-form tile', () => {
		for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			// No ratio derives a height, so the saved height applies.
			expect(resolveCell({ id: 'a', x: 0, y: 0, w: 8, h: 10 }, { ratio }, 24)).toEqual(
				cell('a', 0, 0, 8, 10),
			)
		}
	})

	it('writes a ratio tile back without h', () => {
		expect(toLayoutItem(cell('a', 0, 0, 12, 27), { ratio: 16 / 9 })).toEqual({
			id: 'a',
			x: 0,
			y: 0,
			w: 12,
		})

		expect(toLayoutItem(cell('b', 0, 0, 12, 10, true), {})).toEqual({
			id: 'b',
			x: 0,
			y: 0,
			w: 12,
			h: 10,
			static: true,
		})
	})
})

describe('collision and fit', () => {
	const board = [cell('a', 0, 0, 12, 10), cell('b', 12, 0, 12, 10)]

	it('reads edge contact as clear', () => {
		expect(collides(board[0] as DashboardCell, board[1] as DashboardCell)).toBe(false)
	})

	it('ignores the cell with the same id', () => {
		expect(fits(board, cell('a', 0, 0, 12, 10), 24)).toBe(true)
	})

	it('rejects an overlap and a placement past the edge', () => {
		expect(fits(board, cell('c', 6, 5, 12, 10), 24)).toBe(false)

		expect(fits(board, cell('c', 20, 20, 8, 10), 24)).toBe(false)
	})

	it('finds the bottom edge, less one cell on request', () => {
		const tall = [...board, cell('c', 0, 10, 8, 30)]

		expect(bottom(tall)).toBe(40)

		expect(bottom(tall, 'c')).toBe(10)
	})
})

describe('swap and shift', () => {
	it('swaps origins and keeps the untouched cells by identity', () => {
		const board = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10), cell('c', 0, 10, 8, 10)]

		const next = swapCells(board, 'a', 'c')

		expect(next[0]).toMatchObject({ x: 0, y: 10 })

		expect(next[2]).toMatchObject({ x: 0, y: 0 })

		expect(next[1]).toBe(board[1])
	})

	it('shifts the run between the source and the target', () => {
		const board = [
			cell('a', 0, 0, 6, 10),
			cell('b', 6, 0, 6, 10),
			cell('c', 12, 0, 6, 10),
			cell('d', 18, 0, 6, 10),
		]

		const next = shiftCells(board, 'a', 'c')

		const x = Object.fromEntries(next.map((item) => [item.id, item.x]))

		expect(x).toEqual({ a: 12, b: 0, c: 6, d: 18 })

		expect(next[3]).toBe(board[3])
	})

	it('leaves a static tile in place', () => {
		const board = [cell('a', 0, 0, 8, 10, true), cell('b', 8, 0, 8, 10)]

		expect(swapCells(board, 'a', 'b')).toEqual(board)
	})
})

describe('resolveLayout', () => {
	it('places entries, slots new tiles below in mount order, and ignores unmounted entries', () => {
		const demands = new Map([
			['a', { ratio: 16 / 9 }],
			['new-1', {}],
			['new-2', {}],
		])

		const cells = resolveLayout(
			[
				{ id: 'a', x: 0, y: 0, w: 12 },
				{ id: 'gone', x: 12, y: 0, w: 12 },
			],
			demands,
			24,
		)

		expect(cells.map((item) => item.id)).toEqual(['a', 'new-1', 'new-2'])

		expect(cells[1]).toMatchObject({ x: 0, y: 27 })

		expect(cells[2]).toMatchObject({ x: 0, y: 45 })
	})

	it('places the new tiles in markup order, and a tie or a tile with no rank in mount order', () => {
		const demands = new Map<string, DashboardTileDemands>([
			['later', { rank: [2, 0, 0] }],
			['none', {}],
			['jsx', { rank: [1, 2, 0] }],
			['copy', { rank: [1, 1, 3] }],
			['source', { rank: [1, 1, 0] }],
			['twin', { rank: [1, 1, 3] }],
		])

		// The group comes before the index, so a JSX tile of a later group follows each spec tile.
		expect(resolveLayout([], demands, 24).map((item) => [item.id, item.y])).toEqual([
			['source', 0],
			['copy', 18],
			['twin', 36],
			['jsx', 54],
			['later', 72],
			['none', 90],
		])
	})

	it('gives a new tile its default size, and derives the height of a ratio tile', () => {
		const demands = new Map([
			['a', { ratio: 16 / 9 }],
			['stat', { defaultSize: { w: 6, h: 16 } }],
			['chart', { ratio: 2, defaultSize: { w: 12, h: 99 } }],
			['wide', { defaultSize: { w: 40 } }],
		])

		const cells = resolveLayout([{ id: 'a', x: 0, y: 0, w: 12 }], demands, 24)

		expect(cells[1]).toMatchObject({ id: 'stat', x: 0, y: 27, w: 6, h: 16 })

		// A ratio tile ignores the default height; the width derives it.
		expect(cells[2]).toMatchObject({ id: 'chart', x: 0, y: 43, w: 12, h: 24 })

		// The span clamps to the columns, and the height falls to the default.
		expect(cells[3]).toMatchObject({ id: 'wide', x: 0, y: 67, w: 24, h: 18 })
	})

	it('moves each entry that a smaller column count puts on another entry to a new row', () => {
		const demands = new Map([
			['a', {}],
			['b', {}],
			['c', {}],
			['new', {}],
		])

		// Saved at 24 columns and shown at 12, the clamp puts b and c on columns 4 to 11.
		const cells = resolveLayout(
			[
				{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
				{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
				{ id: 'c', x: 16, y: 0, w: 8, h: 10 },
			],
			demands,
			12,
		)

		expect(overlaps(cells)).toEqual([])

		// The moved entries go under the lowest tile, and a tile with no entry goes last.
		expect(cells).toEqual([
			cell('a', 0, 0, 8, 10),
			cell('b', 0, 10, 8, 10),
			cell('c', 0, 20, 8, 10),
			cell('new', 0, 30, 8, 18),
		])
	})

	it('moves an entry past an edge to a new row when its clamp covers another entry', () => {
		const demands = new Map([
			['b', {}],
			['c', {}],
		])

		const b = { id: 'b', x: 16, y: 0, w: 4, h: 10 }

		// The clamp moves c from x 22 to x 18, onto columns 18 and 19 of b.
		const c = { id: 'c', x: 22, y: 0, w: 6, h: 10 }

		const expected = [cell('b', 16, 0, 4, 10), cell('c', 0, 10, 6, 10)]

		expect(resolveLayout([b, c], demands, 24)).toEqual(expected)

		// The entry as saved keeps its place, so the order of the entries does not matter.
		expect(resolveLayout([c, b], demands, 24)).toEqual(expected)

		// An entry above the top edge clamps to row 0, onto b.
		expect(resolveLayout([b, { ...c, x: 16, y: -10 }], demands, 24)).toEqual(expected)
	})

	it('keeps an entry that overlaps another as saved, and a clamped entry on free cells', () => {
		const demands = new Map([
			['a', {}],
			['b', {}],
			['c', {}],
		])

		const cells = resolveLayout(
			[
				{ id: 'a', x: 0, y: 0, w: 12, h: 10 },
				{ id: 'b', x: 6, y: 5, w: 12, h: 10 },
				{ id: 'c', x: 30, y: 20, w: 6, h: 10 },
			],
			demands,
			24,
		)

		expect(cells).toEqual([
			cell('a', 0, 0, 12, 10),
			cell('b', 6, 5, 12, 10),
			cell('c', 18, 20, 6, 10),
		])
	})

	it('reads the moved entries by their saved place, and not by their order in the layout', () => {
		const demands = new Map([
			['a', {}],
			['b', {}],
			['c', {}],
		])

		const a = { id: 'a', x: 0, y: 0, w: 8, h: 10 }

		const b = { id: 'b', x: 8, y: 0, w: 8, h: 10 }

		const c = { id: 'c', x: 16, y: 0, w: 8, h: 10 }

		const byId = (cells: readonly DashboardCell[]) =>
			[...cells].sort((p, q) => p.id.localeCompare(q.id))

		// At 12 columns, the clamp puts b and c on a. The new rows follow the saved places.
		const expected = [cell('a', 0, 0, 8, 10), cell('b', 0, 10, 8, 10), cell('c', 0, 20, 8, 10)]

		expect(byId(resolveLayout([a, b, c], demands, 12))).toEqual(expected)

		expect(byId(resolveLayout([a, c, b], demands, 12))).toEqual(expected)

		// The clamp puts d and e on columns 18 to 23. The entry that reads first keeps that place.
		const d = { id: 'd', x: 30, y: 0, w: 6, h: 10 }

		const e = { id: 'e', x: 28, y: 0, w: 6, h: 10 }

		const edges = new Map([
			['d', {}],
			['e', {}],
		])

		const clamped = [cell('d', 0, 10, 6, 10), cell('e', 18, 0, 6, 10)]

		expect(byId(resolveLayout([d, e], edges, 24))).toEqual(clamped)

		expect(byId(resolveLayout([e, d], edges, 24))).toEqual(clamped)
	})

	it('compares geometry id by id', () => {
		const a = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10)]

		expect(sameGeometry(a, [...a].reverse())).toBe(true)

		expect(sameGeometry(a, [cell('a', 0, 0, 8, 10), cell('b', 8, 1, 8, 10)])).toBe(false)
	})
})

describe('placeEntries', () => {
	it('places each entry where resolveLayout places a free-form tile', () => {
		const layout = [
			{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
			{ id: 'c', x: 16, y: 0, w: 8 },
			{ id: 'a', x: 0, y: 40, w: 8, h: 10 },
		]

		const demands = new Map([
			['a', {}],
			['b', {}],
			['c', {}],
		])

		const placed = placeEntries(layout, 12)

		expect(placed.map((item) => resolveCell(item, {}, 12))).toEqual(
			resolveLayout(layout, demands, 12),
		)

		// The entry takes the new x, y, and w, and it keeps no h, as saved.
		expect(placed[2]).toStrictEqual({ id: 'c', x: 0, y: 20, w: 8 })
	})

	it('returns the same array when no entry moves and no id repeats', () => {
		const layout = [
			{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
		]

		expect(placeEntries(layout, 24)).toBe(layout)
	})
})

describe('mergeLayout', () => {
	it('drops each entry of an id that an earlier entry holds, and keeps the first', () => {
		const saved = [
			{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
			{ id: 'a', x: 16, y: 20, w: 8, h: 10 },
			{ id: 'gone', x: 0, y: 40, w: 8, h: 10 },
			{ id: 'gone', x: 8, y: 40, w: 8, h: 10 },
		]

		const demands = new Map([
			['a', {}],
			['b', {}],
		])

		const merged = mergeLayout(saved, [cell('a', 0, 10, 8, 10), cell('b', 8, 0, 8, 10)], demands)

		// The first entry of a takes the commit, and a tile that is not mounted keeps its first entry.
		expect(merged).toEqual([{ id: 'a', x: 0, y: 10, w: 8, h: 10 }, saved[1], saved[3]])

		expect(merged[1]).toBe(saved[1])
	})

	it('appends a mounted tile with no entry, and no cell of a tile that is not mounted', () => {
		const saved = [{ id: 'a', x: 0, y: 0, w: 8, h: 10 }]

		const demands = new Map([
			['a', {}],
			['new', {}],
		])

		const cells = [cell('a', 8, 0, 8, 10), cell('gone', 0, 10, 8, 10), cell('new', 16, 0, 8, 10)]

		expect(mergeLayout(saved, cells, demands)).toEqual([
			{ id: 'a', x: 8, y: 0, w: 8, h: 10 },
			{ id: 'new', x: 16, y: 0, w: 8, h: 10 },
		])
	})
})

describe('readingOrder', () => {
	it('orders by row, then by column, and keeps the input order at one origin', () => {
		const items = [
			{ id: 'c', x: 0, y: 27 },
			{ id: 'b', x: 12, y: 0 },
			{ id: 'a', x: 0, y: 0 },
			{ id: 'twin', x: 0, y: 27 },
		]

		expect(readingOrder(items)).toEqual(['a', 'b', 'c', 'twin'])
	})
})

describe('sortByOrder', () => {
	const id = (item: { id: string }) => item.id

	it('sorts by rank, and puts an unranked item last in its input order', () => {
		const items = [{ id: 'new-1' }, { id: 'b' }, { id: 'new-2' }, { id: 'a' }]

		expect(sortByOrder(items, ['a', 'b'], id).map(id)).toEqual(['a', 'b', 'new-1', 'new-2'])
	})

	it('returns the same array when the order does not change', () => {
		const items = [{ id: 'a' }, { id: 'b' }, { id: 'new' }]

		expect(sortByOrder(items, ['a', 'b'], id)).toBe(items)
	})
})

describe('clampSpan', () => {
	it('clamps into the bounds, and skips an absent bound', () => {
		expect(clampSpan(20, 4, 12)).toBe(12)

		expect(clampSpan(2, 4, 12)).toBe(4)

		expect(clampSpan(20, undefined, undefined)).toBe(20)

		expect(clampSpan(2, undefined, 12)).toBe(2)
	})

	it('lets the minimum win over a smaller maximum', () => {
		expect(clampSpan(6, 10, 4)).toBe(10)
	})
})

describe('resolveLayout with grid-unit limits', () => {
	it('places a new tile at its default size within its limits', () => {
		const demands = new Map([
			['wide', { defaultSize: { w: 20, h: 40 }, maxSize: { w: 12, h: 30 } }],
			['narrow', { minSize: { w: 10, h: 24 } }],
		])

		expect(resolveLayout([], demands, 24)).toEqual([
			cell('wide', 0, 0, 12, 30),
			cell('narrow', 0, 30, 10, 24),
		])
	})

	it('keeps a saved entry as saved, outside the limits', () => {
		const demands = new Map([['a', { maxSize: { w: 6 } }]])

		expect(resolveLayout([{ id: 'a', x: 0, y: 0, w: 12, h: 10 }], demands, 24)).toEqual([
			cell('a', 0, 0, 12, 10),
		])
	})

	it('gives a new tile with a fixed ratio the height of its clamped width', () => {
		const demands = new Map([['a', { ratio: 16 / 9, maxSize: { w: 6, h: 4 } }]])

		expect(resolveLayout([], demands, 24)).toEqual([cell('a', 0, 0, 6, 14)])
	})
})
