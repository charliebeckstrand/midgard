import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
	EditableGridEditValue,
	EditableGridStateValue,
} from '../../components/editable-grid/context'
import {
	EditableGridEditContext,
	EditableGridStateContext,
	useEditableGrid,
} from '../../components/editable-grid/context'

const stateValue: EditableGridStateValue = {
	active: { row: 1, col: 2 },
	anchor: { row: 0, col: 0 },
	extraCells: new Set(['0:1']),
	editing: false,
	setActive: vi.fn(),
	addCellToSelection: vi.fn(),
	beginEdit: vi.fn(),
}

const editValue: EditableGridEditValue = {
	draft: 'hello',
	setDraft: vi.fn(),
	commitEdit: vi.fn(() => true),
	cancelEdit: vi.fn(),
}

function wrapper({ children }: { children: ReactNode }) {
	return (
		<EditableGridStateContext value={stateValue}>
			<EditableGridEditContext value={editValue}>{children}</EditableGridEditContext>
		</EditableGridStateContext>
	)
}

describe('useEditableGrid', () => {
	it('merges the state and edit-session slices into a single view', () => {
		const { result } = renderHook(() => useEditableGrid(), { wrapper })

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
