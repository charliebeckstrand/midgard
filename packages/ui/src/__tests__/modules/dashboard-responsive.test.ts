import { describe, expect, it } from 'vitest'
import type { CellConstraints } from '../../modules/dashboard/dashboard-constraints'
import { deriveHeight, type LayoutCell } from '../../modules/dashboard/dashboard-layout'
import { projectLayout } from '../../modules/dashboard/dashboard-responsive'

/** A cell literal with the noise defaulted away. */
function cell(id: string, x: number, y: number, w: number, h: number, pinned = false): LayoutCell {
	return { id, x, y, w, h, static: pinned }
}

/** A constraints registry from `[id, demands]` pairs. */
function demands(...entries: [string, CellConstraints][]): ReadonlyMap<string, CellConstraints> {
	return new Map(entries)
}

const RATIO = 16 / 9

/** A three-up row of ratio-locked 8-wides, every tile demanding 240px. */
function board(): LayoutCell[] {
	return [cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18), cell('c', 16, 0, 8, 18)]
}

function boardDemands(minWidth = 240) {
	return demands(
		['a', { ratio: RATIO, minWidth }],
		['b', { ratio: RATIO, minWidth }],
		['c', { ratio: RATIO, minWidth }],
	)
}

const at = (cells: readonly LayoutCell[], id: string) =>
	cells.find((candidate) => candidate.id === id)

