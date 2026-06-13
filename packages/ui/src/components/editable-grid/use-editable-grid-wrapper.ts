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
} from './types'

/** The grid's active cell, non-null. @internal */
type GridActiveCell = NonNullable<EditableGridNavigationApi['active']>

/**
 * Dependencies threaded to the module-level key handlers. Bundled so the
 * handlers keep flat signatures and are scored at base nesting depth.
 *
 * @internal
 */
type GridKeyDeps<T> = {
	active: EditableGridNavigationApi['active']
	anchor: EditableGridNavigationApi['anchor']
	extraCells: EditableGridNavigationApi['extraCells']
	hasMultiSelection: boolean
	activeRef: EditableGridNavigationApi['activeRef']
	moveActive: EditableGridNavigationApi['moveActive']
	moveActiveTo: EditableGridNavigationApi['moveActiveTo']
	moveActiveTab: EditableGridNavigationApi['moveActiveTab']
	setActive: EditableGridNavigationApi['setActive']
	setAnchor: EditableGridNavigationApi['setAnchor']
	setExtraCells: EditableGridNavigationApi['setExtraCells']
	beginEdit: EditableGridDraftApi['beginEdit']
	applyCellWrite: EditableGridMutationsApi['applyCellWrite']
	applyBulkFill: EditableGridMutationsApi['applyBulkFill']
	rowsRef: EditableGridRowsApi<T>['rowsRef']
	editableCols: EditableGridRowsApi<T>['editableCols']
	formatCell: EditableGridRowsApi<T>['formatCell']
}

/** Dependencies for the matrix-paste path. @internal */
type GridPasteDeps<T> = {
	editableCols: EditableGridRowsApi<T>['editableCols']
	rowsRef: EditableGridRowsApi<T>['rowsRef']
	getKey: EditableGridRowsApi<T>['getKey']
	parseValue: EditableGridRowsApi<T>['parseValue']
}

/** True when `target` is a selection checkbox inside the grid wrapper. @internal */
function isGridCheckbox(
	target: EventTarget | null,
	wrapper: HTMLTableElement,
): target is HTMLInputElement {
	return (
		target instanceof HTMLInputElement &&
		target.type === 'checkbox' &&
		target !== (wrapper as Element) &&
		wrapper.contains(target)
	)
}

/**
 * Bridges a Tab from a selection checkbox into the cell cursor by resolving the
 * data-row the checkbox belongs to.
 *
 * @internal
 */
function bridgeFromCheckbox<T>(
	e: KeyboardEvent<HTMLTableElement>,
	checkbox: HTMLInputElement,
	table: HTMLTableElement,
	deps: GridKeyDeps<T>,
) {
	if (e.key !== 'Tab' || e.shiftKey) return

	const tr = checkbox.closest('tr')

	const section = tr?.parentElement

	if (!tr || !section) return

	let targetRow: number

	if (section.tagName === 'THEAD') {
		// Select-all checkbox bridges into the first data row.
		targetRow = 0
	} else if (section.tagName === 'TBODY') {
		// Resolve via `data-row-index`, not DOM child position: under
		// virtualization the body contains spacer rows plus only the windowed
		// rows; child position does not map to data order.
		const attr = tr.getAttribute('data-row-index')

		if (attr === null) return

		targetRow = Number(attr)
	} else {
		return
	}

	if (!Number.isInteger(targetRow) || targetRow < 0 || targetRow >= deps.rowsRef.current.length)
		return

	e.preventDefault()

	deps.moveActiveTo({ row: targetRow, col: 0 })

	table.focus()
}

/** Tab/Shift+Tab between cells; Shift+Tab from column 0 hands off to the row's selection checkbox. @internal */
function handleTab<T>(
	e: KeyboardEvent<HTMLTableElement>,
	wrapper: HTMLTableElement | null,
	deps: GridKeyDeps<T>,
) {
	const { active } = deps

	// Shift+Tab from the leftmost editable column moves focus to the row's
	// selection checkbox (when present) and clears active state.
	if (e.shiftKey && active?.col === 0 && wrapper) {
		// Look up the row by `data-row-index`, not DOM position, which is
		// unreliable under virtualization.
		const tr = wrapper.querySelector(`tbody tr[data-row-index="${active.row}"]`)

		const cb = tr?.querySelector<HTMLInputElement>('input[type="checkbox"]')

		if (cb) {
			e.preventDefault()

			deps.setActive(null)

			deps.setAnchor(null)

			deps.setExtraCells(new Set())

			cb.focus()

			return
		}
	}

	if (deps.moveActiveTab(e.shiftKey ? -1 : 1)) e.preventDefault()
}

