'use client'

import { useSyncExternalStore } from 'react'
import { createContext } from '../../core'
import type {
	EditorKind,
	GridActiveEdit,
	GridDraft,
	GridDraftKey,
} from './engine/grid-editing-utilities'
import type { GridGroupByContextValue } from './engine/grid-group/resolve'
import type { GridSettleStore } from './engine/grid-sizing/settle'
import type { GridSortState } from './engine/grid-sort/state'
import type { PinColumn } from './grid-context-menu-utilities'
import type { GridCursorRow } from './grid-cursor-order'
import type { GridReorderKit } from './grid-reorder-region'
import type { GridFillHandle } from './use-grid-fill-handle'

export type { GridSortState }

/** Table-wide state shared with the head: the select-all flags and toggle, sort, pinning, and the sticky-header flag. */
export type GridContextValue = {
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
	/** The active sort columns in priority order; empty when unsorted. */
	sort: GridSortState[]
	/**
	 * Cycles a column's sort. The `additive` (a Shift-click) folds the column into
	 * the existing sort, and leaves the others in place. It appends the column,
	 * flips its direction, then drops it. Otherwise the sort collapses to this
	 * column alone and cycles per `GridSort.cycle`. The default cycle is ascending
	 * → descending → unsorted.
	 */
	toggleSort: (column: string | number, additive: boolean) => void
	/**
	 * Pins a column to an edge, or unpins it with `false`. Backs the header's pin
	 * button (which unpins) and shares the mutation with the column context menu.
	 */
	pinColumn: PinColumn
	stickyHeader: boolean
}

/**
 * Reads the enclosing {@link Grid}'s shared selection and sort state.
 *
 * @returns The current {@link GridContextValue}.
 * @throws If called outside a `<Grid>`.
 */
export const [GridContext, useGrid] = createContext<GridContextValue>('Grid')

/**
 * Reads the store of settled column widths (see {@link GridSettleStore}). A
 * visited body cell subscribes to its own column in it, and measures its
 * overflow again when that width settles.
 *
 * @remarks A store and not a value, so a resize does not render the rows. The
 * store keeps one identity for the life of the grid.
 */
export const [GridSettleContext, useGridSettle] = createContext<GridSettleStore>('GridSettle')

/**
 * Reads whether a column drag-resize is in flight. The grid's truncation
 * surfaces (head titles and body cells) read it to suppress their tooltips for
 * the duration. A resize reflows the columns, and the overflow tooltip would
 * otherwise flash open over the content the drag is reshaping.
 *
 * @remarks It subscribes to the drag state of the {@link GridSettleStore}, not
 * to the table-wide {@link GridContextValue}. Only a surface that calls it
 * renders again when a drag starts or ends. A body cell calls it only while it
 * shows a reveal.
 */
export function useGridResizing(): boolean {
	const settle = useGridSettle()

	return useSyncExternalStore(settle.subscribeResizing, settle.resizing, settle.resizing)
}

/**
 * The active quick-search query when the grid searches in highlight mode
 * ({@link GridSearch.mode} `'highlight'`). It is `null` when the grid filters, has no
 * query, or has no search at all. Data cells read it to mark the matched
 * substring in the columns the search scans. A query change re-renders only the
 * cells that subscribe, so the default (filtering, or unsearched) grid pays nothing.
 *
 * @remarks A dedicated context, like {@link GridSettleContext}, so the marking
 * subscribes to the query alone rather than the table-wide {@link GridContextValue}.
 */
export const [GridHighlightContext, useGridHighlight] = createContext<string | null>(
	'GridHighlight',
)

/**
 * The truncating content of the editor's cell (see `GridCellContent`).
 * `markEditing` reports an open editor: the editor calls it with `true` as it
 * mounts and with `false` as it unmounts. While an editor is open, the cell
 * keeps its element tree, so the reveal does not reparent the focused editor.
 * `editing` tells the editor when the cell has stopped clipping its content.
 * It is `null` outside a truncating cell.
 *
 * @internal
 */
export const [GridCellEditingContext, useGridCellEditing] = createContext<{
	/** Whether the cell lets its content overflow (`k.cell.editing`). */
	editing: boolean
	markEditing: (editing: boolean) => void
} | null>('GridCellEditing', { default: null })

/**
 * External-store interface over the read-only cursor, built in
 * {@link useGridNavigation}: each cell subscribes to whether it is the active
 * cell without re-rendering on every cursor move.
 *
 * @internal
 */
