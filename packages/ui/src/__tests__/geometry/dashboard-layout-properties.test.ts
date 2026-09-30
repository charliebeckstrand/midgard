// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import {
	clampSpan,
	collides,
	type DashboardCell,
	type DashboardLayoutItem,
	type DashboardTileDemands,
	fits,
	mergeLayout,
	placeEntries,
	readingOrder,
	resolveCell,
	resolveLayout,
	sameGeometry,
	shiftCells,
	swapCells,
} from '../../modules/dashboard/engine/dashboard-layout'
import { cell } from '../helpers/dashboard-cells'

// The tables of `dashboard-layout.test.ts` hold the documented examples. The
// properties below read the same operations over generated boards.
//
// Each generator stays on integer grid units, because a saved layout holds
// integers. A board of 1 to 24 columns covers the default count and the
// narrow boards of a phone.

/** Each pair of cells that overlap, as the module's own `collides` reads them. */
function overlaps(cells: readonly DashboardCell[]): [DashboardCell, DashboardCell][] {
	return cells.flatMap((a, index) =>
		cells
			.slice(index + 1)
			.filter((b) => collides(a, b))
			.map((b): [DashboardCell, DashboardCell] => [a, b]),
	)
}

/** Whether a cell sits inside a board of `columns`, with a real span. */
function inside(target: DashboardCell, columns: number): boolean {
	return (
		target.x >= 0 &&
		target.y >= 0 &&
		target.w >= 1 &&
		target.h >= 1 &&
		target.x + target.w <= columns
	)
}

/** The ids that a generated layout can name. A small pool gives repeated ids. */
const ID_POOL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

/**
 * A saved entry. An `x` or a `w` can pass the edge of the board, so the clamp of
 * `resolveCell` has work to do.
 */
const savedItem = () =>
	fc.record(
		{
			id: fc.constantFrom(...ID_POOL),
			x: fc.integer({ min: -3, max: 30 }),
			y: fc.integer({ min: 0, max: 40 }),
			w: fc.integer({ min: 1, max: 30 }),
			h: fc.integer({ min: 1, max: 20 }),
			static: fc.boolean(),
		},
		{ requiredKeys: ['id', 'x', 'y', 'w'] },
	)

/**
 * The demands of one mounted tile. The store gives the engine only a usable
 * ratio (`usableDemands`), so the generator gives a finite ratio above zero.
 */
const tileDemands = (): fc.Arbitrary<DashboardTileDemands> =>
	fc.record(
		{
			ratio: fc.constantFrom(0.5, 1, 4 / 3, 16 / 9, 3),
			defaultSize: fc.record(
				{ w: fc.integer({ min: 1, max: 30 }), h: fc.integer({ min: 1, max: 20 }) },
				{ requiredKeys: ['w'] },
			),
			minSize: fc.record(
				{ w: fc.integer({ min: 1, max: 12 }), h: fc.integer({ min: 1, max: 12 }) },
				{ requiredKeys: [] },
			),
			maxSize: fc.record(
				{ w: fc.integer({ min: 1, max: 30 }), h: fc.integer({ min: 1, max: 30 }) },
				{ requiredKeys: [] },
			),
			rank: fc.tuple(
				fc.integer({ min: 0, max: 3 }),
				fc.integer({ min: 0, max: 3 }),
				fc.integer({ min: 0, max: 3 }),
			),
		},
		{ requiredKeys: [] },
	)

/**
 * The demands of one tile as a caller can pass them, before `usableDemands`: a
 * ratio can also be 0, negative, NaN, or infinite.
 */
const rawTileDemands = (): fc.Arbitrary<DashboardTileDemands> =>
	tileDemands().chain((demands) =>
		fc
			.constantFrom(0, -1, Number.NaN, Number.POSITIVE_INFINITY, demands.ratio)
			.map((ratio) => ({ ...demands, ratio })),
	)

/** The mounted tiles: a subset of the pool, so some entries have no tile. */
const mountedTiles = (demands: () => fc.Arbitrary<DashboardTileDemands> = tileDemands) =>
	fc
		.uniqueArray(fc.constantFrom(...ID_POOL), { maxLength: ID_POOL.length })
		.chain((ids) => fc.tuple(...ids.map((id) => fc.tuple(fc.constant(id), demands()))))
		.map((entries) => new Map<string, DashboardTileDemands>(entries))

