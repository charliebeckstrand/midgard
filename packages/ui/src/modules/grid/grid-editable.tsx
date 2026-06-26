'use client'

import { useMemo, useRef } from 'react'
import type { TableVariants } from '../../components/table'
import { cn } from '../../core'
import { useIdScope } from '../../hooks'
import { Grid, type GridSelection, type GridSort, type GridVirtualize } from './grid'
import {
	GridEditableEditContext,
	type GridEditableEditValue,
	type GridEditableSnapshot,
	GridEditableStateContext,
	type GridEditableStateValue,
	GridEditableStoreContext,
} from './grid-editable-context'
import { GridEditableStyles } from './grid-editable-styles'
import type { CellChange, GridEditableColumn } from './grid-editable-types'
import { useGridEditableAugmentedColumns } from './use-grid-editable-augmented-columns'
import { useGridEditableDraft } from './use-grid-editable-draft'
import { useGridEditableMutations } from './use-grid-editable-mutations'
import { useGridEditableNavigation } from './use-grid-editable-navigation'
import { useGridEditableRows } from './use-grid-editable-rows'
import { useGridEditableSelection } from './use-grid-editable-selection'
import { useGridEditableStore } from './use-grid-editable-store'
import { useGridEditableWrapper } from './use-grid-editable-wrapper'

/**
 * Props for {@link GridEditable}: the `columns`/`rows`/`getKey` data binding,
 * the `onValueChange` commit sink, optional `sort`/`selection`/`virtualize`
 * wiring forwarded to `Grid`, and the `TableVariants` styling surface.
 *
 * @typeParam T - The row type backing each table row and cell edit.
 */
export type GridEditableProps<T> = TableVariants & {
	columns: GridEditableColumn<T>[]
	rows: T[]
	getKey: (row: T, index: number) => string | number

	sort?: GridSort
	selection?: GridSelection

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
	 * Enables row virtualization via Grid. Only rows in the scroll viewport
	 * (plus overscan) render to the DOM. Requires `maxHeight`.
	 *
	 * Pass `true` for defaults, or an object to tune. See Grid for details.
	 *
	 * Without virtualization every row in `rows` renders to the DOM; recommended
	 * past ~500 rows.
	 */
	virtualize?: GridVirtualize

	className?: string
	children?: never
}

/**
 * Spreadsheet-style editable grid layered over {@link Grid}. Adds inline
 * per-cell editing (text by default, or a column's `editor` slot), arrow/Tab
 * keyboard navigation with range selection, paste, and batch-apply that writes
 * one column value across every row in a multi-row selection. Each commit emits
 * a {@link CellChange} batch through `onValueChange`; sort, selection, and
 * virtualization forward to the underlying table. Exposes its cursor and edit
 * state via {@link useGridEditable}.
 *
 * @remarks
 * Client component. The `<table>` carries `role="grid"` with
 * `aria-activedescendant` tracking the active cell; `virtualize` requires
 * `maxHeight`.
 *
 * @typeParam T - Shape of a single row.
 */
export function GridEditable<T>({
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
	outline,
	striped,
	className,
}: GridEditableProps<T>) {
	const { selection, setSelection, selectionApi } = useGridEditableSelection(selectionConfig)

	const { rowsApi, rowIndexMap } = useGridEditableRows<T>({ rows, columns, getKey })

	const wrapperRef = useRef<HTMLTableElement>(null)

	// Stable per-cell id scope: `aria-activedescendant` on the grid resolves to
	// the active cell's id without touching the memoized cell shells.
	const cells = useIdScope()

	const nav = useGridEditableNavigation<T>({
		rowsRef: rowsApi.rowsRef,
		editableColCount: rowsApi.editableCols.length,
	})

	const mutations = useGridEditableMutations<T>({
		nav,
		rows: rowsApi,
		selection: selectionApi,
		onValueChange,
	})

	const draft = useGridEditableDraft<T>({ nav, mutations, rows: rowsApi, wrapperRef })

	const { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur } =
		useGridEditableWrapper<T>({
			nav,
			mutations,
			draft,
			rows: rowsApi,
			wrapperRef,
			onValueChange,
		})

	const augmentedColumns = useGridEditableAugmentedColumns<T>({
		columns,
		rowIndexMap,
		nav,
		draft,
		formatCell: rowsApi.formatCell,
		cellId: cells.sub,
	})

	// Stable while editing; the cell shells subscribe here. Typing only moves the
	// edit slice below, leaving cell shells untouched.
	const stateValue = useMemo<GridEditableStateValue>(
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
	const cellSnapshot = useMemo<GridEditableSnapshot>(
		() => ({
			active: nav.active,
			anchor: nav.anchor,
			extraCells: nav.extraCells,
			editing: draft.editing,
		}),
		[nav.active, nav.anchor, nav.extraCells, draft.editing],
	)

	const store = useGridEditableStore(cellSnapshot)

	// Updated on every keystroke; consumed only by the mounted editor.
	const editValue = useMemo<GridEditableEditValue>(
		() => ({
			draft: draft.draft,
			setDraft: draft.setDraft,
			commitEdit: draft.commitEdit,
			cancelEdit: draft.cancelEdit,
		}),
		[draft.draft, draft.setDraft, draft.commitEdit, draft.cancelEdit],
	)

	return (
		<GridEditableStateContext value={stateValue}>
			<GridEditableStoreContext value={store}>
				<GridEditableEditContext value={editValue}>
					<GridEditableStyles />
					<Grid
						columns={augmentedColumns}
						rows={rows}
						getKey={getKey}
						sort={sortConfig}
						// Editing keeps sorting opt-in: a column sorts only when it sets
						// `sortable`, not from the read-only grid's sortable-by-default.
						sortable={false}
						selection={{ ...selectionConfig, value: selection, onValueChange: setSelection }}
						rowClassName={rowClassName}
						stickyHeader={stickyHeader}
						maxHeight={maxHeight}
						virtualize={virtualize}
						density={density}
						bleed={bleed}
						outline={outline}
						striped={striped}
						className={cn('outline-0', className)}
						tableProps={{
							ref: wrapperRef,
							'data-slot': 'grid-editable',
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
				</GridEditableEditContext>
			</GridEditableStoreContext>
		</GridEditableStateContext>
	)
}
