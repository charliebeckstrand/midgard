'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/editable-grid'
import { useEditableGridCellSlice } from './context'
import { EditableGridCellEditor } from './editable-grid-cell-editor'
import type { EditableGridAlign, EditableGridColumn, EditableGridEditor } from './types'
import { useEditableGridCellAriaSelected } from './use-editable-grid-cell-aria-selected'

type EditableGridCellContentProps<T> = {
	rowIdx: number
	colIdx: number
	readOnly: boolean
	align: EditableGridAlign
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

	// Bumps `flashKey` each time the rendered value changes, restarting the
	// keyframe animation on the flash overlay for consecutive edits.
	const prevFormattedRef = useRef(formatted)

	const [flashKey, setFlashKey] = useState(0)

	useEffect(() => {
		if (prevFormattedRef.current === formatted) return

		prevFormattedRef.current = formatted

		setFlashKey((n) => n + 1)
	}, [formatted])

	const cellRef = useRef<HTMLDivElement>(null)

	// `aria-selected` belongs on the owning `role="gridcell"` <td>, not this
	// inner content div — reflect the live selection onto it.
	useEditableGridCellAriaSelected(cellRef, isActive || inRange)

	return (
		<div
			ref={cellRef}
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
