import type { HTMLAttributes, ReactNode } from 'react'

/**
 * One column of a {@link Grid}: its id, header `title`, optional cell
 * renderer, and per-column flags for sorting, selection, actions, and
 * column-manager behavior.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridColumn<T> = {
	id: string | number
	title?: ReactNode
	sortable?: boolean
	/** Marks this as the selection column; renders the row-select checkboxes instead of a cell value. */
	selectable?: boolean
	/** Renders per-row action controls (e.g. a menu) in this column's cell. */
	actions?: (row: T) => ReactNode
	/** Renders the cell content for a row; defaults to nothing when omitted. */
	cell?: (row: T) => ReactNode
	/**
	 * Per-row props spread onto the underlying `<td>`. Use to wire ARIA, data
	 * attributes, or handlers (e.g. `role="gridcell"` + `onMouseDown` for a
	 * composite-widget wrapper like GridEditable). Returned `className` is
	 * merged with the column's static `className`.
	 */
	cellProps?: (row: T) => Omit<HTMLAttributes<HTMLTableCellElement>, 'children'>
	className?: string
	headerClassName?: string
	width?: string
	/** Shown in the column manager but cannot be reordered or hidden. */
	pinned?: boolean
	/**
	 * When false, the column cannot be hidden from the column manager.
	 * @defaultValue true
	 */
	hideable?: boolean
}

/** A column as the {@link GridColumnManager} sees it: id, display `title`, and the pin/hideable flags. */
export type GridColumnManagerItem = {
	id: string | number
	title: ReactNode
	/** Pinned columns cannot be reordered or hidden. */
	pinned?: boolean
	/**
	 * When false, the column cannot be hidden.
	 * @defaultValue true
	 */
	hideable?: boolean
}

/** Snapshot of column-manager state — column `order` and `hidden` ids — captured by the save-preset action. */
export type GridColumnManagerPreset = {
	order: (string | number)[]
	hidden: (string | number)[]
}