export type GridNavStore = {
	/** Whether the cursor runs, so the rows of the grid carry its cell ids and seats. */
	enabled: boolean
	subscribe: (listener: () => void) => () => void
	/** Whether the cell at `(row, col)` is currently the active cursor cell. */
	isActive: (row: number, col: number) => boolean
	/** Whether the cell at `(row, col)` is in the cell range (see {@link GridDataProps.range}). */
	isInRange: (row: number, col: number) => boolean
	/** The fill handle that the active cell holds, or `null` when the grid shows no handle. */
	fillHandle: GridFillHandle | null
	/** Whether the cursor sits on the one-stop row with this item key. */
	isStopActive: (key: string) => boolean
	/** The element id of the one cell of a one-stop row, matched by `aria-activedescendant`. */
	stopId: (key: string) => string
	/** Seats the cursor on the one-stop row with this item key, as a click on it does. */
	seatStop: (key: string) => void
	/**
	 * Whether the active cell has a change of the cursor to scroll into view.
	 * The first call after each change returns `true`, and each later call
	 * `false`. A row that a scroll brings back into a window mounts its active
	 * cell again, and that cell does not move the scroll a second time.
	 */
	claimReveal: () => boolean
	/**
	 * Hands the cursor the order of a body that renders more than data rows, or
	 * `null` for a body of data rows only. A body calls it from a layout effect
	 * each time its order changes (see {@link GridCursorRow}).
	 */
	publish: (order: readonly GridCursorRow[] | null) => void
}

/**
 * Provides the read-only cursor store to the cell markers under a `navigable`
 * grid. @internal
 */
export const [GridNavContext, useGridNavContext] = createContext<GridNavStore>('GridNav')

/**
 * An external store over the rows in edit mode, and the one cell a cell-scoped
 * session edits. Each data cell subscribes to its own flag through
 * `useSyncExternalStore`, the way `GridNavCell` reads the cursor. A session
 * move therefore re-renders the cell it leaves and the cell it enters, not the
 * whole mounted window. A row that opens or closes re-renders only the cells of
 * that row. The store also notifies when a draft changes status, as a commit
 * goes pending or settles. Each cell then reads its own status again.
 *
 * @internal
 */
export type GridActiveEditStore = {
	subscribe: (listener: () => void) => () => void
	/** Row keys currently in edit mode; a cell whose row key is here renders its editor. */
	rows: () => ReadonlySet<string | number>
	/**
	 * The one cell a cell-scoped session edits (`scope: 'cell'`), narrowing the
	 * row's editors to it. `null` under the default row scope, where every
	 * editable cell of a set row mounts its editor.
	 */
	get: () => GridActiveEdit | null
	/**
	 * The row whose overlay has finished opening on a phone
	 * ({@link GridEditableConfig.overlay}), or `null` while no overlay is up.
	 * The row actions read it, so the control of a row changes when its
	 * overlay is up, not when its session starts.
	 */
	shown: () => string | number | null
	/**
	 * The row that edits in the form ({@link GridRowActionsContext.expand}),
	 * or `null` when no row does. The data cells of that row show their
	 * content, and no editor mounts in the table.
	 */
	expanded: () => string | number | null
}

/**
 * The settle controls beside an open editor. `'both'` is the save and discard
 * pair, `'discard'` is the discard control alone, and `'none'` shows no
 * control. @internal
 */
export type GridSettleControls = 'none' | 'discard' | 'both'

/**
 * The editing session shared with the data cells. A row in the set of
 * {@link GridActiveEditStore.rows} puts every editable cell of that row into
 * edit mode at once. A cell-scoped session (`scope: 'cell'`) narrows that to
 * the cell in `activeEditStore`. The row still enters the set, but only the
 * named cell mounts an editor. Each editor
 * stages its pending value through `stageDraft`, held in the grid rather than
 * re-rendering it. The staged values belong to the session, not to the
 * editors, and commit when the session closes their cell. An editor that
 * unmounts while its cell is open keeps its draft, and shows it when it mounts
 * again. The set and the cell ride a store, so a session transition leaves
 * this context unchanged.
 *
 * @internal
 */
