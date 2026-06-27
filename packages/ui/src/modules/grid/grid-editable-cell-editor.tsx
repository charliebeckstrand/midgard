'use client'

import { useGridEditableEdit } from './grid-editable-context'
import type {
	GridEditableAlign,
	GridEditableColumn,
	GridEditableEditor,
} from './grid-editable-types'

type GridEditableCellEditorProps<T> = {
	rowIdx: number
	colIdx: number
	align: GridEditableAlign
	formatted: string
	row: T
	column: GridEditableColumn<T>
	editor: GridEditableEditor<T>
}

/**
 * The active cell's in-place editor. Only this component subscribes to the
 * per-keystroke edit-session slice; surrounding cell shells do not re-render
 * while the user types.
 *
 * @internal
 */
export function GridEditableCellEditor<T>({
	rowIdx,
	colIdx,
	align,
	formatted,
	row,
	column,
	editor: Editor,
}: GridEditableCellEditorProps<T>) {
	const { draft, setDraft, commitEdit, cancelEdit } = useGridEditableEdit()

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
				// Names the editor by the column it edits; non-string titles fall
				// back to the coordinate form.
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
