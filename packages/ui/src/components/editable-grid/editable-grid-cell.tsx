'use client'

import { useEffect, useRef } from 'react'
import { cn } from '../../core'
import {
	editableGridCellInputVariants,
	editableGridCellVariants,
	k,
} from '../../recipes/kata/editable-grid'
import { useEditableGrid } from './context'

export type EditableGridCellContentProps = {
	rowIdx: number
	colIdx: number
	readOnly: boolean
	align: 'left' | 'center' | 'right'
	formatted: string
}

export function EditableGridCell({
	rowIdx,
	colIdx,
	readOnly,
	align,
	formatted,
}: EditableGridCellContentProps) {
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

	const showInput = isActive && editing && !readOnly

	const inputRef = useRef<HTMLInputElement>(null)

	// Snapshot the draft/formatted at the moment the input mounts; subsequent
	// changes (the user typing) shouldn't retrigger the cursor placement.
	const editEntryRef = useRef({ draft, formatted })

	editEntryRef.current = { draft, formatted }

	useEffect(() => {
		if (!showInput) return

		const input = inputRef.current

		if (!input) return

		input.focus()

		const entry = editEntryRef.current

		// Enter / F2 / double-click open the existing value → select all so the
		// next keystroke replaces it. Typing-to-edit seeds the draft with the
		// typed char, so place the cursor at the end to keep appending.
		if (entry.draft === entry.formatted) input.select()
		else input.setSelectionRange(entry.draft.length, entry.draft.length)
	}, [showInput])

	return (
		<div
			data-slot="editable-grid-cell"
			data-active={isActive || undefined}
			data-in-range={inRange || undefined}
			className={cn(
				editableGridCellVariants({ align }),
				readOnly && k.cellReadOnly,
				isActive && !showInput && k.cellActive,
			)}
		>
			<span className={cn('truncate', showInput && 'invisible')}>{formatted || ' '}</span>
			{showInput && (
				<input
					ref={inputRef}
					data-slot="editable-grid-input"
					size={1}
					aria-label={`Edit row ${rowIdx + 1} column ${colIdx + 1}`}
					className={editableGridCellInputVariants({ align })}
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={() => commitEdit('none')}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault()

							commitEdit('down')
						} else if (e.key === 'Escape') {
							e.preventDefault()

							cancelEdit()
						} else if (e.key === 'Tab') {
							if (commitEdit(e.shiftKey ? 'left' : 'right')) e.preventDefault()
						}
					}}
				/>
			)}
		</div>
	)
}
