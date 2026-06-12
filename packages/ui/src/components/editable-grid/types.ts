import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import type { DataTableColumn } from '../data-table'

export type Coord = { row: number; col: number }

export type CellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

/** Direction the cursor moves after a successful commit. */
export type EditableGridCommitAdvance = 'down' | 'right' | 'left' | 'none'

/** Horizontal text alignment for a column's cells and editor. */
export type EditableGridAlign = 'left' | 'center' | 'right'

/**
 * Props passed to a column's editor slot when it mounts in the active cell.
 * The grid owns the draft buffer, commit guard, and cursor advance; the slot
 * decides how to render the editor surface.
 */
export type EditableGridEditorProps<T> = {
	row: T
	column: EditableGridColumn<T>
	draft: string
	setDraft: Dispatch<SetStateAction<string>>
	/**
	 * Commit the current draft and advance the cursor. Returns `false` when the
	 * advance would exit the grid (caller may let the browser handle Tab).
	 */
	commit: (advance: EditableGridCommitAdvance) => boolean
	cancel: () => void
	align: EditableGridAlign
	ariaLabel: string
	/**
	 * `true` when the edit was opened via Enter / F2 / double-click (draft seeded
	 * from the cell's formatted value); `false` when it was opened by typing a
	 * printable character into the active cell.
	 */
	selectAllOnFocus: boolean
}

export type EditableGridEditor<T = unknown> = (props: EditableGridEditorProps<T>) => ReactNode

export type EditableGridColumn<T> = Omit<
	DataTableColumn<T>,
	'cell' | 'cellProps' | 'pinned' | 'hideable'
> & {
	/** Read/write field on the row. */
	field?: keyof T
	/** Format a cell value for display. Defaults to `String(row[field] ?? '')`. */
	format?: (row: T) => string
	/** Parse the raw editor string. Defaults to the raw string. */
	parse?: (raw: string, row: T) => unknown
	/**
	 * Inline editor mounted when the cell enters edit mode. Defaults to a plain
	 * text input. Built-in adapters are exported alongside the grid
	 * (`EditableGridCurrencyEditor`, `EditableGridNumberEditor`); custom editors
	 * receive the same {@link EditableGridEditorProps} contract.
	 */
	editor?: EditableGridEditor<T>
	/** Cells in this column can't be edited. Nav still visits them. */
	readOnly?: boolean
	align?: EditableGridAlign
}

export type EditableGridRowsApi<T> = {
	rowsRef: RefObject<T[]>
	editableCols: EditableGridColumn<T>[]
	getKey: (row: T, index: number) => string | number
	formatCell: (row: T, col: EditableGridColumn<T>) => string
	parseValue: (raw: string, row: T, col: EditableGridColumn<T>) => unknown
}

export type EditableGridSelectionApi = {
	selectionRef: RefObject<Set<string | number>>
}

export type EditableGridNavigationApi = {
	active: Coord | null
	anchor: Coord | null
	extraCells: Set<string>
	activeRef: RefObject<Coord | null>
	anchorRef: RefObject<Coord | null>
	extraCellsRef: RefObject<Set<string>>
	setActive: (coord: Coord | null) => void
	setAnchor: (anchor: Coord | null) => void
	setExtraCells: (cells: Set<string>) => void
	moveActiveTo: (coord: Coord, extend?: boolean) => void
	moveActive: (dRow: number, dCol: number, extend?: boolean) => void
	moveActiveTab: (dir: 1 | -1) => boolean
	addCellToSelection: (coord: Coord) => void
}

export type EditableGridMutationsApi = {
	applyCellWrite: (rowIdx: number, editableColIdx: number, raw: string) => void
	applyBulkFill: (raw: string) => boolean
}

export type EditableGridDraftApi = {
	editing: boolean
	draft: string
	setDraft: Dispatch<SetStateAction<string>>
	beginEdit: (coord: Coord, initial?: string, original?: string) => void
	commitEdit: (advance: EditableGridCommitAdvance) => boolean
	cancelEdit: () => void
}
