import { describe, expect, it } from 'vitest'
import type { LayoutCell } from '../../modules/dashboard/dashboard-layout'
import { type CellConstraints, deriveLayout } from '../../modules/dashboard/dashboard-responsive'

/** A cell literal with the noise defaulted away. */
function cell(id: string, x: number, y: number, w: number, h: number, pinned = false): LayoutCell {
	return { id, x, y, w, h, static: pinned }
}

/** Constraint map builder. */
function demands(entries: Record<string, CellConstraints>): Map<string, CellConstraints> {
	return new Map(Object.entries(entries))
}

const OPTIONS = { gap: 8, columns: 24 }

describe('deriveLayout', () => {
	it('is the identity when every cell honours its minimum width', () => {
		const cells = [cell('a', 0, 0, 12, 27), cell('b', 12, 0, 12, 27)]

		const derived = deriveLayout(cells, {
			...OPTIONS,
			containerWidth: 1200,
			constraints: demands({ a: { minWidth: 320 }, b: { minWidth: 320 } }),
		})

		expect(derived.identity).toBe(true)

		expect(derived.cells).toEqual(cells)
	})

	it('widens starved cells and stacks what no longer shares a row', () => {
		const cells = [cell('a', 0, 0, 12, 27), cell('b', 12, 0, 12, 27)]

		const derived = deriveLayout(cells, {
			...OPTIONS,
			containerWidth: 600,
			constraints: demands({
				a: { minWidth: 400, ratio: 16 / 9 },
				b: { minWidth: 400, ratio: 16 / 9 },
			}),
		})

		expect(derived.identity).toBe(false)

		const [a, b] = derived.cells

		// 600px over 24 columns is 25px a column; 400px + one 8px gap needs 17.
		expect(a?.w).toBe(17)

		expect(b?.w).toBe(17)

		expect(a?.y).toBe(0)

		expect(b?.y).toBe(a?.h)

		// Ratio-locked heights re-derive from the widened span.
		expect(a?.h).toBe(Math.round((4 * 17) / (16 / 9)))
	})

	it('shifts a widened cell left when its column no longer fits', () => {
		const derived = deriveLayout([cell('a', 20, 0, 4, 9)], {
			...OPTIONS,
			containerWidth: 240,
			constraints: demands({ a: { minWidth: 200 } }),
		})

		// 10px a column: 200px + gap needs 21 columns, which cannot start at 20.
		expect(derived.cells[0]?.x).toBe(3)

		expect(derived.cells[0]?.w).toBe(21)
	})

	it('leaves statics and unconstrained cells at their canonical span', () => {
		const pinned = cell('s', 0, 0, 4, 9, true)

		const derived = deriveLayout([pinned, cell('b', 4, 0, 4, 9)], {
			...OPTIONS,
			containerWidth: 240,
			constraints: demands({ s: { minWidth: 400 } }),
		})

		expect(derived.cells).toEqual([pinned, cell('b', 4, 0, 4, 9)])

		expect(derived.identity).toBe(true)
	})

	it('never mutates the canonical cells', () => {
		const cells = [cell('a', 0, 0, 12, 27), cell('b', 12, 0, 12, 27)]

		deriveLayout(cells, {
			...OPTIONS,
			containerWidth: 300,
			constraints: demands({ a: { minWidth: 400 }, b: { minWidth: 400 } }),
		})

		expect(cells).toEqual([cell('a', 0, 0, 12, 27), cell('b', 12, 0, 12, 27)])
	})

	it('derives nothing for an unmeasured container', () => {
		const cells = [cell('a', 0, 0, 12, 27)]

		const derived = deriveLayout(cells, {
			...OPTIONS,
			containerWidth: 0,
			constraints: demands({ a: { minWidth: 4000 } }),
		})

		expect(derived.identity).toBe(true)

		expect(derived.cells).toEqual(cells)
	})

	it('converges on a full-width reading-order stack in a narrow container', () => {
		const cells = [cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18), cell('c', 16, 0, 8, 18)]

		const derived = deriveLayout(cells, {
			...OPTIONS,
			containerWidth: 320,
			constraints: demands({
				a: { minWidth: 320, ratio: 16 / 9 },
				b: { minWidth: 320, ratio: 16 / 9 },
				c: { minWidth: 320, ratio: 16 / 9 },
			}),
		})

		const [a, b, c] = derived.cells

		expect([a?.w, b?.w, c?.w]).toEqual([24, 24, 24])

		expect(a?.y).toBe(0)

		expect(b?.y).toBe(a?.h)

		expect(c?.y).toBe((a?.h ?? 0) + (b?.h ?? 0))
	})
})
