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
	const { active, editing, draft, setDraft, setActive, beginEdit, commitEdit, cancelEdit } =
		useEditableGrid()

	const isActive = active?.row === rowIdx && active?.col === colIdx

	const showInput = isActive && editing && !readOnly

	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (showInput) inputRef.current?.select()
	}, [showInput])

	return (
		// biome-ignore lint/a11y/useFocusableInteractive: focus lives on the grid wrapper; cells are focused programmatically via mouseDown
		// biome-ignore lint/a11y/useSemanticElements: role="gridcell" is the correct ARIA role inside a composite grid widget
		<div
			data-slot="editable-grid-cell"
			data-active={isActive || undefined}
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

				setActive({ row: rowIdx, col: colIdx })
			}}
			onDoubleClick={() => {
				if (readOnly) return

				beginEdit({ row: rowIdx, col: colIdx }, formatted)
			}}
		>
			{showInput ? (
				<input
					ref={inputRef}
					data-slot="editable-grid-input"
					className={cn(k.editInput)}
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
							e.preventDefault()

							commitEdit(e.shiftKey ? 'left' : 'right')
						}
					}}
				/>
			) : (
				<span className="truncate">{formatted}</span>
			)}
		</div>
	)
}
