'use client'

import { useMemo, useRef } from 'react'
import type { TableVariants } from '../../components/table'
import { cn } from '../../core'
import { useIdScope } from '../../hooks'
import { GridData } from './grid-data'
import type { GridSelection, GridSort, GridVirtualize } from './grid-data-types'
import {
	GridEditableEditContext,
	type GridEditableEditValue,
	type GridEditableSnapshot,
	GridEditableStoreContext,
} from './grid-editable-context'
import type { CellChange, GridEditableColumn } from './grid-editable-types'
import type { GridContextMenu as GridContextMenuConfig } from './types'
import { useGridEditableAugmentedColumns } from './use-grid-editable-augmented-columns'
import { useGridEditableDraft } from './use-grid-editable-draft'
import { useGridEditableHistory } from './use-grid-editable-history'
import { useGridEditableMutations } from './use-grid-editable-mutations'
import { useGridEditableNavigation } from './use-grid-editable-navigation'
import { useGridEditableRows } from './use-grid-editable-rows'
import { useGridEditableSelection } from './use-grid-editable-selection'
import { useGridEditableStore } from './use-grid-editable-store'
import { useGridEditableWrapper } from './use-grid-editable-wrapper'

// Cell-change flash keyframe, mounted once below. Hoisted and deduplicated by
// React 19 via `precedence`.
const CELL_FLASH_KEYFRAMES = '@keyframes grid-editable-cell-flash{from{opacity:1}to{opacity:0}}'

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
	 * Right-click context menus, forwarded to the underlying {@link Grid}: a
	 * `column` menu on headers and a `cell` menu on body cells (Copy). On by
	 * default — pass `false` to disable, or a config/builder per side to reshape
	 * the items. The header menu omits the sort items unless a column opts in with
	 * {@link GridColumn.sortable}, since editing keeps sorting opt-in. A right-click
	 * on a body cell also seats the active cell (via the cell's own mouse handler),
	 * so the menu acts on the clicked cell; a non-primary click on a header (a
	 * right-click for the menu, or a middle-click) opens no cursor — only a primary
	 * click seats it — leaving keyboard navigation unstarted.
	 *
	 * @see {@link GridContextMenu}
	 * @defaultValue `{ column: true, cell: true }`
	 */
	contextMenu?: GridContextMenuConfig<T> | false

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
 * per-cell editing (text by default, or a column's `editor` slot — select, date,
 * and boolean editors ship alongside text/number/currency), arrow/Tab keyboard
 * navigation with range selection, paste, and batch-apply that writes one column
 * value across every row in a multi-row selection. A column's `validate` rejects
 * a bad commit (the editor stays open with the message); Ctrl/Cmd+Z and
 * Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y) undo and redo. Each commit emits a
 * {@link CellChange} batch through `onValueChange`; sort, selection, context
 * menus (on by default — Copy on cells, column tools on headers), and
 * virtualization forward to the underlying table.
 *
 * @remarks
 * Client component. The `<table>` carries `role="grid"` with
 * `aria-activedescendant` tracking the active cell; `virtualize` requires
 * `maxHeight`.
 *
 * @typeParam T - Shape of a single row.
 *
 * @internal
 */
export function GridEditable<T>({
	columns,
	rows,
	getKey,
	sort: sortConfig,
	selection: selectionConfig,
	contextMenu,
	onValueChange,
	stickyHeader,
	maxHeight,
	rowClassName,
	virtualize,
	density,
	bleed,
	outline,
	striped,
	hover,
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

	// Undo/redo wraps the commit sink: every write flows through `history.emit`,
	// which records the inverse before forwarding to `onValueChange`.
	const history = useGridEditableHistory<T>({
		rowsRef: rowsApi.rowsRef,
		editableCols: rowsApi.editableCols,
		getKey,
		onValueChange,
	})

	const mutations = useGridEditableMutations<T>({
		nav,
		rows: rowsApi,
		selection: selectionApi,
		onValueChange: history.emit,
	})

	const draft = useGridEditableDraft<T>({ nav, mutations, rows: rowsApi, wrapperRef })

	const { onWrapperKeyDown, onWrapperPaste, onWrapperFocus, onWrapperBlur, onWrapperMouseDown } =
		useGridEditableWrapper<T>({
			nav,
			mutations,
			draft,
			rows: rowsApi,
			wrapperRef,
			onValueChange: history.emit,
			undo: history.undo,
			redo: history.redo,
		})

	const augmentedColumns = useGridEditableAugmentedColumns<T>({
		columns,
		rowIndexMap,
		nav,
		draft,
		formatCell: rowsApi.formatCell,
		cellId: cells.sub,
	})

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
			error: draft.error,
			setDraft: draft.setDraft,
			commitEdit: draft.commitEdit,
			cancelEdit: draft.cancelEdit,
		}),
		[draft.draft, draft.error, draft.setDraft, draft.commitEdit, draft.cancelEdit],
	)

	return (
		<GridEditableStoreContext value={store}>
			<GridEditableEditContext value={editValue}>
				<style href="grid-editable-cell-flash" precedence="default">
					{CELL_FLASH_KEYFRAMES}
				</style>
				<GridData
					columns={augmentedColumns}
					rows={rows}
					getKey={getKey}
					sort={sortConfig}
					// Editing keeps sorting opt-in: a column sorts only when it sets
					// `sortable`, not from the read-only grid's sortable-by-default.
					sortable={false}
					// Context menus default on, forwarded from `contextMenu`. A
					// right-click on a body cell seats the active cell through the cell's
					// own mouse handler, then the menu opens on it; a header right-click
					// opens its menu without seating the cursor; `false` opts out.
					contextMenu={contextMenu}
					// Cells host editors that must not be clipped; the editable grid
					// manages its own overflow, so read-only truncation stays off.
					truncate={false}
					selection={{ ...selectionConfig, value: selection, onValueChange: setSelection }}
					rowClassName={rowClassName}
					stickyHeader={stickyHeader}
					maxHeight={maxHeight}
					virtualize={virtualize}
					density={density}
					bleed={bleed}
					outline={outline}
					striped={striped}
					hover={hover}
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
						// A non-primary header click (right-click for the menu, or middle-
						// click) must not seat the cursor; this suppresses the focus that
						// would otherwise start keyboard navigation.
						onMouseDown: onWrapperMouseDown,
					}}
				/>
			</GridEditableEditContext>
		</GridEditableStoreContext>
	)
}
