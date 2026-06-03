'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
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
	EditableGridStateContext,
	type EditableGridStateValue,
} from './context'
import { EditableGridStyles } from './editable-grid-styles'
import type { CellChange, EditableGridColumn } from './types'
import { useEditableGridAugmentedColumns } from './use-editable-grid-augmented-columns'
import { useEditableGridDraft } from './use-editable-grid-draft'
import { useEditableGridMutations } from './use-editable-grid-mutations'
import { useEditableGridNavigation } from './use-editable-grid-navigation'
import { useEditableGridRows } from './use-editable-grid-rows'
import { useEditableGridSelection } from './use-editable-grid-selection'
import { useEditableGridWrapper } from './use-editable-grid-wrapper'

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

/** Spreadsheet-style grid over `DataTable` — adds inline cell editing, keyboard navigation, and batch-apply on multi-row selections. */
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
	})

	// Stable while editing — the cell shells subscribe here, so typing (which only
	// moves the edit slice below) doesn't re-render every cell.
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

	// Changes on every keystroke; read only by the mounted editor.
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
						tabIndex: 0,
						onKeyDown: onWrapperKeyDown,
						onPaste: onWrapperPaste,
						onFocus: onWrapperFocus,
						onBlur: onWrapperBlur,
					}}
				/>
			</EditableGridEditContext>
		</EditableGridStateContext>
	)
}
