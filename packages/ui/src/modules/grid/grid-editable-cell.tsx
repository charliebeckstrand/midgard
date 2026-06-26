'use client'

import { useEffect, useRef, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid-editable'
import { GridEditableCellEditor } from './grid-editable-cell-editor'
import { useGridEditableCellSlice } from './grid-editable-context'
import type {
	GridEditableAlign,
	GridEditableColumn,
	GridEditableEditor,
} from './grid-editable-types'
import { useGridEditableCellAriaSelected } from './use-grid-editable-cell-aria-selected'

/** Props for {@link GridEditableCell}. @internal */
type GridEditableCellContentProps<T> = {
	rowIdx: number
	colIdx: number
	readOnly: boolean
	align: GridEditableAlign
	formatted: string
	row: T
	column: GridEditableColumn<T>
	editor: GridEditableEditor<T>
}

/**
 * One cell shell. Subscribes to its own derived selection slice via
 * {@link useGridEditableCellSlice} and re-renders only when its
 * active/in-range/edit flags flip; mounts the column's inline editor when its
 * cell holds the active edit. A keyframe flash overlay restarts whenever the
 * rendered value changes.
 *
 * @remarks
 * `aria-selected` lives on the owning `role="gridcell"` `<td>` (applied by
 * `Grid` through non-reactive `cellProps`); this content div mirrors it
 * imperatively via {@link useGridEditableCellAriaSelected}.
 *
 * @internal
 */
export function GridEditableCell<T>({
	rowIdx,
	colIdx,
	readOnly,
	align,
	formatted,
	row,
	column,
	editor: Editor,
}: GridEditableCellContentProps<T>) {
	const { isActive, inRange, showEditor } = useGridEditableCellSlice(rowIdx, colIdx, readOnly)

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
	// inner content div; this reflects the live selection onto it.
	useGridEditableCellAriaSelected(cellRef, isActive || inRange)

	return (
		<div
			ref={cellRef}
			data-slot="grid-editable-cell"
			data-active={dataAttr(isActive)}
			data-in-range={dataAttr(inRange)}
			className={cn(
				k.cell({ align }),
				readOnly && k.cellReadOnly,
				isActive && !showEditor && k.cellActive,
			)}
		>
			<span className={cn('truncate', showEditor && 'invisible')}>{formatted || ' '}</span>
			{flashKey > 0 && <span key={flashKey} aria-hidden className={cn(k.cellFlash)} />}
			{showEditor && (
				<GridEditableCellEditor
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
