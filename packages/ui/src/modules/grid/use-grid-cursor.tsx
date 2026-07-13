'use client'

import {
	type FocusEvent as ReactFocusEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useMemo,
	useRef,
} from 'react'
import { isColumnEditable } from './engine/grid-editing-utilities'
import type { GridCellClick } from './engine/grid-row/cell'
import {
	type GridRowEditing,
	GridRowEditingContext,
	type SessionMove,
} from './grid-editing-context'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useGridEditing } from './use-grid-editing'
import { useGridEditingColumns } from './use-grid-editing-columns'
import {
	type Coord,
	type GridCellActivate,
	type GridNavTableProps,
	type GridRowActivate,
	useGridNavigation,
} from './use-grid-navigation'
import { useGridNavigationColumns } from './use-grid-navigation-columns'
import { useGridRange } from './use-grid-range'

/** Live refs the cursor and editing layers read at event/render time, populated by {@link GridData} after the engine resolves order and rows. @internal */
type GridCursorRefs<T> = {
	rowsRef: RefObject<T[]>
	colCountRef: RefObject<number>
	rowIndexMapRef: RefObject<Map<T, number>>
	colIndexMapRef: RefObject<Map<string | number, number>>
	rowKeysRef: RefObject<(string | number)[]>
	dataColumnsRef: RefObject<GridColumn<T>[]>
}

/** The default commit policy: the commit keys alone save a grid-owned session. @internal */
const DEFAULT_COMMIT_ON: NonNullable<GridEditableConfig['commitOn']> = ['enter']

/** Whether a key press types a printable character (no modifiers; Space stays with selection). @internal */
function isTypingKey(event: ReactKeyboardEvent<HTMLTableElement>): boolean {
	return (
		event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey
	)
}

/**
 * The tab-stop half of the session keys: F2 toggles the cursor's cell into
 * edit, and a printable character enters it seeded (typing replaces the value,
 * as spreadsheets do). Fires only from the table tab stop, never from within a
 * control — the caller guarantees the target. Consumes the key only when an
 * edit actually began, so presses over non-editable cells keep their defaults.
 *
 * @internal
 */
function tabStopSessionKeys(
	event: ReactKeyboardEvent<HTMLTableElement>,
	active: Coord | null,
	enterEditAt: (row: number, col: number, seed?: string) => boolean,
): void {
	if (!active) return

	if (event.key === 'F2') {
		if (enterEditAt(active.row, active.col)) event.preventDefault()
	} else if (isTypingKey(event)) {
		if (enterEditAt(active.row, active.col, event.key)) event.preventDefault()
	}
}

/**
 * Whether a bubbled editor key belongs to an open floating surface (a portaled
 * panel, or an open disclosure's own trigger) — the session keys defer there,
 * exactly as the session Escape does. @internal
 */
function fromOpenSurface(target: Element): boolean {
	return (
		target.closest('[data-floating-ui-portal]') != null ||
		target.closest('[aria-expanded="true"]') != null
	)
}

/**
 * Resolves the data cell a key bubbling out of an editor belongs to, from the
 * event target's `<tr data-row-index>` / `<td data-grid-col>` markers into the
 * cursor's display coord — the same DOM resolution the session Escape uses for
 * its row. `null` when the key didn't come from a data cell. @internal
 */
function resolveEditorCoord(
	target: Element,
	colIndexMap: Map<string | number, number>,
): Coord | null {
	const rowIndex = target.closest('tr[data-row-index]')?.getAttribute('data-row-index')

	const colId = target.closest('td[data-grid-col]')?.getAttribute('data-grid-col')

	if (rowIndex == null || colId == null) return null

	const row = Number(rowIndex)

	// Column ids may be numbers; the attribute stringifies either shape.
	const col = colIndexMap.get(colId) ?? colIndexMap.get(Number(colId))

	if (!Number.isInteger(row) || col === undefined) return null

	return { row, col }
}

/**
 * Resolves the editing cell a session key bubbling out of an editor targets:
 * its display coord (via {@link resolveEditorCoord}) and row key, `null` when
 * the key came from outside a data cell or its row isn't editing. @internal
 */