/** Moves the active cell to `col` in the current row (Home/End), extending selection on Shift. @internal */
function moveToEdge<T>(e: KeyboardEvent<HTMLTableElement>, col: number, deps: GridKeyDeps<T>) {
	e.preventDefault()

	const prev = deps.activeRef.current ?? { row: 0, col: 0 }

	deps.moveActiveTo({ row: prev.row, col }, e.shiftKey)
}

/** Enters edit mode on the active cell seeded with its current formatted value. @internal */
function beginCellEdit<T>(e: KeyboardEvent<HTMLTableElement>, deps: GridKeyDeps<T>) {
	const { active, rowsRef, editableCols, formatCell, beginEdit } = deps

	if (!active) return

	const row = rowsRef.current[active.row]

	const col = editableCols[active.col]

	if (!row || !col) return

	e.preventDefault()

	beginEdit(active, formatCell(row, col))
}

/** Clears the active cell, or the whole selection under a multi-selection (Delete/Backspace). @internal */
function clearCells<T>(e: KeyboardEvent<HTMLTableElement>, deps: GridKeyDeps<T>) {
	const { active, hasMultiSelection, applyBulkFill, applyCellWrite } = deps

	if (!active) return

	e.preventDefault()

	if (hasMultiSelection) applyBulkFill('')
	else applyCellWrite(active.row, active.col, '')
}

/** Escape: collapses a multi-selection to the active cell, or clears the active cell. @internal */
function clearSelection<T>(e: KeyboardEvent<HTMLTableElement>, deps: GridKeyDeps<T>) {
	const { active, hasMultiSelection, anchor, extraCells, setActive, setAnchor, setExtraCells } =
		deps

	if (!active) return

	e.preventDefault()

	if (hasMultiSelection) {
		if (anchor) setAnchor(null)

		if (extraCells.size > 0) setExtraCells(new Set())
	} else {
		setActive(null)
	}
}

/**
 * Dispatches a non-printable grid key (arrows, Tab, Home/End, edit, clear).
 *
 * @returns `true` once a key is consumed so the caller skips the printable fallback.
 * @internal
 */
function handleEditableGridKey<T>(
	e: KeyboardEvent<HTMLTableElement>,
	wrapper: HTMLTableElement | null,
	deps: GridKeyDeps<T>,
): boolean {
	switch (e.key) {
		case 'ArrowUp':
			e.preventDefault()

			deps.moveActive(-1, 0, e.shiftKey)

			return true
		case 'ArrowDown':
			e.preventDefault()

			deps.moveActive(1, 0, e.shiftKey)

			return true
		case 'ArrowLeft':
			e.preventDefault()

			deps.moveActive(0, -1, e.shiftKey)

			return true
		case 'ArrowRight':
			e.preventDefault()

			deps.moveActive(0, 1, e.shiftKey)

			return true
		case 'Tab':
			handleTab(e, wrapper, deps)

			return true
		case 'Home':
			moveToEdge(e, 0, deps)

			return true
		case 'End':
			moveToEdge(e, deps.editableCols.length - 1, deps)

			return true
		case 'Enter':
		case 'F2':
		case ' ':
			beginCellEdit(e, deps)

			return true
		case 'Delete':
		case 'Backspace':
			clearCells(e, deps)

			return true
		case 'Escape':
			clearSelection(e, deps)

			return true
		default:
			return false
	}
}

