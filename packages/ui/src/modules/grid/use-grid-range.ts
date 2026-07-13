'use client'

import {
	type ClipboardEvent as ReactClipboardEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core'
import { useIsomorphicLayoutEffect } from '../../hooks/use-isomorphic-layout-effect'
import { coercePastedValue, parseTsv, serializeTsv } from './engine/grid-editing-utilities'
import type { CellChange } from './grid-editing-types'
import type { GridColumn } from './types'
import type { Coord, GridNavStore } from './use-grid-navigation'

/** The keys that move the cursor — with Shift held they stretch the range instead of collapsing it. @internal */
const MOVE_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

/** The rectangle between the anchor and the cursor, in display coords (inclusive). @internal */
type Rect = { top: number; bottom: number; left: number; right: number }

/** Normalizes two corner coords into a {@link Rect}. @internal */
function rectOf(a: Coord, b: Coord): Rect {
	return {
		top: Math.min(a.row, b.row),
		bottom: Math.max(a.row, b.row),
		left: Math.min(a.col, b.col),
		right: Math.max(a.col, b.col),
	}
}

/**
 * One pasted cell's resolved change: the clipboard text coerced to the target
 * cell's primitive type, dropped when the column can't take a write (read-only
 * or field-less), the coercion fails, the value is unchanged, or `validate`
 * rejects it. @internal
 */
function pastedCellChange<T>(
	text: string,
	row: T,
	rowKey: string | number,
	col: GridColumn<T>,
): CellChange | null {
	if (col.readOnly || col.field == null) return null

	const original = row[col.field]

	const value = coercePastedValue(text, original)

	if (value === undefined || Object.is(value, original)) return null

	if (col.validate?.(value, row) != null) return null

	return { rowKey, columnId: col.id, value }
}

/**
 * Maps a parsed TSV block into one {@link CellChange} batch from `start` (the
 * range's top-left): cells past the grid's extent clip off, and each in-bounds
 * cell resolves through {@link pastedCellChange}. @internal
 */
function buildPasteBatch<T>(args: {
	block: string[][]
	start: Coord
	rows: T[]
	rowKeys: (string | number)[]
	columns: GridColumn<T>[]
}): CellChange[] {
	const changes: CellChange[] = []

	for (let r = 0; r < args.block.length; r++) {
		const row = args.rows[args.start.row + r]

		const rowKey = args.rowKeys[args.start.row + r]

		if (row == null || rowKey === undefined) break

		const line = args.block[r] ?? []

		for (let c = 0; c < line.length; c++) {
			const col = args.columns[args.start.col + c]

			if (!col) break

			const change = pastedCellChange(line[c] ?? '', row, rowKey, col)

			if (change) changes.push(change)
		}
	}

	return changes
}

/**
 * One filled cell's resolved change: the source value written to the target
 * cell, dropped when the column can't take a write, the value is unchanged, or
 * `validate` rejects it. @internal
 */
function filledCellChange<T>(
	value: unknown,
	row: T,
	rowKey: string | number,
	col: GridColumn<T>,
): CellChange | null {
	if (col.readOnly || col.field == null) return null

	if (Object.is(value, row[col.field])) return null

	if (col.validate?.(value, row) != null) return null

	return { rowKey, columnId: col.id, value }
}

/**
 * One row's slice of a fill batch: each in-range column (past the source edge)
 * receives its source value — the rect's top row's for `'down'`, the row's own
 * left-column value for `'right'` — resolved through {@link filledCellChange}.
 * @internal
 */
function fillRowChanges<T>(args: {
	direction: 'down' | 'right'
	rect: Rect
	r: number
	row: T
	rowKey: string | number
	rows: T[]
	columns: GridColumn<T>[]
}): CellChange[] {
	const { direction, rect, r, row, rowKey, rows, columns } = args

	const changes: CellChange[] = []

	for (let c = rect.left; c <= rect.right; c++) {
		if (direction === 'down' ? r === rect.top : c === rect.left) continue

		const col = columns[c]

		const source = direction === 'down' ? rows[rect.top] : row

		const from = direction === 'down' ? col : columns[rect.left]

		if (!col || source == null || from?.field == null) continue

		const change = filledCellChange(source[from.field], row, rowKey, col)

		if (change) changes.push(change)
	}

	return changes
}

/**
 * Builds a fill's {@link CellChange} batch over the range: `'down'` copies the
 * rect's top row down each of its columns, `'right'` its left column across
 * each of its rows — the source edge itself is untouched. @internal
 */
function buildFillBatch<T>(args: {
	direction: 'down' | 'right'
	rect: Rect
	rows: T[]
	rowKeys: (string | number)[]
	columns: GridColumn<T>[]
}): CellChange[] {
	const changes: CellChange[] = []

	for (let r = args.rect.top; r <= args.rect.bottom; r++) {
		const row = args.rows[r]

		const rowKey = args.rowKeys[r]

		if (row == null || rowKey === undefined) continue

		changes.push(
			...fillRowChanges({
				direction: args.direction,
				rect: args.rect,
				r,
				row,
				rowKey,
				rows: args.rows,
				columns: args.columns,
			}),
		)
	}

	return changes
}

/**
 * Resolves a tab-stop key press into the anchor's next state: a coord seats it
 * (the first Shift+move, anchored at the cursor's pre-move cell), `null`
 * collapses it (an unshifted move, or Escape), and `undefined` leaves it
 * untouched. @internal
 */
function anchorTransition(
	event: ReactKeyboardEvent<HTMLTableElement>,
	anchor: Coord | null,
	active: Coord | null,
): Coord | null | undefined {
	if (MOVE_KEYS.has(event.key)) {
		if (event.shiftKey) return !anchor && active ? active : undefined

		return anchor ? null : undefined
	}

	if (event.key === 'Escape') return anchor ? null : undefined

	return undefined
}

/** The fill direction a key press names (Ctrl/Cmd+D fills down, +R right), or `null`. @internal */
function fillDirection(event: ReactKeyboardEvent<HTMLTableElement>): 'down' | 'right' | null {
	if (!(event.metaKey || event.ctrlKey) || event.altKey) return null

	const key = event.key.toLowerCase()

	return key === 'd' ? 'down' : key === 'r' ? 'right' : null
}

/** The range's rectangular block of raw cell values, for the copy TSV. @internal */
function copyBlock<T>(rect: Rect, rows: T[], columns: GridColumn<T>[]): unknown[][] {
	const block: unknown[][] = []

	for (let r = rect.top; r <= rect.bottom; r++) {
		const row = rows[r]

		const line: unknown[] = []

		for (let c = rect.left; c <= rect.right; c++) {
			const col = columns[c]

			line.push(row != null && col?.field != null ? row[col.field] : '')
		}

		block.push(line)
	}

	return block
}

/**
 * The cursor's anchored rectangular range, with copy / paste / fill riding the
 * one commit sink (see `docs/2026-07-13-GRID-RANGE-PLAN.md`). Shift+movement
 * seats the anchor at the cursor's pre-move cell and stretches the rect to
 * wherever the cursor goes; an unshifted move or Escape collapses it. The
 * range renders through the composed store this hook returns — the cell
 * markers subscribe to their own membership, so a sweep re-renders nothing.
 * Copy serializes the range as TSV through the native `copy` event; paste maps
 * a TSV block through per-column coercion and `validate` into one
 * `CellChange[]` batch via `commitBatch` (so it inherits the sink's async and
 * undo layers); Ctrl/Cmd+D / R fill the range from its leading edge. Paste and
 * fill require `editable`; the range and copy exist wherever the cursor does.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridRange<T>({
	enabled,
	editable,
	baseStore,
	active,
	rowsRef,
	rowKeysRef,
	dataColumnsRef,
	commitBatch,
}: {
	/** Whether the cursor (and with it the range) is on at all. */
	enabled: boolean
	/** Whether the grid can take writes — gates paste and fill. */
	editable: boolean
	/** The cursor's own store; the returned store composes range membership over it. */
	baseStore: GridNavStore
	/** The cursor's active coord (reactive), the range's moving corner. */
	active: Coord | null
	rowsRef: RefObject<T[]>
	rowKeysRef: RefObject<(string | number)[]>
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/** The editing layer's sink wrapper; paste/fill batches flow through it. */
	commitBatch: (changes: CellChange[]) => void
}): {
	/** The composed store to provide to the cell markers. */
	store: GridNavStore
	/** Key layer for the table tab stop: anchor seat/collapse and the fill keys. */
	rangeKeys: (event: ReactKeyboardEvent<HTMLTableElement>) => void
	onCopy: (event: ReactClipboardEvent<HTMLTableElement>) => void
	onPaste: (event: ReactClipboardEvent<HTMLTableElement>) => void
} {
	const [anchor, setAnchor] = useState<Coord | null>(null)

	const anchorRef = useRef(anchor)

	anchorRef.current = anchor

	const activeRef = useRef(active)

	activeRef.current = active

	const editableRef = useRef(editable)

	editableRef.current = editable

	// The base store's identity can flip (the cursor's inert/live swap), so the
	// composed store delegates through a live ref rather than capturing one.
	const baseRef = useRef(baseStore)

	baseRef.current = baseStore

	// Mirror the rect corners into the store internals (the cursor-store
	// pattern): the cell markers subscribe to their own membership, so a range
	// sweep re-renders only the cells whose flag flipped.
	const internalRef = useRef<{
		anchor: Coord | null
		active: Coord | null
		enabled: boolean
		listeners: Set<() => void>
	} | null>(null)

	if (internalRef.current === null) {
		internalRef.current = { anchor, active, enabled, listeners: new Set() }
	}

	const internal = internalRef.current

	useIsomorphicLayoutEffect(() => {
		internal.anchor = anchor

		internal.active = active

		internal.enabled = enabled

		for (const listener of internal.listeners) listener()
	}, [anchor, active, enabled, internal])

	const storeRef = useRef<GridNavStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = {
			subscribe: (listener) => {
				const unsubscribeBase = baseRef.current.subscribe(listener)

				internal.listeners.add(listener)

				return () => {
					unsubscribeBase()

					internal.listeners.delete(listener)
				}
			},
			isActive: (row, col) => baseRef.current.isActive(row, col),
			isInRange: (row, col) => {
				const a = internal.anchor

				const b = internal.active

				if (!internal.enabled || !a || !b) return false

				const rect = rectOf(a, b)

				return row >= rect.top && row <= rect.bottom && col >= rect.left && col <= rect.right
			},
		}
	}

	// The current rect: anchor × cursor, or the active cell alone.
	const currentRect = useCallback((): Rect | null => {
		const b = activeRef.current

		if (!b) return null

		return rectOf(anchorRef.current ?? b, b)
	}, [])

	const fill = useCallback(
		(direction: 'down' | 'right'): boolean => {
			const a = anchorRef.current

			const b = activeRef.current

			if (!a || !b) return false

			const rect = rectOf(a, b)

			if (direction === 'down' ? rect.top === rect.bottom : rect.left === rect.right) {
				return false
			}

			const changes = buildFillBatch({
				direction,
				rect,
				rows: rowsRef.current,
				rowKeys: rowKeysRef.current,
				columns: dataColumnsRef.current,
			})

			if (changes.length) commitBatch(changes)

			return true
		},
		[commitBatch, rowsRef, rowKeysRef, dataColumnsRef],
	)

	// The tab-stop key layer: Shift+movement seats the anchor (the cursor's own
	// handler then moves the extent), an unshifted move or Escape collapses the
	// range, and Ctrl/Cmd+D / R fill it downward / rightward when editable.
	const rangeKeys = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget) return

			const next = anchorTransition(event, anchorRef.current, activeRef.current)

			if (next !== undefined) {
				setAnchor(next)

				return
			}

			const direction = fillDirection(event)

			if (direction && editableRef.current && fill(direction)) event.preventDefault()
		},
		[fill],
	)

	// Copy rides the native event's clipboardData (no permission prompt): the
	// range — or the active cell — serialized as TSV, announced politely.
	const onCopy = useCallback(
		(event: ReactClipboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget) return

			const rect = currentRect()

			if (!rect) return

			const block = copyBlock(rect, rowsRef.current, dataColumnsRef.current)

			event.clipboardData.setData('text/plain', serializeTsv(block))

			event.preventDefault()

			const count = (rect.bottom - rect.top + 1) * (rect.right - rect.left + 1)

			announce(`${count} ${count === 1 ? 'cell' : 'cells'} copied`)
		},
		[currentRect, rowsRef, dataColumnsRef],
	)

	// Paste maps the clipboard's TSV block from the range's top-left into one
	// batch through the sink wrapper, which announces it and carries the async
	// and undo layers.
	const onPaste = useCallback(
		(event: ReactClipboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget || !editableRef.current) return

			const rect = currentRect()

			if (!rect) return

			const text = event.clipboardData.getData('text/plain')

			if (!text) return

			event.preventDefault()

			const changes = buildPasteBatch({
				block: parseTsv(text),
				start: { row: rect.top, col: rect.left },
				rows: rowsRef.current,
				rowKeys: rowKeysRef.current,
				columns: dataColumnsRef.current,
			})

			if (changes.length) commitBatch(changes)
		},
		[currentRect, commitBatch, rowsRef, rowKeysRef, dataColumnsRef],
	)

	return { store: storeRef.current as GridNavStore, rangeKeys, onCopy, onPaste }
}