function resolveEditingCell(
	target: Element,
	colIndexMap: Map<string | number, number>,
	rowKeys: (string | number)[],
	isRowEditing: (rowKey: string | number) => boolean,
): { from: Coord; rowKey: string | number } | null {
	const from = resolveEditorCoord(target, colIndexMap)

	if (from === null) return null

	const rowKey = rowKeys[from.row]

	if (rowKey === undefined || !isRowEditing(rowKey)) return null

	return { from, rowKey }
}

/**
 * The 'blur' half of the commit policy: resolves whether an intra-grid focus
 * move ends a cell-scoped session, returning the session's row key when it
 * does. Focus that stayed within the editing cell's own `<td>` (an editor's
 * inner controls) doesn't end it. @internal
 */
function blurCommitTarget(
	target: EventTarget | null,
	next: Node,
	colIndexMap: Map<string | number, number>,
	rowKeys: (string | number)[],
	isRowEditing: (rowKey: string | number) => boolean,
): string | number | null {
	if (!(target instanceof Element)) return null

	const cell = resolveEditingCell(target, colIndexMap, rowKeys, isRowEditing)

	if (!cell) return null

	if (target.closest('td')?.contains(next)) return null

	return cell.rowKey
}

/**
 * The cursor + editing layer for {@link GridData}, gathering the keyboard cursor
 * ({@link useGridNavigation}) and — when `editable` is set — the inline editing
 * session ({@link useGridEditing}) behind one surface. Resolves the column
 * augmentation (cursor-only vs. editing-aware), the `<table>` cursor props (with
 * the editing key handlers layered on), the cursor store provider, and a `wrap`
 * that mounts the editing contexts around the table. Pulled out of
 * {@link GridData} so its body stays within the cognitive-complexity budget and
 * the editing wiring reads as one concern.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridCursor<T>({
	navigable,
	editable,
	columns,
	onRowActivate,
	onCellActivate,
	selectableRef,
	toggleActiveRow,
	scrollRowIntoViewRef,
	scrollContainerRef,
	refs,
}: {
	navigable: boolean
	editable: GridEditableConfig | undefined
	/** The pinned/resolved columns to augment. */
	columns: GridColumn<T>[]
	onRowActivate: GridRowActivate | undefined
	/** Activates the cell under the cursor on Enter, ahead of the row activation. */
	onCellActivate: GridCellActivate | undefined
	/** Whether the grid has a selection column; gates the cursor's Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the active row's selection by display index, for the cursor's Space key. */
	toggleActiveRow: ((rowIdx: number) => void) | undefined
	/** Scrolls a row into the virtualized window before the cursor lands on it; null when unwindowed. */
	scrollRowIntoViewRef: RefObject<((rowIndex: number) => void) | null>
	/** The grid's scroll container, measured for the cursor's viewport-relative PageUp/Down step. */
	scrollContainerRef: RefObject<HTMLElement | null>
	refs: GridCursorRefs<T>
}): {
	/** Whether the grid carries a keyboard cursor (`navigable` or editable). */
	cursorEnabled: boolean
	/** Cursor store to provide to the cells via {@link GridNavContext}. */
	navStore: ReturnType<typeof useGridNavigation>['store']
	/** `<table>` cursor props, with the editing key handlers layered over navigation when editable. */
	navTableProps: GridNavTableProps | undefined
	/** Re-clamps the cursor to the current bounds; the grid drives it as rows/columns change. */
	reconcile: (rowCount: number, colCount: number) => void
	/** The augmented columns to feed the engine. */
	columns: GridColumn<T>[]
	/**
	 * The grid's own double-click-to-edit intent under `editable.trigger:
	 * 'doubleClick'` — {@link GridData} composes it ahead of the consumer's
	 * handler on the built-in cell double-click event. `undefined` otherwise.
	 */
	editOnCellDoubleClick: GridCellClick<T> | undefined
	/** Wraps the table with the editing contexts when editable, else returns it unchanged. */
	wrap: (children: ReactNode) => ReactNode
} {
	const editingEnabled = editable != null

	const cursorEnabled = navigable || editingEnabled

	// Grid-owned edit sessions: the grid begins one on a cell double-click or the
	// cursor's Enter; the default 'manual' mode leaves entry to the consumer.
	const sessionOwned = editingEnabled && editable.trigger === 'doubleClick'

	// The commit policy (`commitOn`, default ['enter']): whether the commit keys
	// are armed, and whether blur / click-outside end a session.
	const commitOn = editable?.commitOn ?? DEFAULT_COMMIT_ON

	const commitKeys = sessionOwned && commitOn.includes('enter')

	const commitOnBlur = sessionOwned && commitOn.includes('blur')

	const commitOnClickOutside = sessionOwned && commitOn.includes('clickOutside')

	const { rowsRef, colCountRef, rowIndexMapRef, colIndexMapRef, rowKeysRef, dataColumnsRef } = refs

	// Enter on the cursor's active cell begins the cell's edit session — the
	// keyboard peer of the pointer double-click. The entry resolver needs the
	// editing hook (which in turn feeds the cursor's key layering), so the
	// activation wrapper reads it through a ref assigned below.
	const enterEditAtRef = useRef<(rowIdx: number, colIdx: number, seed?: string) => boolean>(
		() => false,
	)

	const onCellActivateWithEdit = useMemo<GridCellActivate | undefined>(() => {
		if (!sessionOwned) return onCellActivate

		return (rowIdx, colIdx, event) => {
			// The consumer's cell click fires first — the same order the pointer path
			// fires the single-click handlers ahead of the double-click.
			onCellActivate?.(rowIdx, colIdx, event)

			if (event.key === 'Enter') enterEditAtRef.current(rowIdx, colIdx)
		}
	}, [sessionOwned, onCellActivate])

	const nav = useGridNavigation({
		enabled: cursorEnabled,
		rowsRef,
		colCountRef,
		onRowActivate,
		onCellActivate: onCellActivateWithEdit,
		selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef,
	})

	// The cursor's active coord at event time, for the tab-stop session keys.
	const activeCoordRef = useRef(nav.active)

	activeCoordRef.current = nav.active

	const editing = useGridEditing<T>({
		enabled: editingEnabled,
		config: editable,
		rowsRef,
		rowKeysRef,
		dataColumnsRef,
	})

	// The cursor's anchored rectangular range (Shift+arrows), with copy on its
	// own, and paste/fill through the editing sink when the grid is editable.
	// Its store composes range membership over the cursor store for the cells.
	const range = useGridRange<T>({
		enabled: cursorEnabled,
		editable: editingEnabled,
		baseStore: nav.store,
		active: nav.active,
		rowsRef,
		rowKeysRef,
		dataColumnsRef,
		commitBatch: editing.commitBatch,
	})

	// Begins the edit session for the cell at a cursor coord: resolves its row
	// key and column from the live display maps, gates on an editable column
	// (a `readOnly` or slotless/fieldless one never enters), and hands the
	// coord — plus any typed-to-enter seed — to the editing layer to focus that
	// cell's editor once it mounts. Reports whether it entered.
	const enterEditAt = useCallback(
		(rowIdx: number, colIdx: number, seed?: string) => {
			const rowKey = rowKeysRef.current[rowIdx]

			const col = dataColumnsRef.current[colIdx]

			if (rowKey === undefined || !col || !isColumnEditable(col)) return false

			editing.enterRowEdit(rowKey, { row: rowIdx, col: colIdx }, seed)

			return true
		},
		[editing.enterRowEdit, rowKeysRef, dataColumnsRef],
	)

	enterEditAtRef.current = enterEditAt

	// Resolves a commit-and-move key's target: 'down' steps one row in the same
	// column (none past the last row); 'right'/'left' step to the row's nearest
	// editable column, wrapping at the edges (none when the row has no other
	// editable column).
	const resolveMoveTarget = useCallback(
		(move: SessionMove, from: Coord): Coord | null => {
			if (move === 'down') {
				return from.row + 1 < rowsRef.current.length ? { row: from.row + 1, col: from.col } : null
			}

			const cols = dataColumnsRef.current

			const count = cols.length

			for (let step = 1; step < count; step++) {
				const idx = (((from.col + (move === 'right' ? step : -step)) % count) + count) % count

				const col = cols[idx]

				if (col && isColumnEditable(col)) return { row: from.row, col: idx }
			}

			return null
		},
		[rowsRef, dataColumnsRef],
	)

	// The grid-owned session commit, with the commit-and-move keys layered on:
	// a move re-seats the cursor at the target and — cell-scoped — re-enters
	// edit there in the same transition, so the outgoing cell commits through
	// the flush without an intermediate focus bounce. No move (or none
	// reachable) falls back to the plain exit.
	const commitSessionWithMove = useCallback(
		(rowKey: string | number, options?: { move?: SessionMove; from?: Coord }) => {
			const target =
				options?.move && options.from ? resolveMoveTarget(options.move, options.from) : null

			if (target) {
				nav.moveTo(target)

				if (editing.cellScoped && enterEditAt(target.row, target.col)) return
			}

			editing.exitRowEdit(rowKey)
		},
		[resolveMoveTarget, nav.moveTo, editing.cellScoped, editing.exitRowEdit, enterEditAt],
	)

	// The commit-and-move key surface, layered onto the table's key handler when
	// the grid owns the session. From the tab stop: F2 toggles the cursor's cell
	// into edit, and a printable character enters it seeded (typing replaces the
	// value, as spreadsheets do) — only ever from the tab stop, never from
	// within a control. Bubbling out of an editor: F2 commits in place, and
	// Tab / Shift+Tab commit and move through the row's editable cells under
	// `scope: 'cell'` (row scope keeps native Tab across its mounted editors);
	// both defer to an open floating surface, as the session Escape does.
	const editorSessionKeys = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.key !== 'F2' && event.key !== 'Tab') return

			if (!(event.target instanceof Element) || fromOpenSurface(event.target)) return

			const cell = resolveEditingCell(
				event.target,
				colIndexMapRef.current,
				rowKeysRef.current,
				editing.isRowEditing,
			)

			if (!cell) return

			if (event.key === 'F2') {
				event.preventDefault()

				commitSessionWithMove(cell.rowKey)
			} else if (editing.cellScoped) {
				event.preventDefault()

				commitSessionWithMove(cell.rowKey, {
					move: event.shiftKey ? 'left' : 'right',
					from: cell.from,
				})
			}
		},
		[commitSessionWithMove, editing.isRowEditing, editing.cellScoped, colIndexMapRef, rowKeysRef],
	)

	const sessionMoveKeys = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.defaultPrevented) return

			if (event.target === event.currentTarget) {
				tabStopSessionKeys(event, activeCoordRef.current, enterEditAt)
			} else if (commitKeys) {
				// The bubbled keys are all commits, so the whole branch stands down
				// when the commit keys aren't armed (`commitOn` without 'enter').
				editorSessionKeys(event)
			}
		},
		[enterEditAt, editorSessionKeys, commitKeys],
	)

	// The blur / click-outside commit policy (`commitOn`): focus leaving the
	// grid entirely commits every open session ('clickOutside'), and — cell
	// scope — an editor losing focus to elsewhere in the grid commits its cell
	// ('blur'). Focus landing in a floating overlay (a date picker's popover, a
	// listbox panel) is neither, so an editor's open surface never ends its
	// session; nor does focus moving within the editing cell's own controls.
	const sessionBlur = useCallback(
		(event: ReactFocusEvent<HTMLTableElement>) => {
			const next = event.relatedTarget

			if (next instanceof Element && next.closest('[data-floating-ui-portal]')) return

			if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
				if (commitOnClickOutside) editing.exitAllSessions()

				return
			}

			if (!commitOnBlur || !editing.cellScoped) return

			const rowKey = blurCommitTarget(
				event.target,
				next,
				colIndexMapRef.current,
				rowKeysRef.current,
				editing.isRowEditing,
			)

			if (rowKey !== null) editing.exitRowEdit(rowKey)
		},
		[
			commitOnBlur,
			commitOnClickOutside,
			editing.cellScoped,
			editing.exitAllSessions,
			editing.exitRowEdit,
			editing.isRowEditing,
			colIndexMapRef,
			rowKeysRef,
		],
	)

	// Cursor-only augmentation for a plain navigable grid; editing-aware
	// augmentation (which mounts the editors) for an editable one.
	const navColumns = useGridNavigationColumns<T>({
		enabled: cursorEnabled && !editingEnabled,
		columns,
		rowIndexMapRef,
		colIndexMapRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
	})

	const editColumns = useGridEditingColumns<T>({
		enabled: editingEnabled,
		columns,
		rowIndexMapRef,
		colIndexMapRef,
		rowKeysRef,
		cellId: nav.cellId,
		moveTo: nav.moveTo,
	})

	// The pointer entry, fired through the grid's built-in cell double-click
	// event (so the interactive-content guard and data-cell resolution apply).
	const editOnCellDoubleClick = useMemo<GridCellClick<T> | undefined>(() => {
		if (!sessionOwned) return undefined

		return (cell) => {
			const rowIdx = rowKeysRef.current.indexOf(cell.rowKey)

			const colIdx = colIndexMapRef.current.get(cell.columnId)

			if (rowIdx < 0 || colIdx === undefined) return

			enterEditAt(rowIdx, colIdx)
		}
	}, [sessionOwned, enterEditAt, rowKeysRef, colIndexMapRef])

	// The `<table>` cursor props, with the session keys and the blur policy
	// layered ahead of navigation when the grid owns the edit session: the table
	// (the cursor's `role="grid"` tab stop) sees every editor's keys and focus
	// transitions — portaled panels included, since portal events propagate
	// through the React tree — so no editor wires its own abandon, commit-and-
	// move, or blur commit.
	const navTableProps = useMemo<GridNavTableProps | undefined>(() => {
		const base = nav.navTableProps

		const sessionEscape = editing.sessionEscape

		const historyKeys = editing.historyKeys

		if (!base) return undefined

		return {
			...base,
			onKeyDown: (event) => {
				sessionEscape?.(event)

				if (sessionOwned) sessionMoveKeys(event)

				// Undo/redo is a sink layer, armed for every editable grid — the
				// consumer-owned manual trigger included.
				if (editingEnabled) historyKeys(event)

				// The range's anchor seat/collapse and fill keys ride wherever the
				// cursor does (paste/fill gate on editable inside).
				range.rangeKeys(event)

				base.onKeyDown(event)
			},
			onBlur: sessionOwned
				? (event) => {
						sessionBlur(event)

						base.onBlur(event)
					}
				: base.onBlur,
			onCopy: range.onCopy,
			onPaste: range.onPaste,
		}
	}, [
		nav.navTableProps,
		editing.sessionEscape,
		editing.historyKeys,
		editingEnabled,
		sessionOwned,
		sessionMoveKeys,
		sessionBlur,
		range.rangeKeys,
		range.onCopy,
		range.onPaste,
	])

	// The provided editing context: the staging half from the editing hook, with
	// the grid-owned session exits (commit-and-move, cancel) composed over it.
	const rowEditingValue = useMemo<GridRowEditing>(
		() => ({
			...editing.rowEditing,
			commitRowEdit: sessionOwned ? commitSessionWithMove : undefined,
			cancelRowEdit: sessionOwned ? editing.cancelRowEdit : undefined,
			commitOnEnter: commitKeys,
		}),
		[editing.rowEditing, sessionOwned, commitSessionWithMove, editing.cancelRowEdit, commitKeys],
	)

	const wrap = useMemo(
		() =>
			editingEnabled
				? (children: ReactNode) => (
						<GridRowEditingContext value={rowEditingValue}>{children}</GridRowEditingContext>
					)
				: (children: ReactNode) => children,
		[editingEnabled, rowEditingValue],
	)

	return {
		cursorEnabled,
		// The range-composed store: active-cell plus range membership.
		navStore: range.store,
		navTableProps,
		reconcile: nav.reconcile,
		columns: editingEnabled ? editColumns : navColumns,
		editOnCellDoubleClick,
		wrap,
	}
}
