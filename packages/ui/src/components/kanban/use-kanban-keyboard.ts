'use client'

import { arrayMove } from '@dnd-kit/sortable'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { announce, querySlot } from '../../core'
import { useKeyboardLifted } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useStableEvent } from '../../hooks/use-stable-event'
import {
	cardName,
	columnName,
	currentSlot,
	describeCard,
	kanbanNames,
} from './kanban-announcements'
import type { KanbanColumnBase } from './types'

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
	drop: (describe: () => string) => void
	describe: (cardId: string) => string
	focusNeighbor: (cardId: string, key: NeighborKey) => boolean
	moveWithinColumn: (cardId: string, direction: -1 | 1) => void
	moveToColumn: (cardId: string, direction: -1 | 1) => void
}

/** Not lifted: arrows/Home/End move focus between cards. @internal */
function handleCardNeighborNav(
	cardId: string,
	event: KeyboardEvent,
	key: string,
	deps: KanbanKeyDeps,
) {
	switch (key) {
		case 'ArrowUp':
		case 'ArrowDown':
		case 'ArrowLeft':
		case 'ArrowRight':
		case 'Home':
		case 'End':
			if (deps.focusNeighbor(cardId, key)) event.preventDefault()

			break
	}
}

/** Arrow → the lifted-card move it performs: within the column for Up/Down, across columns for Left/Right. @internal */
const LIFTED_MOVES: Record<string, ['moveWithinColumn' | 'moveToColumn', -1 | 1]> = {
	ArrowUp: ['moveWithinColumn', -1],
	ArrowDown: ['moveWithinColumn', 1],
	ArrowLeft: ['moveToColumn', -1],
	ArrowRight: ['moveToColumn', 1],
}

/** Lifted: Escape/Enter drops, arrows reorder the lifted card across columns. @internal */
function handleCardLiftedNav(
	cardId: string,
	event: KeyboardEvent,
	key: string,
	deps: KanbanKeyDeps,
) {
	if (key === 'Escape' || key === 'Enter') {
		event.preventDefault()

		deps.drop(() => deps.describe(cardId))

		return
	}

	const move = LIFTED_MOVES[key]

	if (!move) return

	event.preventDefault()

	const [method, direction] = move

	deps[method](cardId, direction)
}

/**
 * Keyboard reordering and an accessible drag alternative for the {@link Kanban}
 * board (APG grabbed-element pattern). Space lifts/drops a card with live-region
 * announcements; while lifted, arrows move it within and across columns; while
 * not lifted, arrows/Home/End move focus between cards. Emits the next columns
 * through `onReorder`. Returns the lifted-card state and the card
 * `keydown`/`blur` handlers. The handlers keep their identity: `onCardKeyDown`
 * reads the lift and the columns of the last commit through a ref.
 */
export function useKanbanKeyboard<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onReorder,
	containerRef,
}: {
	columns: C[]
	getKey: (item: T) => string
	onReorder?: (next: C[]) => void
	/** Board root; scopes card lookups so concurrent boards (and the drag overlay clone) don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
}) {
	// The handle is the keyboard stop of a card.
	const focusCard = useCallback(
		(cardId: string) => {
			querySlot(containerRef.current, 'kanban-card-handle', 'card-id', cardId)?.focus()
		},
		[containerRef],
	)

	const {
		liftedId: liftedCardId,
		readLifted,
		setLiftedId: setLiftedCardId,
		toggleLift,
		drop,
		refocus: refocusCard,
		onBlur: onCardBlur,
	} = useKeyboardLifted(focusCard)

	const findColumnByCardId = useCallback(
		(id: string) => columns.find((c) => c.items.some((i) => getKey(i) === id)),
		[columns, getKey],
	)

	// The card's name, its 1-based position, and its column, for announcements.
	const describe = useCallback(
		(cardId: string) => {
			return describeCard(kanbanNames(containerRef), cardId, currentSlot(columns, getKey, cardId))
		},
		[columns, getKey, containerRef],
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
			if (!onReorder) return

			const col = findColumnByCardId(cardId)

			if (!col) return

			const idx = col.items.findIndex((i) => getKey(i) === cardId)

			const newIdx = idx + direction

			if (newIdx < 0 || newIdx >= col.items.length) return

			const nextItems = arrayMove(col.items, idx, newIdx)

			onReorder(columns.map((c) => (c.id === col.id ? { ...c, items: nextItems } : c)) as C[])

			announce(
				`${cardName(containerRef.current, cardId)} moved to position ${newIdx + 1} of ${col.items.length} in ${columnName(containerRef.current, col.id)}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onReorder, findColumnByCardId, refocusCard, containerRef],
	)

	const moveToColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onReorder) return

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

			onReorder(next)

			// The move appends the card to the end of the target column.
			const position = targetCol.items.length + 1

			announce(
				`${cardName(containerRef.current, cardId)} moved to ${columnName(containerRef.current, targetCol.id)}, position ${position} of ${position}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onReorder, findColumnByCardId, refocusCard, containerRef],
	)

	// A stable event, so that the key handler keeps one identity. With `columns`
	// in its dependencies, the handler, and through it the board context, took a
	// new identity for each move, and each card on the board rendered.
	const onCardKeyDown = useStableEvent((cardId: string, event: KeyboardEvent) => {
		// A key from a control inside the card belongs to that control.
		if (event.target !== event.currentTarget) return

		if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

		const deps: KanbanKeyDeps = {
			drop,
			describe,
			focusNeighbor,
			moveWithinColumn,
			moveToColumn,
		}

		if (event.key === ' ') {
			event.preventDefault()

			toggleLift(cardId, () => describe(cardId))

			return
		}

		// The columns follow the reading order, so the arrows swap in RTL.
		const key = logicalArrowKey(event.key, containerRef.current)

		if (readLifted() !== cardId) {
			handleCardNeighborNav(cardId, event, key, deps)

			return
		}

		handleCardLiftedNav(cardId, event, key, deps)
	})

	return { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur }
}
