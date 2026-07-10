import { describe, expect, it } from 'vitest'
import {
	appendCell,
	bottom,
	collides,
	compactUp,
	deriveHeight,
	type LayoutCell,
	moveElement,
	sortCells,
	swapCells,
} from '../../modules/dashboard/dashboard-layout'

/** A cell literal with the noise defaulted away. */
function cell(id: string, x: number, y: number, w: number, h: number, pinned = false): LayoutCell {
	return { id, x, y, w, h, static: pinned }
}

describe('collides', () => {
	it('detects box overlap', () => {
		expect(collides(cell('a', 0, 0, 4, 4), cell('b', 2, 2, 4, 4))).toBe(true)
	})

	it('treats shared edges as clear', () => {
		expect(collides(cell('a', 0, 0, 4, 4), cell('b', 4, 0, 4, 4))).toBe(false)

		expect(collides(cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4))).toBe(false)
	})

	it('never collides a cell with itself', () => {
		expect(collides(cell('a', 0, 0, 4, 4), cell('a', 0, 0, 4, 4))).toBe(false)
	})
})

describe('deriveHeight', () => {
	it('derives identical heights for identical ratio and width', () => {
		expect(deriveHeight(8, 16 / 9)).toBe(deriveHeight(8, 16 / 9))
	})

	it('lands 16:9 exactly at half, third, and sixth of 24 columns', () => {
		expect(deriveHeight(12, 16 / 9)).toBe(27)

		expect(deriveHeight(8, 16 / 9)).toBe(18)

		expect(deriveHeight(4, 16 / 9)).toBe(9)
	})

	it('never derives below one row', () => {
		expect(deriveHeight(1, 100)).toBe(1)
	})
})

describe('sortCells and bottom', () => {
	it('sorts by row then column without mutating the input', () => {
		const cells = [cell('b', 4, 0, 4, 4), cell('c', 0, 4, 4, 4), cell('a', 0, 0, 4, 4)]

		expect(sortCells(cells).map((entry) => entry.id)).toEqual(['a', 'b', 'c'])

		expect(cells[0]?.id).toBe('b')
	})

	it('reads the bottom edge off the lowest cell', () => {
		expect(bottom([cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 6)])).toBe(10)

		expect(bottom([])).toBe(0)
	})
})

describe('compactUp', () => {
	it('floats a lone cell to the top', () => {
		expect(compactUp([cell('a', 0, 5, 4, 4)])).toEqual([cell('a', 0, 0, 4, 4)])
	})

	it('closes vertical gaps while keeping stack order', () => {
		const compacted = compactUp([cell('a', 0, 0, 4, 4), cell('b', 0, 10, 4, 4)])

		expect(compacted).toEqual([cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4)])
	})

	it('leaves side-by-side cells alone', () => {
		const cells = [cell('a', 0, 0, 4, 4), cell('b', 4, 0, 4, 4)]

		expect(compactUp(cells)).toEqual(cells)
	})

	it("slides lower cells up into a removed cell's room", () => {
		const survivors = compactUp([cell('b', 0, 4, 4, 4), cell('c', 0, 8, 4, 4)])

		expect(survivors).toEqual([cell('b', 0, 0, 4, 4), cell('c', 0, 4, 4, 4)])
	})

	it('pins statics and flows movable cells around them', () => {
		const pinned = cell('s', 0, 6, 4, 4, true)

		const compacted = compactUp([pinned, cell('a', 0, 20, 4, 4)])

		expect(compacted).toEqual([pinned, cell('a', 0, 10, 4, 4)])
	})

	it('stacks cells the caller left overlapping', () => {
		const compacted = compactUp([cell('a', 0, 0, 12, 4), cell('b', 6, 0, 12, 4)])

		expect(compacted).toEqual([cell('a', 0, 0, 12, 4), cell('b', 6, 4, 12, 4)])
	})

	it('returns cells in input order without mutating the input', () => {
		const cells = [cell('low', 0, 8, 4, 4), cell('high', 0, 0, 4, 4)]

		const compacted = compactUp(cells)

		expect(compacted.map((entry) => entry.id)).toEqual(['low', 'high'])

		expect(cells[0]).toEqual(cell('low', 0, 8, 4, 4))
	})

	it('is idempotent', () => {
		const once = compactUp([cell('a', 0, 3, 6, 4), cell('b', 6, 1, 6, 4), cell('c', 0, 9, 12, 4)])

		expect(compactUp(once)).toEqual(once)
	})
})

