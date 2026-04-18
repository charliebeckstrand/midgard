'use client'

import { useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useEditableGrid } from './context'
import { k } from './variants'

export type EditableGridCellContentProps = {
	rowIdx: number
	colIdx: number
	readOnly: boolean
	align: 'left' | 'center' | 'right'
	formatted: string
}

export function EditableGridCellContent({
	rowIdx,
	colIdx,
	readOnly,
	align,
	formatted,
}: EditableGridCellContentProps) {
	const {
		active,
		anchor,
		extraCells,
		editing,
		draft,
		setDraft,
		setActive,
		addCellToSelection,
		beginEdit,
		commitEdit,
		cancelEdit,
	} = useEditableGrid()

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
		// biome-ignore lint/a11y/useFocusableInteractive: focus lives on the grid wrapper; cells are focused programmatically via mouseDown
		// biome-ignore lint/a11y/useSemanticElements: role="gridcell" is the correct ARIA role inside a composite grid widget
		<div
			data-slot="editable-grid-cell"
			data-active={isActive || undefined}
			data-in-range={inRange || undefined}
			role="gridcell"
			aria-readonly={readOnly || undefined}
			className={cn(
				k.cell,
				k.cellAlign[align],
				readOnly && k.cellReadOnly,
				isActive && !showInput && k.cellActive,
			)}
			onMouseDown={(e) => {
				if (showInput) return

				e.preventDefault()

				;(e.currentTarget.closest('[role=grid]') as HTMLElement | null)?.focus()

				const coord = { row: rowIdx, col: colIdx }

				if (e.metaKey || e.ctrlKey) addCellToSelection(coord)
				else setActive(coord, e.shiftKey)
			}}
			onDoubleClick={() => {
				if (readOnly) return

				beginEdit({ row: rowIdx, col: colIdx }, formatted)
			}}
		>
			<span className={cn('truncate', showInput && 'invisible')}>{formatted || '\u00A0'}</span>
			{showInput && (
				<input
					ref={inputRef}
					data-slot="editable-grid-input"
					size={1}
					className={cn(k.editInput, k.editInputAlign[align])}
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