export type GridEditingSession = {
	/** The rows in edit mode and the cell a cell-scoped session edits, as a store each data cell subscribes to. */
	activeEditStore: GridActiveEditStore
	/**
	 * Stage a cell's pending value, against the row object the editor shows.
	 * The session holds it until it closes the cell and the value commits. The
	 * first write keeps `row` as the snapshot that a commit reads when the row
	 * is no longer in `rows`. A write to a closed cell is ignored.
	 */
	stageDraft: (
		rowKey: GridDraftKey,
		columnId: string | number,
		value: unknown,
		row: unknown,
	) => void
	/** Drop a cell's pending value: Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: GridDraftKey, columnId: string | number) => void
	/**
	 * The cell's staged draft, or `undefined` when it has none. An editor reads
	 * it once, as it mounts, so an editor that mounts again shows the value
	 * that will commit.
	 */
	readDraft: (rowKey: GridDraftKey, columnId: string | number) => GridDraft | undefined
	/**
	 * Ends the grid-owned session on a row under `session: 'managed'`:
	 * `'save'` on an editor's Enter, `'discard'` on Escape. A discard drops the
	 * staged values the session owns. Under cell scope that is the active cell
	 * alone, because the cells it visited before that one already committed.
	 * A save is removing the row from the set, which is also the consumer's own
	 * save. A discard has no consumer-driven equivalent, and is what
	 * {@link GridRowActionsContext.discard} hands them.
	 */
	endSession: (rowKey: string | number, outcome: 'save' | 'discard') => void
	/**
	 * Opens a row from a control in it, such as a pencil, and puts focus in its
	 * first editor. Focus returns to the control as the session on the row
	 * ends. It is what {@link GridRowActionsContext.edit} hands the consumer.
	 */
	editRow: (rowKey: string | number) => void
	/**
	 * Opens a row in the form: one field for each editable column, with Cancel
	 * and Save. Focus goes into the field of `columnId`. With no `columnId`, it
	 * goes into the field of the cell that the session holds on the row, else
	 * of the cursor cell on the row, else of the first editable column. It is what {@link GridRowActionsContext.expand} hands
	 * the consumer, and what Shift+Enter on the cursor does.
	 */
	expandRow: (rowKey: string | number, columnId?: string | number) => void
	/** Clears the expanded row, as its form closes. */
	collapseRow: () => void
	/**
	 * The value a type-to-edit entry opens this cell's editor with, or
	 * `undefined` for an entry that seeds nothing. The editor reads it once, as it
	 * mounts, and stages it as the cell's draft.
	 */
	entrySeed: (rowKey: string | number, columnId: string | number) => string | number | undefined
	/**
	 * Whether an entry named this cell, as Enter, F2, a double-click, a typed
	 * character, or Tab from the cell before do. The editor reads it once, as it
	 * mounts, and a choice editor then opens its panel. The other editors of a
	 * row that row scope opens read `false`, as does an editor that mounts again
	 * after a scroll.
	 */
	hasEntry: (rowKey: string | number, columnId: string | number) => boolean
	/**
	 * Whether this cell's editor takes focus now. An editor asks as it mounts,
	 * and as the session comes to hold it. It is `true` once, for the cell an
	 * entry named, while the session holds that cell open.
	 */
	claimFocus: (rowKey: string | number, columnId: string | number) => boolean
	/**
	 * The settle controls that this cell's editor shows. The hook decides the
	 * policy, and the cell only renders it. The cell that a cell-scoped session
	 * holds shows them, and every other cell shows none. Under `commitOn:
	 * 'leaveEditor'` a move away saves, so that cell shows discard alone. The
	 * answer reads {@link GridActiveEditStore}, so a cell reads it in the same
	 * pass as its flag.
	 */
	settleControls: (rowKey: string | number, columnId: string | number) => GridSettleControls
	/**
	 * Moves a cell-scoped session onto a refused cell that the refusal opened
	 * beside it, as focus moves into that cell's editor. Focus is already
	 * there, so the move claims no focus. The cell the session leaves commits.
	 */
	resumeCell: (rowKey: string | number, columnId: string | number) => void
	/** Whether the grid owns entry and the session keys (`session: 'managed'`). */
	managed: boolean
	/**
	 * The overlay that the open cells edit in on a phone
	 * ({@link GridEditableConfig.overlay}), or `null` where they edit in
	 * place. With an overlay, the data cells show their content, and no editor
	 * mounts in the table.
	 */
	overlay: 'drawer' | 'sheet' | null
	/**
	 * The surface of the form of an expanded row: the phone overlay on a
	 * phone, and a `Sheet` from the side on a wider screen.
	 */
	form: 'drawer' | 'sheet'
	/**
	 * Ends the session on a row with a save, as Enter does, for the Save of
	 * the overlay. It settles when the commit of the row settles, so an async
	 * commit has settled, and a refused row is open again. A save that the
	 * consumer declines, through a controlled `rows` or `cell`, settles at once
	 * and leaves the row open.
	 */
	saveSession: (rowKey: string | number) => Promise<void>
	/**
	 * Names the row whose overlay has finished opening, for the
	 * `onOpenComplete` of the overlay, or `null` as the overlay closes.
	 */
	showOverlay: (rowKey: string | number | null) => void
	/**
	 * The element that focus returns to as the session on a row ends: the tab
	 * stop, with the cursor on the cell that the session edited, or the cell or
	 * element that had the focus as the row opened. It is `null` when that
	 * element is gone. The overlay reads it as it closes.
	 */
	focusTarget: (rowKey: string | number) => HTMLElement | null
}

