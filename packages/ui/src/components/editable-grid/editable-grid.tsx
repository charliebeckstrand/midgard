'use client'

import { useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import {
	DataTable,
	type DataTableSelection,
	type DataTableSort,
	type DataTableVirtualize,
} from '../data-table'
import type { TableVariants } from '../table'
import { type EditableGridContextValue, EditableGridProvider } from './context'
import type { CellChange, EditableGridColumn } from './types'
import { useEditableGridAugmentedColumns } from './use-editable-grid-augmented-columns'
import { useEditableGridDraft } from './use-editable-grid-draft'
import { useEditableGridMutations } from './use-editable-grid-mutations'
import { useEditableGridNavigation } from './use-editable-grid-navigation'
import { useEditableGridWrapper } from './use-editable-grid-wrapper'

// Stable empty-selection sentinel: a fresh Set per render breaks referential
// equality for `selectionRef` and any downstream memo/effect that reads it.
// Treated as read-only — all updates go through `setSelectionRaw(new Set(...))`.
const EMPTY_SELECTION = new Set<string | number>()

export type EditableGridProps<T> = TableVariants & {
	columns: EditableGridColumn<T>[]
	rows: T[]
	getRowKey: (row: T, index: number) => string | number

	sort?: DataTableSort
	selection?: DataTableSelection

	/**
	 * Called with one or more changes. When committing a cell inside a row that
	 * belongs to a multi-row selection, the same column value is applied to
	 * every selected row and emitted as a batch.
	 */
	onValueChange: (changes: CellChange[]) => void

	stickyHeader?: boolean
	maxHeight?: string
	rowClassName?: (row: T) => string | undefined

	/**
	 * Enables row virtualization via DataTable. Only rows in the scroll viewport
	 * (plus overscan) render to the DOM. Requires `maxHeight`.
	 *
	 * Pass `true` for defaults, or an object to tune. See DataTable for details.
	 *
	 * Without virtualization every row in `rows` renders to the DOM; recommended
	 * past ~500 rows.
	 */
	virtualize?: DataTableVirtualize

	className?: string
	children?: never
}

/** Spreadsheet-style grid over `DataTable` — adds inline cell editing, keyboard navigation, and batch-apply on multi-row selections. */
export function EditableGrid<T>({
	columns,
	rows,
	getRowKey,
	sort: sortConfig,
	selection: selectionConfig,
	onValueChange,
	stickyHeader,
	maxHeight,
	rowClassName,
	virtualize,
	density,
	bleed,
	grid,
	striped,
	className,
}: EditableGridProps<T>) {
	const [selectionRaw, setSelectionRaw] = useControllable<Set<string | number>>({
		value: selectionConfig?.value,
		defaultValue: selectionConfig?.defaultValue ?? new Set(),
		onChange: selectionConfig?.onValueChange,
	})

	const selection = selectionRaw ?? EMPTY_SELECTION

	// Stable refs so callbacks don't rebuild every render.
	const rowsRef = useRef(rows)

	rowsRef.current = rows

	const selectionRef = useRef(selection)

	selectionRef.current = selection

	const wrapperRef = useRef<HTMLTableElement>(null)

	// Editable column indices (exclude selectable / actions) — these are the
	// columns the active-cell cursor can land on.
	const editableCols = useMemo(() => columns.filter((c) => !c.selectable && !c.actions), [columns])

	const rowIndexMap = useMemo(() => {
		const m = new Map<T, number>()

		rows.forEach((r, i) => {
			m.set(r, i)
		})

		return m
	}, [rows])

	const formatCell = useCallback((row: T, col: EditableGridColumn<T>) => {
		if (col.format) return col.format(row)

		if (!col.field) return ''

		const v = row[col.field]

		return v == null ? '' : String(v)
	}, [])

	const parseValue = useCallback((raw: string, row: T, col: EditableGridColumn<T>): unknown => {
		if (col.parse) return col.parse(raw, row)

		return raw
	}, [])

	const {
		active,
		anchor,
		extraCells,
		activeRef,
		anchorRef,
		extraCellsRef,
		setActive,
		setAnchor,
		setExtraCells,
		moveActiveTo,
		moveActive,
		moveActiveTab,
		addCellToSelection,
	} = useEditableGridNavigation<T>({ rowsRef, editableColCount: editableCols.length })

	const { applyCellWrite, applyBulkFill } = useEditableGridMutations<T>({
		editableCols,
		rowsRef,
		selectionRef,
		activeRef,
		anchorRef,
		extraCellsRef,
		getRowKey,
		parseValue,
		onValueChange,
		setSelection: setSelectionRaw,
	})

	const { editing, draft, setDraft, beginEdit, commitEdit, cancelEdit } = useEditableGridDraft<T>({
		editableCols,
		active,
		anchorRef,
		extraCellsRef,
		wrapperRef,
		applyCellWrite,
		applyBulkFill,
		moveActive,
		moveActiveTab,
		setActive,
	})

	const hasMultiSelection = !!anchor || extraCells.size > 0

	const { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur } =
		useEditableGridWrapper<T>({
			editing,
			active,
			anchor,
			extraCells,
			hasMultiSelection,
			editableCols,
			wrapperRef,
			rowsRef,
			activeRef,
			selectionRef,
			moveActive,
			moveActiveTo,
			moveActiveTab,
			setActive,
			setAnchor,
			setExtraCells,
			beginEdit,
			formatCell,
			parseValue,
			getRowKey,
			applyCellWrite,
			applyBulkFill,
			onValueChange,
			setSelection: setSelectionRaw,
		})

	const augmentedColumns = useEditableGridAugmentedColumns<T>({
		columns,
		rowIndexMap,
		formatCell,
		active,
		editing,
		addCellToSelection,
		moveActiveTo,
		beginEdit,
	})

	const context = useMemo<EditableGridContextValue>(
		() => ({
			active,
			anchor,
			extraCells,
			editing,
			draft,
			setDraft,
			setActive: moveActiveTo,
			addCellToSelection,
			beginEdit,
			commitEdit,
			cancelEdit,
		}),
		[
			active,
			anchor,
			extraCells,
			editing,
			draft,
			setDraft,
			moveActiveTo,
			addCellToSelection,
			beginEdit,
			commitEdit,
			cancelEdit,
		],
	)

	return (
		<EditableGridProvider value={context}>
			<DataTable
				columns={augmentedColumns}
				rows={rows}
				getRowKey={getRowKey}
				sort={sortConfig}
				selection={{ ...selectionConfig, value: selection, onValueChange: setSelectionRaw }}
				rowClassName={rowClassName}
				stickyHeader={stickyHeader}
				maxHeight={maxHeight}
				virtualize={virtualize}
				density={density}
				bleed={bleed}
				grid={grid}
				striped={striped}
				className={cn('outline-0', className)}
				tableProps={{
					ref: wrapperRef,
					'data-slot': 'editable-grid',
					role: 'grid',
					tabIndex: 0,
					onKeyDown: onWrapperKeyDown,
					onPaste: onWrapperPaste,
					onFocus: onWrapperFocus,
					onBlur: onWrapperBlur,
				}}
			/>
		</EditableGridProvider>
	)
}