const columnCount = () => fc.integer({ min: 1, max: 24 })

const savedLayout = () => fc.array(savedItem(), { maxLength: 10 })

/**
 * A board with no overlap. Each candidate cell is kept only when it fits the
 * cells before it. The spans come from a short list, so two cells of one span
 * are common and a swap has a partner.
 */
const clearBoard = () =>
	fc
		.record({
			// The floor of six columns holds the widest span of the list.
			columns: fc.integer({ min: 6, max: 24 }),
			candidates: fc.array(
				fc.record({
					x: fc.nat({ max: 23 }),
					y: fc.nat({ max: 20 }),
					span: fc.constantFrom([2, 2], [3, 2], [4, 4], [6, 3]),
					fixed: fc.nat({ max: 4 }).map((roll) => roll === 0),
				}),
				{ minLength: 1, maxLength: 12 },
			),
		})
		.map(({ columns, candidates }) => {
			const cells: DashboardCell[] = []

			for (const { x, y, span, fixed } of candidates) {
				const [w, h] = span as [number, number]

				const next = cell(`t${cells.length}`, x % (columns - w + 1), y, w, h, fixed)

				if (fits(cells, next, columns)) cells.push(next)
			}

			return { columns, cells }
		})

describe('clampSpan · properties', () => {
	const span = () => fc.integer({ min: -50, max: 50 })

	test.prop([span(), span(), span()])('stays inside ordered bounds', (value, a, b) => {
		const [min, max] = a <= b ? [a, b] : [b, a]

		const clamped = clampSpan(value, min, max)

		expect(clamped).toBeGreaterThanOrEqual(min)

		expect(clamped).toBeLessThanOrEqual(max)
	})

	test.prop([span(), span(), span()])(
		'gives the minimum when it is larger than the maximum',
		(value, a, b) => {
			fc.pre(a !== b)

			const [max, min] = a < b ? [a, b] : [b, a]

			expect(clampSpan(value, min, max)).toBe(min)
		},
	)

	test.prop([span(), span()])('applies no absent bound', (value, bound) => {
		expect(clampSpan(value, undefined, undefined)).toBe(value)

		expect(clampSpan(value, bound, undefined)).toBe(Math.max(value, bound))

		expect(clampSpan(value, undefined, bound)).toBe(Math.min(value, bound))
	})
})

describe('resolveLayout · properties', () => {
	test.prop([savedLayout(), mountedTiles(), columnCount()])(
		'gives each mounted tile one cell, and no other tile a cell',
		(items, demands, columns) => {
			const ids = resolveLayout(items, demands, columns).map((target) => target.id)

			expect(ids.toSorted()).toEqual([...demands.keys()].toSorted())
		},
	)

	test.prop([savedLayout(), mountedTiles(), columnCount()])(
		'keeps each cell inside the columns',
		(items, demands, columns) => {
			for (const target of resolveLayout(items, demands, columns)) {
				expect(inside(target, columns)).toBe(true)
			}
		},
	)

	// The contract lets an entry that the clamp does not move keep its place,
	// also on top of another such entry. Each other overlap is a break.
	test.prop([savedLayout(), mountedTiles(), columnCount()])(
		'lets only two entries that keep their saved place overlap',
		(items, demands, columns) => {
			const first = new Map<string, DashboardLayoutItem>()

			for (const item of items) if (!first.has(item.id)) first.set(item.id, item)

			const keepsPlace = (target: DashboardCell) => {
				const item = first.get(target.id)

				return (
					item !== undefined && item.x === target.x && item.y === target.y && item.w === target.w
				)
			}

			for (const [a, b] of overlaps(resolveLayout(items, demands, columns))) {
				expect(keepsPlace(a) && keepsPlace(b)).toBe(true)
			}
		},
	)

	test.prop([
		fc.uniqueArray(savedItem(), { selector: (item) => item.id, maxLength: ID_POOL.length }),
		mountedTiles(),
		columnCount(),
		fc.array(fc.nat(), { minLength: ID_POOL.length, maxLength: ID_POOL.length }),
	])('changes no cell when the entries change order', (items, demands, columns, keys) => {
		const shuffled = items
			.map((item, index) => ({ item, key: keys[index] as number }))
			.sort((a, b) => a.key - b.key)
			.map(({ item }) => item)

		const before = resolveLayout(items, demands, columns)

		expect(sameGeometry(resolveLayout(shuffled, demands, columns), before)).toBe(true)
	})

	// A commit writes the cells back with `mergeLayout`, and a reload reads the
	// merged layout. The reload must paint the board that the commit saw.
	test.prop([savedLayout(), mountedTiles(), columnCount()])(
		'reads a merged layout back as the cells that it saved',
		(items, demands, columns) => {
			const cells = resolveLayout(items, demands, columns)

			const merged = mergeLayout(items, cells, demands)

			expect(sameGeometry(resolveLayout(merged, demands, columns), cells)).toBe(true)
		},
	)

	// The engine reads a ratio that is not usable as a free-form tile. The write
	// must read it the same way, or it drops the height that the reload needs.
	test.prop([savedLayout(), mountedTiles(rawTileDemands), columnCount()])(
		'reads a merged layout back as the cells that it saved, for a ratio that is not usable',
		(items, demands, columns) => {
			const cells = resolveLayout(items, demands, columns)

			const merged = mergeLayout(items, cells, demands)

			expect(sameGeometry(resolveLayout(merged, demands, columns), cells)).toBe(true)
		},
	)
})