/**
 * The editing session, or `null` when the grid is not editable. For the surfaces
 * every grid renders (the row actions column), which must ask rather than
 * assume. @internal
 */
export const [GridEditingSessionContext, useGridEditingSessionOrNull] =
	createContext<GridEditingSession | null>('GridEditingSession', { default: null })

/** The editing session. Throws outside an editable grid, where there is none. @internal */
export function useGridEditingSession(): GridEditingSession {
	const session = useGridEditingSessionOrNull()

	if (session === null)
		throw new Error('useGridEditingSession must be used within an editable Grid')

	return session
}

/**
 * The new-row slot of an editable grid ({@link GridEditableConfig.newRow}), as
 * the slot's cells read it. It rides a context of its own, so a change to the
 * slot renders the slot and no data cell.
 *
 * @internal
 */
export type GridNewRowSession = {
	/** Where the slot sits, at the top or the bottom of the body. */
	position: 'top' | 'bottom'
	/**
	 * A counter that the editors of the slot are keyed by. An add, an Escape,
	 * and a typed entry raise it, so each editor mounts again and reads the
	 * draft store.
	 */
	generation: number
	/**
	 * A counter that a blocked add raises. The slot renders again, so each
	 * editor checks `validate` with the current row and shows why the add
	 * stopped.
	 */
	checks: number
	/** Whether an add that `onRowAdd` returned as a promise is in flight. */
	inFlight: boolean
	/** The draft store of the session, which the slot writes under its reserved key. */
	stageDraft: GridEditingSession['stageDraft']
	unstageDraft: GridEditingSession['unstageDraft']
	readDraft: GridEditingSession['readDraft']
	/**
	 * Whether the editor of this column takes focus now. It is `true` once, for
	 * the cell that an add, or a typed entry, names.
	 */
	claimFocus: (columnId: string | number) => boolean
	/** Adds the row: validates the drafted cells and calls `onRowAdd`. */
	addRow: () => void
	/** The editor that the grid infers for a column of the slot, which holds no value of its own. */
	editorKind: (column: { id: string | number; field?: PropertyKey }) => EditorKind
	/** The cursor's per-cell id deriver, for the `aria-activedescendant` of a slot cell. */
	cellId: (row: number, col: number) => string
	/**
	 * Seats the keyboard cursor on a column of the slot, for a press on a cell
	 * of the slot. It has the guards of a press on a data cell: the focus does
	 * not scroll, and a press while a drag holds the pointer does not seat the
	 * cursor.
	 */
	seat: (col: number) => void
}

/** The new-row slot, or `null` when the grid shows none. @internal */
export const [GridNewRowContext, useGridNewRowSession] = createContext<GridNewRowSession | null>(
	'GridNewRow',
)

/** Carries the group-by wiring from `GridData` to the header buttons. @internal */
export const [GridGroupByContext, useGridGroupByButton] =
	createContext<GridGroupByContextValue | null>('GridGroupByButton')

/**
 * The id of the column being drag-reordered, or `null` when idle. Provided by
 * the grid around the sortable region and read by each reordering body cell so
 * only the dragged column's cells carry the `data-dragging` lift. The value
 * changes just at drag start and end. The per-frame translate rides a CSS
 * variable instead (see {@link columnShiftStyle}), so a drag re-renders the body
 * cells twice, not on every pointer move.
 *
 * @internal
 */
export const [GridReorderContext] = createContext<string | null>('GridReorder', {
	default: null,
})

/**
 * The drag and drop parts of the grid, from the module that loads when the grid
 * takes a reorder (see {@link GridReorderKit}). It is `null` until the module
 * is loaded. The headers, the body, and the rows then render their static
 * forms, which have the same layout as the draggable forms.
 *
 * @internal
 */
export const [GridReorderKitContext] = createContext<GridReorderKit | null>('GridReorderKit', {
	default: null,
})
