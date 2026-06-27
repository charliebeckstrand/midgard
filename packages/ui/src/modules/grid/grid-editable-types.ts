import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import type { GridColumn } from './types'

/** Zero-based cell position within the grid, in display order. */
export type Coord = { row: number; col: number }

/** A single committed cell write: the parsed `value` for `columnId` on the row keyed by `rowKey`. */
export type CellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

/** Direction the cursor moves after a successful commit. */
export type GridEditableCommitAdvance = 'down' | 'right' | 'left' | 'none'

/** Horizontal text alignment for a column's cells and editor. @internal */
export type GridEditableAlign = 'left' | 'center' | 'right'

/**
 * Props passed to a column's editor slot when it mounts in the active cell.
 * The grid owns the draft buffer, commit guard, and cursor advance; the slot
 * decides how to render the editor surface.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditableEditorProps<T> = {
	row: T
	column: GridEditableColumn<T>
	draft: string
	setDraft: Dispatch<SetStateAction<string>>
	/**
	 * Commit the current draft and advance the cursor. Returns `false` when the
	 * advance would exit the grid (caller may let the browser handle Tab).
	 */
	commit: (advance: GridEditableCommitAdvance) => boolean
	cancel: () => void
	align: GridEditableAlign
	ariaLabel: string
	/**
	 * `true` when the edit was opened via Enter / F2 / Space / double-click (draft
	 * seeded from the cell's formatted value); `false` when it was opened by typing
	 * a printable character into the active cell.
	 */
	selectAllOnFocus: boolean
}

/**
 * Render function for a column's inline editor slot, invoked with
 * {@link GridEditableEditorProps} when its cell enters edit mode.
 *
 * @typeParam T - The row type the editor reads from and writes back to.
 */
export type GridEditableEditor<T = unknown> = (props: GridEditableEditorProps<T>) => ReactNode

/**
 * A `Grid` column augmented for inline editing: binds to a row `field`,
 * supplies `format`/`parse` for the display/edit round-trip, and selects the
 * `editor` slot. Drops the `Grid` cell-render and pinning hooks the grid
 * manages itself.
 *
 * @typeParam T - The row type the column reads from and writes back to.
 */
export type GridEditableColumn<T> = Omit<
	GridColumn<T>,
	'cell' | 'cellProps' | 'pinned' | 'hideable'
> & {
	/** Read/write field on the row. */
	field?: keyof T
	/**
	 * Format a cell value for display.
	 *
	 * @defaultValue `String(row[field] ?? '')`
	 */
	format?: (row: T) => string
	/**
	 * Parse the raw editor string into the committed value.
	 *
	 * @defaultValue identity (the raw string)
	 */
	parse?: (raw: string, row: T) => unknown
	/**
	 * Inline editor mounted when the cell enters edit mode. Built-in adapters are
	 * exported alongside the grid ({@link GridEditableCurrencyEditor},
	 * {@link GridEditableNumberEditor}); custom editors receive the same
	 * {@link GridEditableEditorProps} contract.
	 *
	 * @defaultValue {@link GridEditableTextEditor} (a plain text input)
	 */
	editor?: GridEditableEditor<T>
	/**
	 * Validates a committed cell value. Receives the parsed value (the same one
	 * {@link GridEditableColumn.parse} produces) and the row, and returns an error
	 * message to reject the edit — the editor stays open showing the message and
	 * no change is emitted — or `null` to accept it. Runs on interactive cell
	 * commits, not on bulk paste.
	 */
	validate?: (value: unknown, row: T) => string | null
	/** Cells in this column can't be edited. Nav still visits them. */
	readOnly?: boolean
	align?: GridEditableAlign
}

/**
 * Row/column projection shared across the grid's hooks: a live `rowsRef`, the
 * editable (cursor-visitable) columns, and the key/format/parse helpers.
 *
 * @typeParam T - The row type backing each grid row.
 * @internal
 */
export type GridEditableRowsApi<T> = {
	rowsRef: RefObject<T[]>
	editableCols: GridEditableColumn<T>[]
	getKey: (row: T, index: number) => string | number
	formatCell: (row: T, col: GridEditableColumn<T>) => string
	parseValue: (raw: string, row: T, col: GridEditableColumn<T>) => unknown
}

/**
 * Live view of the row selection, read by the mutation path to decide whether a
 * single-cell write fans out across a multi-row selection.
 *
 * @internal
 */
export type GridEditableSelectionApi = {
	selectionRef: RefObject<Set<string | number>>
}

/**
 * Cursor and range-selection state plus its move actions: reactive
 * `active`/`anchor`/`extraCells` for rendering, matching refs for event-time
 * reads, and the move/extend helpers. `moveActiveTab` returns `false` when the
 * move would exit the grid.
 *
 * @internal
 */
export type GridEditableNavigationApi = {
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

/**
 * Cell-write operations: `applyCellWrite` parses and writes one cell (fanning
 * out across a multi-row selection), `applyBulkFill` writes one raw value across
 * the active cell, the anchored rectangle, and ctrl-clicked extras.
 *
 * @internal
 */
export type GridEditableMutationsApi = {
	applyCellWrite: (rowIdx: number, editableColIdx: number, raw: string) => void
	applyBulkFill: (raw: string) => boolean
}

/**
 * In-progress edit session: the `draft` buffer with its setter and the
 * begin/commit/cancel actions. `commitEdit` returns `false` when the advance
 * would exit the grid.
 *
 * @internal
 */
export type GridEditableDraftApi = {
	editing: boolean
	draft: string
	/** Validation message for the open edit, or `null` when valid; a failed commit keeps the editor open and sets this. */
	error: string | null
	setDraft: Dispatch<SetStateAction<string>>
	beginEdit: (coord: Coord, initial?: string, original?: string) => void
	commitEdit: (advance: GridEditableCommitAdvance) => boolean
	cancelEdit: () => void
}
