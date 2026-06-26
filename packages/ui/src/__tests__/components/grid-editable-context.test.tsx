import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
	GridEditableEditValue,
	GridEditableStateValue,
} from '../../modules/grid/grid-editable-context'
import {
	GridEditableEditContext,
	GridEditableStateContext,
	useGridEditable,
} from '../../modules/grid/grid-editable-context'

const stateValue: GridEditableStateValue = {
	active: { row: 1, col: 2 },
	anchor: { row: 0, col: 0 },
	extraCells: new Set(['0:1']),
	editing: false,
	setActive: vi.fn(),
	addCellToSelection: vi.fn(),
	beginEdit: vi.fn(),
}

const editValue: GridEditableEditValue = {
	draft: 'hello',
	setDraft: vi.fn(),
	commitEdit: vi.fn(() => true),
	cancelEdit: vi.fn(),
}

function wrapper({ children }: { children: ReactNode }) {
	return (
		<GridEditableStateContext value={stateValue}>
			<GridEditableEditContext value={editValue}>{children}</GridEditableEditContext>
		</GridEditableStateContext>
	)
}

describe('useGridEditable', () => {
	it('merges the state and edit-session slices into a single view', () => {
		const { result } = renderHook(() => useGridEditable(), { wrapper })

		// State slice.
		expect(result.current.active).toEqual({ row: 1, col: 2 })

		expect(result.current.anchor).toEqual({ row: 0, col: 0 })

		expect(result.current.extraCells.has('0:1')).toBe(true)

		expect(result.current.editing).toBe(false)

		expect(result.current.setActive).toBe(stateValue.setActive)

		expect(result.current.beginEdit).toBe(stateValue.beginEdit)

		// Edit-session slice.
		expect(result.current.draft).toBe('hello')

		expect(result.current.setDraft).toBe(editValue.setDraft)

		expect(result.current.commitEdit).toBe(editValue.commitEdit)

		expect(result.current.cancelEdit).toBe(editValue.cancelEdit)
	})
})