describe('placeEntries · properties', () => {
	test.prop([savedLayout(), columnCount()])(
		'keeps each entry inside the columns',
		(items, columns) => {
			for (const item of placeEntries(items, columns)) {
				expect(inside(resolveCell(item, undefined, columns), columns)).toBe(true)

				expect(resolveCell(item, undefined, columns)).toMatchObject({ x: item.x, w: item.w })
			}
		},
	)

	// An entry that moves takes a new object, so an overlap that remains must
	// be between two entries of the caller, as saved.
	test.prop([savedLayout(), columnCount()])(
		'lets only two entries that keep their saved place overlap',
		(items, columns) => {
			const own = new Set(items)

			const placed = placeEntries(items, columns)

			const byId = new Map(placed.map((item) => [item.id, item]))

			const cells = placed.map((item) => resolveCell(item, undefined, columns))

			for (const [a, b] of overlaps(cells)) {
				expect(own.has(byId.get(a.id) as DashboardLayoutItem)).toBe(true)

				expect(own.has(byId.get(b.id) as DashboardLayoutItem)).toBe(true)
			}
		},
	)

	test.prop([savedLayout(), columnCount()])('settles after one pass', (items, columns) => {
		const once = placeEntries(items, columns)

		expect(placeEntries(once, columns)).toBe(once)
	})
})

describe('swapCells · properties', () => {
	test.prop([clearBoard(), fc.nat(), fc.nat()])(
		'keeps a clear board clear, and a second swap restores it',
		({ cells }, i, j) => {
			const a = cells[i % cells.length] as DashboardCell

			const partners = cells.filter((other) => other.w === a.w && other.h === a.h)

			const b = partners[j % partners.length] as DashboardCell

			const swapped = swapCells(cells, a.id, b.id)

			expect(overlaps(swapped)).toEqual([])

			expect(sameGeometry(swapCells(swapped, a.id, b.id), cells)).toBe(true)
		},
	)
})

