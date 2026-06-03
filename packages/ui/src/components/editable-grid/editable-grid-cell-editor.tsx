'use client'

import { useEditableGridEdit } from './context'
import type { EditableGridColumn, EditableGridEditor } from './types'

type EditableGridCellEditorProps<T> = {
	rowIdx: number
	colIdx: number
	align: 'left' | 'center' | 'right'
	formatted: string
	row: T
	column: EditableGridColumn<T>
	editor: EditableGridEditor<T>
}

/**
 * The active cell's in-place editor. Split out of `EditableGridCell` so that it
 * — and only it — subscribes to the per-keystroke edit-session slice, leaving
 * the surrounding cell shells untouched while the user types.
 */
export function EditableGridCellEditor<T>({
	rowIdx,
	colIdx,
	align,
	formatted,
	row,
	column,
	editor: Editor,
}: EditableGridCellEditorProps<T>) {
	const { draft, setDraft, commitEdit, cancelEdit } = useEditableGridEdit()

	return (
		<div className="absolute inset-0 flex items-stretch">
			<Editor
				row={row}
				column={column}
				draft={draft}
				setDraft={setDraft}
				commit={commitEdit}
				cancel={cancelEdit}
				align={align}
				ariaLabel={`Edit row ${rowIdx + 1} column ${colIdx + 1}`}
				selectAllOnFocus={draft === formatted}
			/>
		</div>
	)
}
