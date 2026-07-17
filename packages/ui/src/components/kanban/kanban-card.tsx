'use client'

import { memo, type ReactNode, useEffect } from 'react'
import { cn, dataAttr } from '../../core'
import { useSortableItem } from '../../hooks'
import { k } from '../../recipes/kata/kanban'
import { useKanbanColumnContext, useKanbanContext } from './context'

/** Props for {@link KanbanCard}: the `cardId` matching a parent-column item, with an optional accessible-name override. */
export type KanbanCardProps = {
	/** Stable id matching an entry in the parent column's `items`. */
	cardId: string
	/**
	 * Overrides the card's accessible name. By default the card is named by its
	 * own content; dnd-kit already announces draggability (`aria-roledescription`)
	 * and keyboard instructions (`aria-describedby`). Only set this when the
	 * content doesn't yield a usable name.
	 */
	'aria-label'?: string
	children?: ReactNode
	className?: string
}

/**
 * Draggable card within a {@link KanbanColumn}, keyed by `cardId`. Wires
 * `@dnd-kit` sortable bindings and the board's keyboard handlers when the board
 * is interactive, and mirrors its content into the drag overlay; renders inert
 * when the board is read-only.
 *
 * @remarks
 * Client component. Drag affordances (`role`, `aria-roledescription`,
 * keyboard instructions) come from dnd-kit; set `aria-label` only when the
 * content yields no usable name. Memoized: the card reads only the card-facing
 * {@link KanbanContext}, so a pointer drag doesn't re-render the whole board.
 */
function KanbanCardImpl({ cardId, 'aria-label': ariaLabel, children, className }: KanbanCardProps) {
	const { interactive, disabled, liftedCardId, overlayMap, onCardKeyDown, onCardBlur } =
		useKanbanContext()

	// Surfaces the column context for use within this card.
	useKanbanColumnContext()

	const { setNodeRef, attributes, listeners, style, dragging } = useSortableItem({
		id: cardId,
		disabled: !interactive,
	})

	const lifted = liftedCardId === cardId

	// Keep the drag-overlay content in sync with the card's latest children.
	// Runs post-commit (not in render) so it stays pure under concurrent/StrictMode;
	// the map is populated at mount, well before any drag reads it.
	useEffect(() => {
		if (interactive) overlayMap.current.set(cardId, children)

		// Drop the entry when the card unmounts (deleted, or moved off the board)
		// so the map can't grow unbounded across the board's lifetime. A card moved
		// across columns re-sets its own entry on remount within the same effect
		// flush (cleanup runs before setup), so the overlay never sees a gap.
		return () => {
			overlayMap.current.delete(cardId)
		}
	}, [interactive, cardId, children, overlayMap])

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is provided by dnd-kit's spread attributes
		// biome-ignore lint/a11y/noStaticElementInteractions: role="button" is provided by dnd-kit's spread attributes
		<div
			ref={interactive ? setNodeRef : undefined}
			style={interactive ? style : undefined}
			{...(interactive ? attributes : {})}
			{...(interactive ? listeners : {})}
			onKeyDown={interactive ? (event) => onCardKeyDown(cardId, event) : undefined}
			onBlur={interactive ? onCardBlur : undefined}
			aria-label={interactive ? ariaLabel : undefined}
			data-slot="kanban-card"
			data-card-id={cardId}
			data-active={dataAttr(dragging)}
			data-lifted={dataAttr(lifted)}
			data-disabled={dataAttr(disabled)}
			data-readonly={dataAttr(!interactive && !disabled)}
			className={cn(
				k.card.base,
				interactive && k.card.draggable,
				dragging && k.card.dragging,
				lifted && k.card.lifted,
				className,
			)}
		>
			{children}
		</div>
	)
}

/**
 * Draggable card within a {@link KanbanColumn}. See {@link KanbanCardImpl}.
 * Memoized so a card re-renders only when its own props or card-facing context
 * change, not on every pointer-drag move elsewhere on the board.
 */
export const KanbanCard = memo(KanbanCardImpl)
