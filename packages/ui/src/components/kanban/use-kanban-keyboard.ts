'use client'

import { arrayMove } from '@dnd-kit/sortable'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { accessibleName, announce, querySlot } from '../../core'
import { useKeyboardLifted } from '../../hooks'
import type { KanbanColumnBase } from './types'

/** Accessible name of a card, for announcements. @internal */
const cardName = (container: ParentNode | null, cardId: string) =>
	accessibleName(querySlot(container, 'kanban-card', 'card-id', cardId))

/** Accessible name of a column, for announcements. @internal */
const columnName = (container: ParentNode | null, columnId: string) =>
	accessibleName(querySlot(container, 'kanban-column', 'column-id', columnId))

/** Keys that move focus or the lifted card between cards. @internal */
type NeighborKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

/**
 * Skips empty columns to the next populated one in the travel direction; the
 * landing row clamps to the target column's length.
 *
 * @internal
 */
function resolveCrossColumn<T, C extends KanbanColumnBase<T>>(
	columns: C[],
	colIdx: number,
	itemIdx: number,
	key: 'ArrowLeft' | 'ArrowRight',
): { col: C; idx: number } | null {
	const dir = key === 'ArrowLeft' ? -1 : 1

	let nextColIdx = colIdx + dir

	while (nextColIdx >= 0 && nextColIdx < columns.length) {
		const nextCol = columns[nextColIdx]

		if (nextCol && nextCol.items.length > 0) {
			return { col: nextCol, idx: Math.min(itemIdx, nextCol.items.length - 1) }
		}

		nextColIdx += dir
	}

	return null
}

/**
 * Target column + row for a neighbor move. Out-of-range rows fall out at the
 * caller's lookup, mirroring the previous bounds guard.
 *
 * @internal
 */
function resolveNeighborTarget<T, C extends KanbanColumnBase<T>>(
	columns: C[],
	colIdx: number,
	col: C,
	itemIdx: number,
	key: NeighborKey,
): { col: C; idx: number } | null {
	switch (key) {
		case 'ArrowUp':
			return { col, idx: itemIdx - 1 }
		case 'ArrowDown':
			return { col, idx: itemIdx + 1 }
		case 'Home':
			return { col, idx: 0 }
		case 'End':
			return { col, idx: col.items.length - 1 }
		default:
			return resolveCrossColumn<T, C>(columns, colIdx, itemIdx, key)
	}
}

/** Dependencies threaded to the module-level card key handlers. @internal */
type KanbanKeyDeps = {
	liftedCardId: string | null
	setLiftedCardId: (id: string | null) => void
	containerRef: RefObject<HTMLElement | null>
	locate: (cardId: string) => { columnId: string; position: number; count: number } | null
	focusNeighbor: (cardId: string, key: NeighborKey) => boolean
	moveWithinColumn: (cardId: string, direction: -1 | 1) => void
	moveToColumn: (cardId: string, direction: -1 | 1) => void
}

/** Space toggles the lifted state and announces the pick-up / drop. @internal */
function handleCardSpaceToggle(cardId: string, event: KeyboardEvent, deps: KanbanKeyDeps) {
	event.preventDefault()

	const lifting = deps.liftedCardId !== cardId

	deps.setLiftedCardId(lifting ? cardId : null)

	const loc = deps.locate(cardId)

	const where = loc
		? `, position ${loc.position} of ${loc.count} in ${columnName(deps.containerRef.current, loc.columnId)}`
		: ''

	announce(
		lifting
			? `Picked up ${cardName(deps.containerRef.current, cardId)}${where}. Use arrow keys to move, Enter to drop.`
			: `Dropped ${cardName(deps.containerRef.current, cardId)}${where}.`,
		{ assertive: true },
	)
}

/** Not lifted: arrows/Home/End move focus between cards. @internal */
function handleCardNeighborNav(cardId: string, event: KeyboardEvent, deps: KanbanKeyDeps) {
	switch (event.key) {
		case 'ArrowUp':
		case 'ArrowDown':
		case 'ArrowLeft':
		case 'ArrowRight':
		case 'Home':
		case 'End':
			if (deps.focusNeighbor(cardId, event.key)) event.preventDefault()

			break
	}
}

/** Lifted: Escape/Enter drops, arrows reorder the lifted card across columns. @internal */
function handleCardLiftedNav(cardId: string, event: KeyboardEvent, deps: KanbanKeyDeps) {
	switch (event.key) {
		case 'Escape':
		case 'Enter': {
			event.preventDefault()

			deps.setLiftedCardId(null)

			const loc = deps.locate(cardId)

			const where = loc
				? `, position ${loc.position} of ${loc.count} in ${columnName(deps.containerRef.current, loc.columnId)}`
				: ''

			announce(`Dropped ${cardName(deps.containerRef.current, cardId)}${where}.`, {
				assertive: true,
			})

			break
		}
		case 'ArrowUp':
			event.preventDefault()

			deps.moveWithinColumn(cardId, -1)

			break
		case 'ArrowDown':
			event.preventDefault()

			deps.moveWithinColumn(cardId, 1)

			break
		case 'ArrowLeft':
			event.preventDefault()

			deps.moveToColumn(cardId, -1)

			break
		case 'ArrowRight':
			event.preventDefault()

			deps.moveToColumn(cardId, 1)

			break
	}
}

