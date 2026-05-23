'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import { useEditableGrid } from './context'
import type { EditableGridColumn, EditableGridEditor } from './types'

export type EditableGridCellContentProps<T> = {
	rowIdx: number
	colIdx: number
	readOnly: boolean
	align: 'left' | 'center' | 'right'
	formatted: string
	row: T
	column: EditableGridColumn<T>
	editor: EditableGridEditor<T>
}

export function EditableGridCell<T>({
	rowIdx,
	colIdx,
	readOnly,
	align,
	formatted,
	row,
	column,
	editor: Editor,
}: EditableGridCellContentProps<T>) {
	const { active, anchor, extraCells, editing, draft, setDraft, commitEdit, cancelEdit } =
		useEditableGrid()

	const isActive = active?.row === rowIdx && active?.col === colIdx

	const inRect =
		!!active &&
		!!anchor &&
		rowIdx >= Math.min(anchor.row, active.row) &&
		rowIdx <= Math.max(anchor.row, active.row) &&
		colIdx >= Math.min(anchor.col, active.col) &&
		colIdx <= Math.max(anchor.col, active.col)

	const inRange = !isActive && (inRect || extraCells.has(`${rowIdx},${colIdx}`))

	const showEditor = isActive && editing && !readOnly

	return (
		<div
			data-slot="editable-grid-cell"
			data-active={isActive || undefined}
			data-in-range={inRange || undefined}
			className={cn(
				k.cell({ align }),
				readOnly && k.cellReadOnly,
				isActive && !showEditor && k.cellActive,
			)}
		>
			<span className={cn('truncate', showEditor && 'invisible')}>{formatted || ' '}</span>
			{showEditor && (
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
			)}
		</div>
	)
}
