import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'

export type Coord = { row: number; col: number }

export type CellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

export type EditableGridColumn<T> = {
	id: string | number
	title?: ReactNode
	/** Read/write field on the row. */
	field?: keyof T
	/** Format a cell value for display. Defaults to `String(row[field] ?? '')`. */
	format?: (row: T) => string
	/** Parse the raw editor string. Defaults to the raw string. */
	parse?: (raw: string, row: T) => unknown
	/** Cells in this column can't be edited. Nav still visits them. */
	readOnly?: boolean
	align?: 'left' | 'center' | 'right'
	sortable?: boolean
	selectable?: boolean
	actions?: (row: T) => ReactNode
	width?: string
	className?: string
	headerClassName?: string
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
	setSelection: (selection: Set<string | number>) => void
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
	commitEdit: (advance: 'down' | 'right' | 'left' | 'none') => boolean
	cancelEdit: () => void
}
