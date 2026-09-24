// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	bottom,
	collides,
	type DashboardCell,
	deriveHeight,
	fits,
	minColumns,
	readingOrder,
	resolveCell,
	resolveLayout,
	sameGeometry,
	shiftCells,
	sortByOrder,
	swapCells,
	toLayoutItem,
} from '../../modules/dashboard/engine/dashboard-layout'

const cell = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	fixed = false,
): DashboardCell => ({
	id,
	x,
	y,
	w,
	h,
	static: fixed,
})

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

	it('compares geometry id by id', () => {
		const a = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10)]

		expect(sameGeometry(a, [...a].reverse())).toBe(true)

		expect(sameGeometry(a, [cell('a', 0, 0, 8, 10), cell('b', 8, 1, 8, 10)])).toBe(false)
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
