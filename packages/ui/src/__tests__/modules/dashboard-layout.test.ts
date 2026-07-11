import { describe, expect, it } from 'vitest'
import {
	appendCell,
	bottom,
	collides,
	deriveHeight,
	fits,
	type LayoutCell,
	sameGeometry,
	shiftCells,
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
		expect(collides(cell('a', 0, 0, 4, 4), cell('a', 2, 2, 4, 4))).toBe(false)
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

describe('bottom', () => {
	it('reads the bottom edge off the lowest cell', () => {
		expect(bottom([cell('a', 0, 0, 4, 4), cell('b', 4, 2, 4, 4)])).toBe(6)
	})

	it('reads an empty canvas as zero', () => {
		expect(bottom([])).toBe(0)
	})
})

describe('fits', () => {
	const board = [cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18)]

	it('accepts free space inside the column span', () => {
		expect(fits(board, cell('c', 16, 0, 8, 18), 24)).toBe(true)

		expect(fits(board, cell('c', 0, 18, 8, 18), 24)).toBe(true)
	})

	it('rejects any overlap with another cell', () => {
		expect(fits(board, cell('c', 4, 0, 8, 18), 24)).toBe(false)
	})

	it('rejects the board edges', () => {
		expect(fits(board, cell('c', 20, 0, 8, 18), 24)).toBe(false)

		expect(fits(board, cell('c', -1, 0, 8, 18), 24)).toBe(false)

		expect(fits(board, cell('c', 16, -1, 8, 18), 24)).toBe(false)
	})

	it('ignores the cell already standing at its own id', () => {
		expect(fits(board, cell('a', 0, 0, 8, 18), 24)).toBe(true)
	})
})

describe('swapCells', () => {
	it('exchanges origins while each cell keeps its own span', () => {
		const swapped = swapCells([cell('a', 0, 0, 4, 4), cell('b', 8, 8, 4, 4)], 'a', 'b')

		expect(swapped).toEqual([cell('a', 8, 8, 4, 4), cell('b', 0, 0, 4, 4)])
	})

	it('refuses statics and missing ids', () => {
		const pinned = [cell('a', 0, 0, 4, 4), cell('s', 8, 0, 4, 4, true)]

		expect(swapCells(pinned, 'a', 's')).toEqual(pinned)

		expect(swapCells(pinned, 'a', 'ghost')).toEqual(pinned)
	})
})

describe('shiftCells', () => {
	/** Three 8-wides across one row, and a lone tile on the row below. */
	const row = () => [
		cell('a', 0, 0, 8, 18),
		cell('b', 8, 0, 8, 18),
		cell('c', 16, 0, 8, 18),
		cell('z', 0, 18, 8, 18),
	]

	it('trades a single step, leaving the rest of the row in place', () => {
		const shifted = shiftCells(row(), 'c', 'b')

		expect(shifted).toContainEqual(cell('b', 16, 0, 8, 18))

		expect(shifted).toContainEqual(cell('c', 8, 0, 8, 18))

		expect(shifted).toContainEqual(cell('a', 0, 0, 8, 18))
	})

	it('ripples the whole run when the move spans it', () => {
		// c to a's slot: a and b each roll one slot right to open the front.
		const shifted = shiftCells(row(), 'c', 'a')

		expect(shifted).toContainEqual(cell('c', 0, 0, 8, 18))

		expect(shifted).toContainEqual(cell('a', 8, 0, 8, 18))

		expect(shifted).toContainEqual(cell('b', 16, 0, 8, 18))
	})

	it('leaves the row below untouched', () => {
		expect(shiftCells(row(), 'c', 'a')).toContainEqual(cell('z', 0, 18, 8, 18))
	})

	it('refuses statics and missing ids', () => {
		const pinned = [cell('a', 0, 0, 8, 18), cell('s', 8, 0, 8, 18, true)]

		expect(shiftCells(pinned, 'a', 's')).toEqual(pinned)

		expect(shiftCells(pinned, 'a', 'ghost')).toEqual(pinned)
	})
})

describe('appendCell', () => {
	it('lands in the first fully open row below everything placed', () => {
		const appended = appendCell(
			[cell('a', 0, 0, 12, 4), cell('b', 12, 0, 12, 8)],
			cell('new', 0, 0, 8, 4),
		)

		expect(appended.find((entry) => entry.id === 'new')?.y).toBe(8)
	})

	it('lands at the top of an empty canvas', () => {
		expect(appendCell([], cell('new', 0, 5, 8, 4)).at(0)?.y).toBe(0)
	})
})

describe('sameGeometry', () => {
	it('matches layouts cell by cell regardless of order', () => {
		const a = [cell('a', 0, 0, 4, 4), cell('b', 4, 0, 4, 4)]

		const b = [cell('b', 4, 0, 4, 4), cell('a', 0, 0, 4, 4)]

		expect(sameGeometry(a, b)).toBe(true)
	})

	it('catches any moved or resized cell', () => {
		const a = [cell('a', 0, 0, 4, 4)]

		expect(sameGeometry(a, [cell('a', 1, 0, 4, 4)])).toBe(false)

		expect(sameGeometry(a, [cell('a', 0, 0, 5, 4)])).toBe(false)

		expect(sameGeometry(a, [])).toBe(false)
	})
})