describe('projectLayout', () => {
	it('is the identity while every tile honours its demand', () => {
		// 960px over 24 columns: 40px pitch, an 8-wide holds 320 − 8 = 312px.
		const projection = projectLayout(board(), {
			containerWidth: 960,
			gap: 8,
			columns: 24,
			constraints: boardDemands(),
		})

		expect(projection.identity).toBe(true)

		expect(projection.cells).toEqual(board())
	})

	it('is the identity before the container is measured', () => {
		const projection = projectLayout(board(), {
			containerWidth: 0,
			gap: 8,
			columns: 24,
			constraints: boardDemands(),
		})

		expect(projection.identity).toBe(true)
	})

	it('never mutates the canonical cells', () => {
		const canonical = board()

		projectLayout(canonical, {
			containerWidth: 400,
			gap: 8,
			columns: 24,
			constraints: boardDemands(),
		})

		expect(canonical).toEqual(board())
	})

	it('wraps a starved three-up row to two shelves, in reading order', () => {
		// 500px: ~20.8px pitch, so 240px demands ceil(248 / 20.83) = 12 columns.
		// Three 12s pack as [a b] stretched full, then [c] alone on its own shelf.
		const projection = projectLayout(board(), {
			containerWidth: 500,
			gap: 8,
			columns: 24,
			constraints: boardDemands(),
		})

		expect(projection.identity).toBe(false)

		expect(at(projection.cells, 'a')).toMatchObject({ x: 0, y: 0, w: 12 })

		expect(at(projection.cells, 'b')).toMatchObject({ x: 12, y: 0, w: 12 })

		expect(at(projection.cells, 'c')).toMatchObject({ x: 0, w: 24 })
	})

	it('converges on a full-width stack once no two tiles can share a row', () => {
		// 400px: ~16.7px pitch, so 240px demands 15 columns — one tile per shelf,
		// each stretched to the full span, stacked in reading order.
		const projection = projectLayout(board(), {
			containerWidth: 400,
			gap: 8,
			columns: 24,
			constraints: boardDemands(),
		})

		const h = deriveHeight(24, RATIO)

		expect(at(projection.cells, 'a')).toMatchObject({ x: 0, y: 0, w: 24, h })

		expect(at(projection.cells, 'b')).toMatchObject({ x: 0, y: h, w: 24, h })

		expect(at(projection.cells, 'c')).toMatchObject({ x: 0, y: 2 * h, w: 24, h })
	})

	it('re-derives ratio-locked heights at the projected span', () => {
		const projection = projectLayout(board(), {
			containerWidth: 500,
			gap: 8,
			columns: 24,
			constraints: boardDemands(),
		})

		// Shelf-mates at equal spans hold byte-identical derived heights.
		expect(at(projection.cells, 'a')?.h).toBe(deriveHeight(12, RATIO))

		expect(at(projection.cells, 'a')?.h).toBe(at(projection.cells, 'b')?.h)

		expect(at(projection.cells, 'c')?.h).toBe(deriveHeight(24, RATIO))
	})

	it('keeps a free-form cell its own height when widened', () => {
		const projection = projectLayout([cell('free', 0, 0, 8, 10), cell('peer', 8, 0, 8, 18)], {
			containerWidth: 400,
			gap: 8,
			columns: 24,
			constraints: demands(['free', { minWidth: 240 }], ['peer', { ratio: RATIO, minWidth: 240 }]),
		})

		expect(at(projection.cells, 'free')).toMatchObject({ w: 24, h: 10 })
	})

	it('stretches each shelf to the full span, remainder leftmost', () => {
		// 480px: 20px pitch. a demands ceil(288 / 20) = 15 columns; b (no demand)
		// keeps 8. 15 + 8 = 23 fits one shelf; the spare column goes leftmost.
		const projection = projectLayout([cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18)], {
			containerWidth: 480,
			gap: 8,
			columns: 24,
			constraints: demands(['a', { minWidth: 280 }]),
		})

		expect(at(projection.cells, 'a')).toMatchObject({ x: 0, w: 16 })

		expect(at(projection.cells, 'b')).toMatchObject({ x: 16, w: 8 })
	})

	it('packs in reading order — row, then column — across canonical rows', () => {
		// Two rows of two; all four starve to 12 at 500px. The wide-board reading
		// order (a b, then c d) survives as two projected shelves in that order.
		const twoRows = [
			cell('a', 0, 0, 8, 18),
			cell('b', 8, 0, 8, 18),
			cell('c', 0, 18, 8, 18),
			cell('d', 8, 18, 8, 18),
		]

		const projection = projectLayout(twoRows, {
			containerWidth: 500,
			gap: 8,
			columns: 24,
			constraints: demands(
				['a', { minWidth: 240 }],
				['b', { minWidth: 240 }],
				['c', { minWidth: 240 }],
				['d', { minWidth: 240 }],
			),
		})

		expect(at(projection.cells, 'a')).toMatchObject({ x: 0, y: 0 })

		expect(at(projection.cells, 'b')).toMatchObject({ x: 12, y: 0 })

		expect(at(projection.cells, 'c')).toMatchObject({ x: 0, y: 18 })

		expect(at(projection.cells, 'd')).toMatchObject({ x: 12, y: 18 })
	})

	it('flows statics with the rest — the projection overrides placement wholesale', () => {
		const pinned = [cell('a', 0, 0, 8, 18), cell('s', 8, 0, 8, 18, true), cell('c', 16, 0, 8, 18)]

		const projection = projectLayout(pinned, {
			containerWidth: 400,
			gap: 8,
			columns: 24,
			constraints: demands(
				['a', { minWidth: 240 }],
				['s', { minWidth: 240 }],
				['c', { minWidth: 240 }],
			),
		})

		// The static stacks in reading order like its peers; it keeps its flag.
		expect(at(projection.cells, 's')).toMatchObject({ x: 0, w: 24, static: true })

		expect(at(projection.cells, 's')?.y).toBeGreaterThan(0)
	})

	it('keeps the canonical span for a tile with no registered demand', () => {
		// b has no constraints entry: it never starves, and only re-packs because
		// a starved neighbour flipped the board into projection. a widens to 15
		// (240px at ~16.7px pitch); 15 + 4 still shares a shelf, and the stretch
		// hands the five spare columns out proportionally — the demanding tile
		// takes most of them.
		const projection = projectLayout([cell('a', 0, 0, 8, 18), cell('b', 8, 0, 4, 8)], {
			containerWidth: 400,
			gap: 8,
			columns: 24,
			constraints: demands(['a', { minWidth: 240 }]),
		})

		expect(projection.identity).toBe(false)

		expect(at(projection.cells, 'a')).toMatchObject({ x: 0, y: 0, w: 19 })

		expect(at(projection.cells, 'b')).toMatchObject({ x: 19, y: 0, w: 5 })
	})
})
