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
	columnIndex: number,
	itemIndex: number,
	key: 'ArrowLeft' | 'ArrowRight',
): { col: C; idx: number } | null {
	const direction = key === 'ArrowLeft' ? -1 : 1

	let nextColumnIndex = columnIndex + direction

	while (nextColumnIndex >= 0 && nextColumnIndex < columns.length) {
		const nextColumn = columns[nextColumnIndex]

		if (nextColumn && nextColumn.items.length > 0) {
			return { col: nextColumn, idx: Math.min(itemIndex, nextColumn.items.length - 1) }
		}

		nextColumnIndex += direction
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
	columnIndex: number,
	col: C,
	itemIndex: number,
	key: NeighborKey,
): { col: C; idx: number } | null {
	switch (key) {
		case 'ArrowUp':
			return { col, idx: itemIndex - 1 }
		case 'ArrowDown':
			return { col, idx: itemIndex + 1 }
		case 'Home':
			return { col, idx: 0 }
		case 'End':
			return { col, idx: col.items.length - 1 }
		default:
			return resolveCrossColumn<T, C>(columns, columnIndex, itemIndex, key)
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
		(id: string) => columns.find((column) => column.items.some((item) => getKey(item) === id)),
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
			const columnIndex = columns.findIndex((column) =>
				column.items.some((item) => getKey(item) === cardId),
			)

			if (columnIndex === -1) return false

			const column = columns[columnIndex]

			if (!column) return false

			const itemIndex = column.items.findIndex((item) => getKey(item) === cardId)

			const target = resolveNeighborTarget(columns, columnIndex, column, itemIndex, key)

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

			const column = findColumnByCardId(cardId)

			if (!column) return

			const index = column.items.findIndex((item) => getKey(item) === cardId)

			const targetIndex = index + direction

			if (targetIndex < 0 || targetIndex >= column.items.length) return

			const nextItems = arrayMove(column.items, index, targetIndex)

			onReorder(
				columns.map((entry) =>
					entry.id === column.id ? { ...entry, items: nextItems } : entry,
				) as C[],
			)

			announce(
				`${cardName(containerRef.current, cardId)} moved to position ${targetIndex + 1} of ${column.items.length} in ${columnName(containerRef.current, column.id)}.`,
				{ assertive: true },
			)

			refocusCard(cardId)
		},
		[columns, getKey, onReorder, findColumnByCardId, refocusCard, containerRef],
	)

	const moveToColumn = useCallback(
		(cardId: string, direction: -1 | 1) => {
			if (!onReorder) return

			const column = findColumnByCardId(cardId)

			if (!column) return

			const columnIndex = columns.findIndex((entry) => entry.id === column.id)

			const targetIndex = columnIndex + direction

			if (targetIndex < 0 || targetIndex >= columns.length) return

			const targetColumn = columns[targetIndex]

			if (!targetColumn) return

			const itemIndex = column.items.findIndex((card) => getKey(card) === cardId)

			if (itemIndex === -1) return

			const item = column.items[itemIndex]

			if (item === undefined) return

			const next = columns.map((entry) => {
				if (entry.id === column.id) {
					return { ...entry, items: entry.items.filter((_, index) => index !== itemIndex) }
				}

				if (entry.id === targetColumn.id) return { ...entry, items: [...entry.items, item] }

				return entry
			}) as C[]

			onReorder(next)

			// The move appends the card to the end of the target column.
			const position = targetColumn.items.length + 1

			announce(
				`${cardName(containerRef.current, cardId)} moved to ${columnName(containerRef.current, targetColumn.id)}, position ${position} of ${position}.`,
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