/**
 * Keyboard reordering and an accessible drag alternative for the {@link Kanban}
 * board (APG grabbed-element pattern). Space lifts/drops a card with live-region
 * announcements; while lifted, arrows move it within and across columns; while
 * not lifted, arrows/Home/End move focus between cards. Emits the next columns
 * through `onValueChange`. Returns the lifted-card state and the card
 * `keydown`/`blur` handlers.
 */
export function useKanbanKeyboard<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onValueChange,
	containerRef,
}: {
	columns: C[]
	getKey: (item: T) => string
	onValueChange?: (next: C[]) => void
	/** Board root; scopes card lookups so concurrent boards (and the drag overlay clone) don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
}) {
	const focusCard = useCallback(
		(cardId: string) => {
			querySlot(containerRef.current, 'kanban-card', 'card-id', cardId)?.focus()
		},
		[containerRef],
	)

	const {
		liftedId: liftedCardId,
		setLiftedId: setLiftedCardId,
		refocus: refocusCard,
		onBlur: onCardBlur,
	} = useKeyboardLifted(focusCard)

	const findColumnByCardId = useCallback(
		(id: string) => columns.find((c) => c.items.some((i) => getKey(i) === id)),
		[columns, getKey],
	)

	// Returns the card's 1-based position within its column, used for announcements.
	const locate = useCallback(
		(cardId: string) => {
			const col = findColumnByCardId(cardId)

			if (!col) return null

			const index = col.items.findIndex((i) => getKey(i) === cardId)

			return index === -1
				? null
				: { columnId: col.id, position: index + 1, count: col.items.length }
		},
		[findColumnByCardId, getKey],
	)

	const focusNeighbor = useCallback(
		(cardId: string, key: NeighborKey) => {
			const colIdx = columns.findIndex((c) => c.items.some((i) => getKey(i) === cardId))

			if (colIdx === -1) return false

			const col = columns[colIdx]

			if (!col) return false

			const itemIdx = col.items.findIndex((i) => getKey(i) === cardId)

			const target = resolveNeighborTarget(columns, colIdx, col, itemIdx, key)

			if (!target) return false

			const targetItem = target.col.items[target.idx]

			if (targetItem === undefined) return false

			focusCard(getKey(targetItem))

			return true
		},
		[columns, getKey, focusCard],
	)

	const moveWithinColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onValueChange) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const idx = col.items.findIndex((i) => getKey(i) === cardId)

			const newIdx = idx + direction

			if (newIdx < 0 || newIdx >= col.items.length) return

			const nextItems = arrayMove(col.items, idx, newIdx)

			onValueChange(columns.map((c) => (c.id === col.id ? { ...c, items: nextItems } : c)) as C[])

			announce(
				`${cardName(containerRef.current, cardId)} moved to position ${newIdx + 1} of ${col.items.length} in ${columnName(containerRef.current, col.id)}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onValueChange, findColumnByCardId, refocusCard, containerRef],
	)

	const moveToColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onValueChange) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const colIdx = columns.findIndex((c) => c.id === col.id)

			const targetIdx = colIdx + direction

			if (targetIdx < 0 || targetIdx >= columns.length) return

			const targetCol = columns[targetIdx]

			if (!targetCol) return

			const itemIdx = col.items.findIndex((i) => getKey(i) === cardId)

			if (itemIdx === -1) return

			const item = col.items[itemIdx]

			if (item === undefined) return

			const next = columns.map((c) => {
				if (c.id === col.id) return { ...c, items: c.items.filter((_, i) => i !== itemIdx) }

				if (c.id === targetCol.id) return { ...c, items: [...c.items, item] }

				return c
			}) as C[]

			onValueChange(next)

			// The move appends the card to the end of the target column.
			const position = targetCol.items.length + 1

			announce(
				`${cardName(containerRef.current, cardId)} moved to ${columnName(containerRef.current, targetCol.id)}, position ${position} of ${position}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onValueChange, findColumnByCardId, refocusCard, containerRef],
	)

	const onCardKeyDown = useCallback(
		(cardId: string, event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			const deps: KanbanKeyDeps = {
				liftedCardId,
				setLiftedCardId,
				containerRef,
				locate,
				focusNeighbor,
				moveWithinColumn,
				moveToColumn,
			}

			if (event.key === ' ') {
				handleCardSpaceToggle(cardId, event, deps)

				return
			}

			if (liftedCardId !== cardId) {
				handleCardNeighborNav(cardId, event, deps)

				return
			}

			handleCardLiftedNav(cardId, event, deps)
		},
		[
			liftedCardId,
			setLiftedCardId,
			moveWithinColumn,
			moveToColumn,
			focusNeighbor,
			locate,
			containerRef,
		],
	)

	return { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur }
}
