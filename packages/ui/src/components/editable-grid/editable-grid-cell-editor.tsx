'use client'

import { useEditableGridEdit } from './context'
import type { EditableGridAlign, EditableGridColumn, EditableGridEditor } from './types'

type EditableGridCellEditorProps<T> = {
	rowIdx: number
	colIdx: number
	align: EditableGridAlign
	formatted: string
	row: T
	column: EditableGridColumn<T>
	editor: EditableGridEditor<T>
}

/**
 * The active cell's in-place editor. Only this component subscribes to the
 * per-keystroke edit-session slice; surrounding cell shells are left untouched
 * while the user types.
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
				// Name the editor by what it edits — a bare "row 4 column 2" gives a
				// screen-reader user no column context. Non-string titles fall back
				// to the coordinate form.
				ariaLabel={
					typeof column.title === 'string'
						? `Edit ${column.title}, row ${rowIdx + 1}`
						: `Edit row ${rowIdx + 1} column ${colIdx + 1}`
				}
				selectAllOnFocus={draft === formatted}
			/>
		</div>
	)
}
