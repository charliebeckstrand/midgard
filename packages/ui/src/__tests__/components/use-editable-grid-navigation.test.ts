import { act, renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	cellKey,
	useEditableGridNavigation,
} from '../../components/editable-grid/use-editable-grid-navigation'

function setup(rowCount = 3, editableColCount = 3) {
	return renderHook(() => {
		const rowsRef = useRef<number[]>(Array.from({ length: rowCount }, (_, i) => i))

		return useEditableGridNavigation({ rowsRef, editableColCount })
	})
}

describe('cellKey', () => {
	it('joins row and col with a comma', () => {
		expect(cellKey(2, 4)).toBe('2,4')
	})
})

describe('useEditableGridNavigation: initial state', () => {
	it('starts with null active and anchor', () => {
		const { result } = setup()

		expect(result.current.active).toBeNull()

		expect(result.current.anchor).toBeNull()

		expect(result.current.extraCells.size).toBe(0)
	})
})

describe('useEditableGridNavigation: moveActiveTo', () => {
	it('sets the active cell without extending', () => {
		const { result } = setup()

		act(() => {
			result.current.moveActiveTo({ row: 1, col: 1 })
		})

		expect(result.current.active).toEqual({ row: 1, col: 1 })

		expect(result.current.anchor).toBeNull()
	})

	it('sets anchor to previous active when extend=true', () => {
		const { result } = setup()

		act(() => {
			result.current.moveActiveTo({ row: 0, col: 0 })
		})

		act(() => {
			result.current.moveActiveTo({ row: 1, col: 2 }, true)
		})

		expect(result.current.anchor).toEqual({ row: 0, col: 0 })

		expect(result.current.active).toEqual({ row: 1, col: 2 })
	})

	it('clears extra cells when moving without extend', () => {
		const { result } = setup()

		act(() => {
			result.current.setExtraCells(new Set([cellKey(0, 0)]))
		})

		act(() => {
			result.current.moveActiveTo({ row: 1, col: 1 })
		})

		expect(result.current.extraCells.size).toBe(0)
	})
})

describe('useEditableGridNavigation: moveActive', () => {
	it('clamps moves to grid bounds', () => {
		const { result } = setup(3, 3)

		act(() => {
			result.current.moveActiveTo({ row: 0, col: 0 })
		})

		act(() => {
			result.current.moveActive(-5, -5)
		})

		expect(result.current.active).toEqual({ row: 0, col: 0 })

		act(() => {
			result.current.moveActive(10, 10)
		})

		expect(result.current.active).toEqual({ row: 2, col: 2 })
	})

	it('is a no-op with zero rows', () => {
		const { result } = setup(0, 3)

		act(() => {
			result.current.moveActive(1, 1)
		})

		expect(result.current.active).toBeNull()
	})

	it('is a no-op with zero editable columns', () => {
		const { result } = setup(3, 0)

		act(() => {
			result.current.moveActive(1, 1)
		})

		expect(result.current.active).toBeNull()
	})

	it('starts at (0,0) when active is null', () => {
		const { result } = setup(3, 3)

		act(() => {
			result.current.moveActive(1, 1)
		})

		expect(result.current.active).toEqual({ row: 1, col: 1 })
	})
})

describe('useEditableGridNavigation: moveActiveTab', () => {
	it('wraps to the next row when going past the last column', () => {
		const { result } = setup(3, 3)

		act(() => {
			result.current.moveActiveTo({ row: 0, col: 2 })
		})

		let moved = false

		act(() => {
			moved = result.current.moveActiveTab(1)
		})

		expect(moved).toBe(true)

		expect(result.current.active).toEqual({ row: 1, col: 0 })
	})

	it('wraps to the previous row when going before the first column', () => {
		const { result } = setup(3, 3)

		act(() => {
			result.current.moveActiveTo({ row: 1, col: 0 })
		})

		let moved = false

		act(() => {
			moved = result.current.moveActiveTab(-1)
		})

		expect(moved).toBe(true)

		expect(result.current.active).toEqual({ row: 0, col: 2 })
	})

	it('returns false when tabbing past the last cell', () => {
		const { result } = setup(2, 2)

		act(() => {
			result.current.moveActiveTo({ row: 1, col: 1 })
		})

		let moved = true

		act(() => {
			moved = result.current.moveActiveTab(1)
		})

		expect(moved).toBe(false)
	})

	it('returns false when tabbing before the first cell', () => {
		const { result } = setup(2, 2)

		act(() => {
			result.current.moveActiveTo({ row: 0, col: 0 })
		})

		let moved = true

		act(() => {
			moved = result.current.moveActiveTab(-1)
		})

		expect(moved).toBe(false)
	})

	it('returns false with an empty grid', () => {
		const { result } = setup(0, 0)

		let moved = true

		act(() => {
			moved = result.current.moveActiveTab(1)
		})

		expect(moved).toBe(false)
	})
})

describe('useEditableGridNavigation: addCellToSelection', () => {
	it('adds previous active to extras and sets the new active', () => {
		const { result } = setup()

		act(() => {
			result.current.moveActiveTo({ row: 0, col: 0 })
		})

		act(() => {
			result.current.addCellToSelection({ row: 2, col: 2 })
		})

		expect(result.current.extraCells.has(cellKey(0, 0))).toBe(true)

		expect(result.current.active).toEqual({ row: 2, col: 2 })

		expect(result.current.anchor).toBeNull()
	})

	it('bakes in a prior rectangular selection', () => {
		const { result } = setup()

		act(() => {
			result.current.moveActiveTo({ row: 0, col: 0 })
		})

		// Extend to (1,1) — creates a 2x2 rectangle anchored at (0,0).
		act(() => {
			result.current.moveActiveTo({ row: 1, col: 1 }, true)
		})

		// CMD/Ctrl click on (2,2): the 2x2 rect should bake into extras.
		act(() => {
			result.current.addCellToSelection({ row: 2, col: 2 })
		})

		expect(result.current.extraCells.has(cellKey(0, 0))).toBe(true)
		expect(result.current.extraCells.has(cellKey(0, 1))).toBe(true)
		expect(result.current.extraCells.has(cellKey(1, 0))).toBe(true)
		expect(result.current.extraCells.has(cellKey(1, 1))).toBe(true)

		// The newly clicked cell should not appear in extras — it's the new active.
		expect(result.current.extraCells.has(cellKey(2, 2))).toBe(false)
	})
})
