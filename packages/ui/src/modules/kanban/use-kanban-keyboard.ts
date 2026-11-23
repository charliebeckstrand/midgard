'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { announce } from '../../core/announcer'
import { querySlot } from '../../core/query-slot'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useKeyboardLifted } from '../../hooks/use-keyboard-lifted'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useIntl } from '../../primitives/intl/use-intl'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import type { KanbanCardMoves, KanbanCardTarget } from './context'
import { describeCard, describeMove } from './engine/kanban-announcements'
import { indexBoard, type KanbanBoard, type KanbanColumnBase } from './engine/kanban-board'
import {
	type KanbanMove,
	moveToColumn,
	stepAcrossColumns,
	stepInColumn,
} from './engine/kanban-move'
import { isNavigationKey, liftedStep, neighborCard } from './engine/kanban-navigation'
import { currentSlot } from './engine/kanban-slot'
import { kanbanNames } from './kanban-names'

/**
 * Not lifted: a navigation key moves the focus to the neighbor card that the
 * engine gives.
 *
 * @internal
 */
function focusNeighbor<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
	key: string,
	event: KeyboardEvent,
	focusCard: (cardId: string) => void,
) {
	if (!isNavigationKey(key)) return

	const target = neighborCard(board, cardId, key)

	if (target === null) return

	event.preventDefault()

	focusCard(target)
}

/**
 * What a lifted card does: drop the lift, or report a move. A board with no
 * `onReorder` has no `commit`.
 *
 * @internal
 */
type KanbanLiftedActions<C> = {
	drop: () => void
	commit: ((move: KanbanMove<C>) => void) | undefined
}

/**
 * Lifted: Escape or Enter drops the card, and an arrow steps it in the column
 * or across the board.
 *
 * @internal
 */
function carryCard<T, C extends KanbanColumnBase<T>>(
	board: KanbanBoard<T, C>,
	cardId: string,
	key: string,
	event: KeyboardEvent,
	{ drop, commit }: KanbanLiftedActions<C>,
) {
	if (key === 'Escape' || key === 'Enter') {
		event.preventDefault()

		drop()

		return
	}

	const step = liftedStep(key)

	if (!step) return

	event.preventDefault()

	if (!commit) return

	const move = step.across
		? stepAcrossColumns(board, cardId, step.direction)
		: stepInColumn(board, cardId, step.direction)

	if (move) commit(move)
}

/**
 * Keyboard reordering and an accessible drag alternative for the {@link Kanban}
 * board (APG grabbed-element pattern). Space lifts a card or drops it, and a
 * live region announces each step. While a card is lifted, the arrow keys move
 * it in its column and across columns. While no card is lifted, the arrow keys,
 * Home, and End move the focus between cards. Emits the next columns
 * through `onReorder`. Returns the lifted-card state and the card
 * `keydown`/`blur` handlers. The handlers keep their identity: `onCardKeyDown`
 * reads the lift and the columns of the last commit through a ref.
 */
export function useKanbanKeyboard<T, C extends KanbanColumnBase<T>>({
	columns,
	getKey,
	onReorder,
	enabled,
	containerRef,
}: {
	columns: C[]
	getKey: (item: T) => string
	onReorder?: (next: C[]) => void
	/** Whether the surface takes a lift. See `useKeyboardLifted`. */
	enabled: boolean
	/** Board root; scopes card lookups so concurrent boards (and the drag overlay clone) don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
}) {
	const intl = useIntl()

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
	} = useKeyboardLifted(focusCard, enabled)

	// A stable event, so that the key handler keeps one identity. With `columns`
	// in its dependencies, the handler, and through it the board context, took a
	// new identity for each move, and each card on the board rendered.
	const onCardKeyDown = useStableEvent((cardId: string, event: KeyboardEvent) => {
		// A key from a control inside the card belongs to that control.
		if (event.target !== event.currentTarget) return

		if (hasBrowserModifier(event) || event.shiftKey) return

		const board = indexBoard(columns, getKey)

		const names = kanbanNames(containerRef)

		// The card's name, its 1-based position, and its column, for announcements.
		const describe = () => describeCard(intl, names, cardId, currentSlot(board, cardId))

		if (event.key === ' ') {
			event.preventDefault()

			// A surface that takes no lift, such as a locked board, ignores Space.
			// The arrows still move the focus between the cards.
			if (enabled) toggleLift(cardId, describe)

			return
		}

		// The columns follow the reading order, so the arrows swap in RTL.
		const key = logicalArrowKey(event.key, containerRef.current)

		// The lift of the last write, not the last render, so a second key in the
		// same tick carries the card that the first one lifted.
		if (readLifted() !== cardId) {
			focusNeighbor(board, cardId, key, event, focusCard)

			return
		}

		carryCard(board, cardId, key, event, {
			drop: () => drop(describe),
			commit:
				onReorder &&
				((move) => {
					onReorder(move.columns)

					announce(describeMove(intl, names, cardId, move.slot), { assertive: true })

					refocusCard(cardId)
				}),
		})
	})

	// The moves that the "Move to" menu of a card offers, read when the menu opens.
	const cardMoves = useStableEvent((cardId: string): KanbanCardMoves => {
		const board = indexBoard(columns, getKey)

		const names = kanbanNames(containerRef)

		const from = board.places.get(cardId)

		return {
			cardName: names.card(cardId),
			up: stepInColumn(board, cardId, -1) !== null,
			down: stepInColumn(board, cardId, 1) !== null,
			columns: board.columns.flatMap((column, index) =>
				index === from?.columnIndex
					? []
					: [{ id: column.id, name: names.column(column.id), position: index + 1 }],
			),
		}
	})

	// A move from the "Move to" menu of a card. It reports the move and announces
	// it as a keyboard step does, and the focus follows the card to its handle. A
	// menu that stays open while a lock arrives starts no move, as the keys do.
	const moveCard = useStableEvent((cardId: string, target: KanbanCardTarget, cardName: string) => {
		if (!onReorder || !enabled) return

		const board = indexBoard(columns, getKey)

		const move =
			'columnId' in target
				? moveToColumn(board, cardId, target.columnId)
				: stepInColumn(board, cardId, target.direction)

		if (!move) return

		onReorder(move.columns)

		const names = { ...kanbanNames(containerRef), card: () => cardName }

		announce(describeMove(intl, names, cardId, move.slot), { assertive: true })

		refocusCard(cardId)
	})

	return { liftedCardId, setLiftedCardId, onCardKeyDown, onCardBlur, cardMoves, moveCard }
}
