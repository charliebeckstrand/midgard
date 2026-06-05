'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import { useEditableGridCellSlice } from './context'
import { EditableGridCellEditor } from './editable-grid-cell-editor'
import type { EditableGridColumn, EditableGridEditor } from './types'

type EditableGridCellContentProps<T> = {
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
	const { isActive, inRange, showEditor } = useEditableGridCellSlice(rowIdx, colIdx, readOnly)

	// Re-render the flash overlay with a fresh key each time the rendered value
	// changes so the keyframe animation restarts even on consecutive edits.
	const prevFormattedRef = useRef(formatted)

	const [flashKey, setFlashKey] = useState(0)

	useEffect(() => {
		if (prevFormattedRef.current === formatted) return

		prevFormattedRef.current = formatted

		setFlashKey((n) => n + 1)
	}, [formatted])

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
			{flashKey > 0 && <span key={flashKey} aria-hidden className={cn(k.cellFlash)} />}
			{showEditor && (
				<EditableGridCellEditor
					rowIdx={rowIdx}
					colIdx={colIdx}
					align={align}
					formatted={formatted}
					row={row}
					column={column}
					editor={Editor}
				/>
			)}
		</div>
	)
}