/** A printable single character starts edit and replaces the active cell's value. @internal */
function tryPrintableEdit<T>(e: KeyboardEvent<HTMLTableElement>, deps: GridKeyDeps<T>) {
	const { active, rowsRef, editableCols, formatCell, beginEdit } = deps

	if (!active || e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return

	const row = rowsRef.current[active.row]

	const col = editableCols[active.col]

	if (!row || !col) return

	e.preventDefault()

	beginEdit(active, e.key, formatCell(row, col))
}

/** Parses tab/newline-delimited clipboard text into a cell matrix, dropping a spurious trailing empty row. @internal */
function parseClipboard(text: string): string[][] {
	const rows = text
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((r) => r.split('\t'))

	// Spreadsheet clipboards terminate text/plain with a newline; drop the
	// resulting empty trailing row so a copied cell pastes as a single cell
	// instead of a matrix write that blanks the row below the target.
	const trailing = rows[rows.length - 1]

	if (rows.length > 1 && trailing?.length === 1 && trailing[0] === '') rows.pop()

	return rows
}

/** Matrix paste: fills from the active cell, row-major, without bulk-fill. @internal */
function collectMatrixChanges<T>(
	matrix: string[][],
	activeCell: GridActiveCell,
	deps: GridPasteDeps<T>,
): CellChange[] {
	const changes: CellChange[] = []

	matrix.forEach((cells, r) => {
		cells.forEach((raw, c) => {
			const rowIdx = activeCell.row + r

			const colIdx = activeCell.col + c

			const col = deps.editableCols[colIdx]

			const row = deps.rowsRef.current[rowIdx]

			if (!col || !row || col.readOnly) return

			changes.push({
				rowKey: deps.getKey(row, rowIdx),
				columnId: col.id,
				value: deps.parseValue(raw, row, col),
			})
		})
	})

	return changes
}

/**
 * Wires the editable grid's wrapper-level interaction: `keydown` (cell
 * navigation, edit entry, clear, and checkbox bridging), `paste` (single-cell
 * and matrix writes), and focus/blur (seeding and clearing the active cell).
 * Returns the four handlers to spread onto the grid's `<table>` wrapper.
 *
 * @returns `onWrapperKeyDown` / `onWrapperPaste` / `onWrapperFocus` / `onWrapperBlur`.
 */
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
	wrapperRef,
	onValueChange,
}: {
	nav: EditableGridNavigationApi
	mutations: EditableGridMutationsApi
	draft: EditableGridDraftApi
	rows: EditableGridRowsApi<T>
	wrapperRef: RefObject<HTMLTableElement | null>
	onValueChange: (changes: CellChange[]) => void
}) {
	const hasMultiSelection = !!anchor || extraCells.size > 0

	const onWrapperKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTableElement>) => {
			if (editing) return

			if (rowsRef.current.length === 0 || editableCols.length === 0) return

			const deps: GridKeyDeps<T> = {
				active,
				anchor,
				extraCells,
				hasMultiSelection,
				activeRef,
				moveActive,
				moveActiveTo,
				moveActiveTab,
				setActive,
				setAnchor,
				setExtraCells,
				beginEdit,
				applyCellWrite,
				applyBulkFill,
				rowsRef,
				editableCols,
				formatCell,
			}

			const wrapper = wrapperRef.current

			// Events bubbled from an in-grid selection checkbox: only Tab forward
			// bridges into the cell cursor; Shift+Tab, Space, and all other keys
			// pass through to the checkbox.
			if (wrapper && isGridCheckbox(e.target, wrapper)) {
				bridgeFromCheckbox(e, e.target, wrapper, deps)

				return
			}

			if (handleEditableGridKey(e, wrapper, deps)) return

			tryPrintableEdit(e, deps)
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
			wrapperRef,
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

			const activeCell = active

			const matrix = parseClipboard(text)

			// Single cell → fill all selected cells if there's a multi-selection,
			// else write to active (which may still bulk-fill by row selection).
			if (matrix.length === 1 && (matrix[0]?.length ?? 0) === 1) {
				const raw = matrix[0]?.[0] ?? ''

				if (hasMultiSelection) applyBulkFill(raw)
				else applyCellWrite(activeCell.row, activeCell.col, raw)

				return
			}

			const changes = collectMatrixChanges(matrix, activeCell, {
				editableCols,
				rowsRef,
				getKey,
				parseValue,
			})

			if (changes.length) onValueChange(changes)
		},
		[
			editing,
			active,
			hasMultiSelection,
			editableCols,
			rowsRef,
			getKey,
			parseValue,
			onValueChange,
			applyCellWrite,
			applyBulkFill,
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

			// Clear Ctrl-clicked extras on blur, matching Escape behaviour.
			setExtraCells(new Set())
		},
		[wrapperRef, setActive, setAnchor, setExtraCells],
	)

	return { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur }
}
