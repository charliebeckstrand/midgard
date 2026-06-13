'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks'
import {
	DataTable,
	type DataTableSelection,
	type DataTableSort,
	type DataTableVirtualize,
} from '../data-table'
import type { TableVariants } from '../table'
import {
	EditableGridEditContext,
	type EditableGridEditValue,
	type EditableGridSnapshot,
	EditableGridStateContext,
	type EditableGridStateValue,
	EditableGridStoreContext,
} from './context'
import { EditableGridStyles } from './editable-grid-styles'
import type { CellChange, EditableGridColumn } from './types'
import { useEditableGridAugmentedColumns } from './use-editable-grid-augmented-columns'
import { useEditableGridDraft } from './use-editable-grid-draft'
import { useEditableGridMutations } from './use-editable-grid-mutations'
import { useEditableGridNavigation } from './use-editable-grid-navigation'
import { useEditableGridRows } from './use-editable-grid-rows'
import { useEditableGridSelection } from './use-editable-grid-selection'
import { useEditableGridStore } from './use-editable-grid-store'
import { useEditableGridWrapper } from './use-editable-grid-wrapper'

/**
 * Props for {@link EditableGrid}: the `columns`/`rows`/`getKey` data binding,
 * the `onValueChange` commit sink, optional `sort`/`selection`/`virtualize`
 * wiring forwarded to `DataTable`, and the `TableVariants` styling surface.
 *
 * @typeParam T - The row type backing each table row and cell edit.
 */
export type EditableGridProps<T> = TableVariants & {
	columns: EditableGridColumn<T>[]
	rows: T[]
	getKey: (row: T, index: number) => string | number

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

/**
 * Spreadsheet-style editable grid layered over {@link DataTable}. Adds inline
 * per-cell editing (text by default, or a column's `editor` slot), arrow/Tab
 * keyboard navigation with range selection, paste, and batch-apply that writes
 * one column value across every row in a multi-row selection. Each commit emits
 * a {@link CellChange} batch through `onValueChange`; sort, selection, and
 * virtualization forward to the underlying table. Exposes its cursor and edit
 * state via {@link useEditableGrid}.
 *
 * @remarks
 * Client component. The `<table>` carries `role="grid"` with
 * `aria-activedescendant` tracking the active cell; `virtualize` requires
 * `maxHeight`.
 *
 * @typeParam T - Shape of a single row.
 */
export function EditableGrid<T>({
	columns,
	rows,
	getKey,
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
	const { selection, setSelection, selectionApi } = useEditableGridSelection(selectionConfig)

	const { rowsApi, rowIndexMap } = useEditableGridRows<T>({ rows, columns, getKey })

	const wrapperRef = useRef<HTMLTableElement>(null)

	// Stable per-cell id scope: `aria-activedescendant` on the grid resolves to
	// the active cell's id without touching the memoized cell shells.
	const cells = useIdScope()

	const nav = useEditableGridNavigation<T>({
		rowsRef: rowsApi.rowsRef,
		editableColCount: rowsApi.editableCols.length,
	})

	const mutations = useEditableGridMutations<T>({
		nav,
		rows: rowsApi,
		selection: selectionApi,
		onValueChange,
	})

	const draft = useEditableGridDraft<T>({ nav, mutations, rows: rowsApi, wrapperRef })

	const { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur } =
		useEditableGridWrapper<T>({
			nav,
			mutations,
			draft,
			rows: rowsApi,
			wrapperRef,
			onValueChange,
		})

	const augmentedColumns = useEditableGridAugmentedColumns<T>({
		columns,
		rowIndexMap,
		nav,
		draft,
		formatCell: rowsApi.formatCell,
		cellId: cells.sub,
	})

	// Stable while editing; the cell shells subscribe here. Typing only moves the
	// edit slice below, leaving cell shells untouched.
	const stateValue = useMemo<EditableGridStateValue>(
		() => ({
			active: nav.active,
			anchor: nav.anchor,
			extraCells: nav.extraCells,
			editing: draft.editing,
			setActive: nav.moveActiveTo,
			addCellToSelection: nav.addCellToSelection,
			beginEdit: draft.beginEdit,
		}),
		[
			nav.active,
			nav.anchor,
			nav.extraCells,
			draft.editing,
			nav.moveActiveTo,
			nav.addCellToSelection,
			draft.beginEdit,
		],
	)

	// Mirrored into the store below; each cell subscribes to its own derived
	// slice. Only cells whose slice changed re-render on navigation.
	const cellSnapshot = useMemo<EditableGridSnapshot>(
		() => ({
			active: nav.active,
			anchor: nav.anchor,
			extraCells: nav.extraCells,
			editing: draft.editing,
		}),
		[nav.active, nav.anchor, nav.extraCells, draft.editing],
	)

	const store = useEditableGridStore(cellSnapshot)

	// Updated on every keystroke; consumed only by the mounted editor.
	const editValue = useMemo<EditableGridEditValue>(
		() => ({
			draft: draft.draft,
			setDraft: draft.setDraft,
			commitEdit: draft.commitEdit,
			cancelEdit: draft.cancelEdit,
		}),
		[draft.draft, draft.setDraft, draft.commitEdit, draft.cancelEdit],
	)

	return (
		<EditableGridStateContext value={stateValue}>
			<EditableGridStoreContext value={store}>
				<EditableGridEditContext value={editValue}>
					<EditableGridStyles />
					<DataTable
						columns={augmentedColumns}
						rows={rows}
						getKey={getKey}
						sort={sortConfig}
						selection={{ ...selectionConfig, value: selection, onValueChange: setSelection }}
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
							'aria-multiselectable': true,
							'aria-activedescendant': nav.active
								? cells.sub(`cell-${nav.active.row}-${nav.active.col}`)
								: undefined,
							tabIndex: 0,
							onKeyDown: onWrapperKeyDown,
							onPaste: onWrapperPaste,
							onFocus: onWrapperFocus,
							onBlur: onWrapperBlur,
						}}
					/>
				</EditableGridEditContext>
			</EditableGridStoreContext>
		</EditableGridStateContext>
	)
}
