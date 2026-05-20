'use client'

import {
	type ClipboardEvent,
	type FocusEvent,
	type KeyboardEvent,
	type RefObject,
	useCallback,
} from 'react'
import type {
	CellChange,
	EditableGridDraftApi,
	EditableGridMutationsApi,
	EditableGridNavigationApi,
	EditableGridRowsApi,
	EditableGridSelectionApi,
} from './types'

export function useEditableGridWrapper<T>({
	nav: {
		active,
		anchor,
		extraCells,
		activeRef,
		moveActive,
		moveActiveTo,
		moveActiveTab,
		setActive,
		setAnchor,
		setExtraCells,
	},
	mutations: { applyCellWrite, applyBulkFill },
	draft: { editing, beginEdit },
	rows: { rowsRef, editableCols, getKey, formatCell, parseValue },
	selection: { selectionRef, setSelection },
	wrapperRef,
	onValueChange,
}: {
	nav: EditableGridNavigationApi
	mutations: EditableGridMutationsApi
	draft: EditableGridDraftApi
	rows: EditableGridRowsApi<T>
	selection: EditableGridSelectionApi
	wrapperRef: RefObject<HTMLTableElement | null>
	onValueChange: (changes: CellChange[]) => void
}) {
	const hasMultiSelection = !!anchor || extraCells.size > 0

	const onWrapperKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTableElement>) => {
			if (editing) return

			if (rowsRef.current.length === 0 || editableCols.length === 0) return

			const key = e.key

			switch (key) {
				case 'ArrowUp':
					e.preventDefault()

					moveActive(-1, 0, e.shiftKey)

					return
				case 'ArrowDown':
					e.preventDefault()

					moveActive(1, 0, e.shiftKey)

					return
				case 'ArrowLeft':
					e.preventDefault()

					moveActive(0, -1, e.shiftKey)

					return
				case 'ArrowRight':
					e.preventDefault()

					moveActive(0, 1, e.shiftKey)

					return
				case 'Tab':
					if (moveActiveTab(e.shiftKey ? -1 : 1)) e.preventDefault()

					return
				case 'Home': {
					e.preventDefault()

					const prev = activeRef.current ?? { row: 0, col: 0 }

					moveActiveTo({ row: prev.row, col: 0 }, e.shiftKey)

					return
				}
				case 'End': {
					e.preventDefault()

					const prev = activeRef.current ?? { row: 0, col: 0 }

					moveActiveTo({ row: prev.row, col: editableCols.length - 1 }, e.shiftKey)

					return
				}
				case 'Enter':
				case 'F2': {
					if (!active) return

					const row = rowsRef.current[active.row]

					const col = editableCols[active.col]

					if (!row || !col) return

					e.preventDefault()

					beginEdit(active, formatCell(row, col))

					return
				}
				case 'Delete':
				case 'Backspace':
					if (!active) return

					e.preventDefault()

					if (hasMultiSelection) applyBulkFill('')
					else applyCellWrite(active.row, active.col, '')

					return
				case 'Escape':
					if (!active) return

					e.preventDefault()

					if (hasMultiSelection) {
						if (anchor) setAnchor(null)

						if (extraCells.size > 0) setExtraCells(new Set())
					} else {
						setActive(null)
					}

					return
			}

			// Printable single character starts edit and replaces the value.
			if (active && key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
				const row = rowsRef.current[active.row]

				const col = editableCols[active.col]

				if (!row || !col) return

				e.preventDefault()

				beginEdit(active, key, formatCell(row, col))
			}
		},
		[
			editing,
			active,
			anchor,
			extraCells,
			hasMultiSelection,
			editableCols,
			rowsRef,
			activeRef,
			moveActive,
			moveActiveTo,
			moveActiveTab,
			setActive,
			setAnchor,
			setExtraCells,
			beginEdit,
			formatCell,
			applyCellWrite,
			applyBulkFill,
		],
	)

	const onWrapperPaste = useCallback(
		(e: ClipboardEvent<HTMLTableElement>) => {
			if (editing || !active) return

			const text = e.clipboardData.getData('text/plain')

			if (!text) return

			e.preventDefault()

			const matrix = text
				.replace(/\r\n/g, '\n')
				.split('\n')
				.map((r) => r.split('\t'))

			// Single cell → fill all selected cells if there's a multi-selection,
			// else write to active (which may still bulk-fill by row selection).
			if (matrix.length === 1 && (matrix[0]?.length ?? 0) === 1) {
				const raw = matrix[0]?.[0] ?? ''

				if (hasMultiSelection) applyBulkFill(raw)
				else applyCellWrite(active.row, active.col, raw)

				return
			}

			// Matrix paste: fill from active cell, row-major, without bulk-fill.
			const changes: CellChange[] = []

			matrix.forEach((cells, r) => {
				cells.forEach((raw, c) => {
					const rowIdx = active.row + r
					const colIdx = active.col + c

					const col = editableCols[colIdx]

					const row = rowsRef.current[rowIdx]

					if (!col || !row || col.readOnly) return

					changes.push({
						rowKey: getKey(row, rowIdx),
						columnId: col.id,
						value: parseValue(raw, row, col),
					})
				})
			})

			if (changes.length) {
				onValueChange(changes)

				if (selectionRef.current.size > 0) setSelection(new Set())
			}
		},
		[
			editing,
			active,
			hasMultiSelection,
			editableCols,
			rowsRef,
			selectionRef,
			getKey,
			parseValue,
			onValueChange,
			applyCellWrite,
			applyBulkFill,
			setSelection,
		],
	)

	const onWrapperFocus = useCallback(
		(e: FocusEvent<HTMLTableElement>) => {
			const wrapper = wrapperRef.current

			if (!wrapper || e.target !== wrapper) return

			if (activeRef.current) return

			const rel = e.relatedTarget

			if (rel instanceof Node && wrapper.contains(rel)) return

			if (rowsRef.current.length === 0 || editableCols.length === 0) return

			const cameFromAfter =
				rel instanceof Node &&
				!!(wrapper.compareDocumentPosition(rel) & Node.DOCUMENT_POSITION_FOLLOWING)

			moveActiveTo(
				cameFromAfter
					? { row: rowsRef.current.length - 1, col: editableCols.length - 1 }
					: { row: 0, col: 0 },
			)
		},
		[wrapperRef, activeRef, rowsRef, editableCols, moveActiveTo],
	)

	const onWrapperBlur = useCallback(
		(e: FocusEvent<HTMLTableElement>) => {
			const next = e.relatedTarget

			if (next instanceof Node && wrapperRef.current?.contains(next)) return

			setActive(null)

			setAnchor(null)
		},
		[wrapperRef, setActive, setAnchor],
	)

	return { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur }
}