describe('moveElement', () => {
	it('moves into clear space without touching neighbours', () => {
		const moved = moveElement([cell('a', 0, 0, 4, 4), cell('b', 4, 0, 4, 4)], 'a', 8, 0, 24)

		expect(moved).toEqual([cell('a', 8, 0, 4, 4), cell('b', 4, 0, 4, 4)])
	})

	it('hops the landed-on cell above when dragging down onto it', () => {
		const moved = moveElement([cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4)], 'a', 0, 4, 24)

		expect(moved).toEqual([cell('a', 0, 4, 4, 4), cell('b', 0, 0, 4, 4)])
	})

	it('pushes the landed-on cell down when dragging up onto it, settling under compaction', () => {
		const moved = moveElement([cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4)], 'b', 0, 0, 24)

		expect(compactUp(moved)).toEqual([cell('a', 0, 4, 4, 4), cell('b', 0, 0, 4, 4)])
	})

	it('inserts above the landed-on cell when dropped on its origin', () => {
		const stack = [cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4), cell('c', 0, 8, 4, 4)]

		const settled = compactUp(moveElement(stack, 'a', 0, 8, 24))

		expect(settled.find((entry) => entry.id === 'a')?.y).toBe(4)

		expect(settled.find((entry) => entry.id === 'b')?.y).toBe(0)

		expect(settled.find((entry) => entry.id === 'c')?.y).toBe(8)
	})

	it('drops past everything into open space at the bottom', () => {
		const stack = [cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4), cell('c', 0, 8, 4, 4)]

		const settled = compactUp(moveElement(stack, 'a', 0, 12, 24))

		expect(settled.find((entry) => entry.id === 'a')?.y).toBe(8)

		expect(settled.find((entry) => entry.id === 'b')?.y).toBe(0)

		expect(settled.find((entry) => entry.id === 'c')?.y).toBe(4)
	})

	it('hop-free, an insert onto a lower neighbour steps it softly below', () => {
		// With the hop, `b` would leapfrog above the drop — an "insert above b"
		// that lands below it. Hop-free it slides down exactly one slot.
		const moved = moveElement([cell('a', 0, 8, 4, 4), cell('b', 0, 0, 4, 4)], 'a', 0, 0, 24, {
			hop: false,
		})

		expect(compactUp(moved)).toEqual([cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4)])
	})

	it('hop-free, an insert above an adjacent lower tile is a no-op after compaction', () => {
		const stack = [cell('a', 0, 0, 4, 4), cell('b', 0, 4, 4, 4)]

		const settled = compactUp(moveElement(stack, 'a', 0, 4, 24, { hop: false }))

		expect(settled).toEqual(stack)
	})

	it('reverses roles against a static: the dragged cell is displaced instead', () => {
		const pinned = cell('s', 0, 4, 4, 4, true)

		const moved = moveElement([cell('a', 0, 0, 4, 4), pinned], 'a', 0, 4, 24)

		const settled = compactUp(moved)

		expect(settled.find((entry) => entry.id === 's')).toEqual(pinned)

		expect(collides(settled[0] as LayoutCell, settled[1] as LayoutCell)).toBe(false)
	})

	it('clamps the target inside the column span', () => {
		const moved = moveElement([cell('a', 0, 0, 6, 4)], 'a', 30, 0, 24)

		expect(moved).toEqual([cell('a', 18, 0, 6, 4)])
	})

	it('returns the input unchanged for a missing or static id', () => {
		const cells = [cell('a', 0, 0, 4, 4), cell('s', 4, 0, 4, 4, true)]

		expect(moveElement(cells, 'ghost', 0, 0, 24)).toEqual(cells)

		expect(moveElement(cells, 's', 8, 0, 24)).toEqual(cells)
	})

	it('never leaves an overlap once compacted', () => {
		const dense = [
			cell('a', 0, 0, 8, 8),
			cell('b', 8, 0, 8, 4),
			cell('c', 16, 0, 8, 12),
			cell('d', 0, 8, 8, 4),
			cell('e', 8, 4, 8, 8),
		]

		const settled = compactUp(moveElement(dense, 'a', 8, 2, 24))

		for (const first of settled) {
			for (const second of settled) {
				expect(collides(first, second)).toBe(false)
			}
		}
	})
})

describe('swapCells', () => {
	it('exchanges origins while each cell keeps its own span', () => {
		const swapped = swapCells([cell('a', 0, 0, 8, 8), cell('b', 8, 0, 16, 4)], 'a', 'b')

		expect(swapped).toEqual([cell('a', 8, 0, 8, 8), cell('b', 0, 0, 16, 4)])
	})

	it('refuses statics and missing ids', () => {
		const cells = [cell('a', 0, 0, 4, 4), cell('s', 4, 0, 4, 4, true)]

		expect(swapCells(cells, 'a', 's')).toEqual(cells)

		expect(swapCells(cells, 'a', 'ghost')).toEqual(cells)
	})
})

describe('appendCell', () => {
	it('lands after everything and compaction pulls it into row gaps', () => {
		const appended = appendCell(
			[cell('a', 0, 0, 12, 4), cell('b', 12, 0, 12, 8)],
			cell('new', 0, 0, 12, 4),
		)

		expect(appended.find((entry) => entry.id === 'new')?.y).toBe(8)

		expect(compactUp(appended).find((entry) => entry.id === 'new')?.y).toBe(4)
	})
})