describe('shiftCells · properties', () => {
	/**
	 * A clear board with a run of equal-span tiles in one row. The slots of the
	 * run are left to right, with a gap of zero to two columns between them.
	 */
	const rowBoard = () =>
		fc
			.record({
				w: fc.integer({ min: 1, max: 4 }),
				h: fc.integer({ min: 1, max: 6 }),
				y: fc.nat({ max: 10 }),
				gaps: fc.array(fc.nat({ max: 2 }), { minLength: 2, maxLength: 6 }),
				fixed: fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
				extra: fc.nat({ max: 6 }),
				others: fc.array(
					fc.record({
						x: fc.nat({ max: 40 }),
						y: fc.nat({ max: 20 }),
						w: fc.integer({ min: 1, max: 6 }),
						h: fc.integer({ min: 1, max: 6 }),
					}),
					{ maxLength: 8 },
				),
			})
			.map(({ w, h, y, gaps, fixed, extra, others }) => {
				const cells: DashboardCell[] = []

				let x = 0

				for (const [index, gap] of gaps.entries()) {
					x += gap

					cells.push(cell(`r${index}`, x, y, w, h, fixed[index]))

					x += w
				}

				const columns = x + extra

				for (const other of others) {
					const span = Math.min(other.w, columns)

					const next = cell(
						`o${cells.length}`,
						other.x % (columns - span + 1),
						other.y,
						span,
						other.h,
					)

					if (fits(cells, next, columns)) cells.push(next)
				}

				return { columns, cells }
			})

	/** The movable equal-span tiles of the row of `id`, left to right. */
	function runOf(cells: readonly DashboardCell[], id: string): DashboardCell[] {
		const moving = cells.find((target) => target.id === id) as DashboardCell

		return cells
			.filter(
				(target) =>
					!target.static && target.y === moving.y && target.w === moving.w && target.h === moving.h,
			)
			.sort((a, b) => a.x - b.x)
	}

	test.prop([rowBoard(), fc.nat(), fc.nat()])(
		'moves the tile into the slot of its partner, and keeps the board clear',
		({ cells }, i, j) => {
			const row = cells.filter((target) => target.id.startsWith('r') && !target.static)

			fc.pre(row.length > 0)

			const moving = row[i % row.length] as DashboardCell

			const target = row[j % row.length] as DashboardCell

			const shifted = shiftCells(cells, moving.id, target.id)

			expect(shifted.find((other) => other.id === moving.id)?.x).toBe(target.x)

			expect(overlaps(shifted)).toEqual([])
		},
	)

	// The tiles of the run rotate through fixed slots: each keeps its row and its
	// span, and the set of origins stays the same.
	test.prop([rowBoard(), fc.nat(), fc.nat()])(
		'rotates the run through its own slots',
		({ cells }, i, j) => {
			const row = cells.filter((target) => target.id.startsWith('r') && !target.static)

			fc.pre(row.length > 0)

			const moving = row[i % row.length] as DashboardCell

			const target = row[j % row.length] as DashboardCell

			const run = runOf(cells, moving.id)

			const shifted = shiftCells(cells, moving.id, target.id)

			const after = runOf(shifted, moving.id)

			expect(after.map((slot) => slot.x)).toEqual(run.map((slot) => slot.x))

			expect(after.map((slot) => slot.id).toSorted()).toEqual(run.map((slot) => slot.id).toSorted())
		},
	)

	test.prop([rowBoard(), fc.nat(), fc.nat()])(
		'moves nothing outside the run between the two tiles',
		({ cells }, i, j) => {
			const row = cells.filter((target) => target.id.startsWith('r') && !target.static)

			fc.pre(row.length > 0)

			const moving = row[i % row.length] as DashboardCell

			const target = row[j % row.length] as DashboardCell

			const run = runOf(cells, moving.id)

			const from = run.indexOf(moving)

			const to = run.indexOf(target)

			const between = new Set(run.slice(Math.min(from, to), Math.max(from, to) + 1))

			const shifted = shiftCells(cells, moving.id, target.id)

			for (const [index, before] of cells.entries()) {
				if (!between.has(before)) expect(shifted[index]).toBe(before)
			}
		},
	)
})

describe('readingOrder · properties', () => {
	const origins = () =>
		fc.array(fc.record({ x: fc.nat({ max: 4 }), y: fc.nat({ max: 4 }) }), { maxLength: 12 })

	test.prop([origins()])(
		'orders the ids by row, then by column, and keeps the input order of a tie',
		(points) => {
			const items = points.map((point, index) => ({ id: `i${index}`, ...point }))

			const order = readingOrder(items)

			expect(order.toSorted()).toEqual(items.map((item) => item.id).toSorted())

			const byId = new Map(items.map((item, index) => [item.id, { ...item, index }]))

			for (let at = 1; at < order.length; at++) {
				const a = byId.get(order[at - 1] as string) as (typeof items)[number] & { index: number }

				const b = byId.get(order[at] as string) as (typeof items)[number] & { index: number }

				const rank = a.y - b.y || a.x - b.x || a.index - b.index

				expect(rank).toBeLessThan(0)
			}
		},
	)
})
