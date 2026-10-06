'use client'

import { memo, type ReactNode, useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { useSortableItem } from '../../hooks'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import { k } from '../../recipes/kata/kanban'
import { KanbanCardContext, useKanbanColumnContext, useKanbanContext } from './context'

/** Props for {@link KanbanCard}: the `value` matching a parent-column item, with an optional accessible-name override. */
export type KanbanCardProps = {
	/** Stable key matching an entry in the parent column's `items`; the keyed-child `value` every compound in the library takes. */
	value: string
	/**
	 * Overrides the card's accessible name on each arm of the board. By default
	 * the card is named by its own content. On an interactive board, the name
	 * goes on the `<li>` of the card, and the {@link KanbanCardHandle} reads it.
	 * Only set this when the content doesn't yield a usable name.
	 */
	'aria-label'?: string
	children?: ReactNode
	className?: string
}

/**
 * Draggable card within a {@link KanbanColumn}, keyed by `value`. Wires the
 * `@dnd-kit` sortable bindings when the board is interactive, gives the keyboard
 * bindings to its {@link KanbanCardHandle}, and mirrors its content into the
 * drag overlay. Renders inert when the board is read-only.
 *
 * @remarks
 * Client component. The card is a list item of the `<ul>` of its column body.
 * A read-only or disabled card is the `<li>` itself. An interactive card is a
 * `<div>` inside its `<li>`, with no role and no tab stop. A control or a link
 * inside the card thus keeps its own role. A mouse drags the card from any
 * part of it. A finger on the card scrolls, and a finger on the
 * {@link KanbanCardHandle} drags. The keyboard reaches the card through its
 * handle, which takes the drag instructions and the keyboard lift. An
 * interactive card with no handle warns in development. Set
 * `aria-label` only when the content yields no usable name. Memoized: the card
 * reads only the card-facing {@link KanbanContext}, so a pointer drag doesn't
 * re-render the whole board.
 */
function KanbanCardImpl({
	value: cardId,
	'aria-label': ariaLabel,
	children,
	className,
}: KanbanCardProps) {
	const { interactive, disabled, liftedStore, overlayMap } = useKanbanContext()

	// Surfaces the column context for use within this card.
	const { itemIds } = useKanbanColumnContext()

	// The board's other unjoined key. A card key its column's `items` does not
	// hold drags nowhere: `onReorder` computes the next columns from the data,
	// which never held it.
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (itemIds.includes(cardId)) return

		console.warn(
			`Kanban: <KanbanCard value="${cardId}"> names no item in its column's \`items\`. The card renders and never reorders.`,
		)
	}, [cardId, itemIds])

	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useSortableItem({
			id: cardId,
			disabled: !interactive,
		})

	const itemId = useId()

	// The handles that are mounted in the card. A handle registers in its own
	// effect, which runs before the effect of the card.
	const handleCount = useRef(0)

	const registerHandle = useCallback(() => {
		handleCount.current += 1

		return () => {
			handleCount.current -= 1
		}
	}, [])

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!interactive || handleCount.current > 0) return

		console.warn(
			`Kanban: <KanbanCard value="${cardId}"> holds no <KanbanCardHandle>. A mouse drags the card, but a finger and the keyboard cannot.`,
		)
	}, [interactive, cardId])

	const cardValue = useMemo(
		() => ({
			cardId,
			interactive,
			setActivatorNodeRef,
			attributes,
			dragging,
			itemId,
			registerHandle,
		}),
		[cardId, interactive, setActivatorNodeRef, attributes, dragging, itemId, registerHandle],
	)

	// The card reads its own lift, so a lift renders only the cards that lift and drop.
	const lifted = useKeyedValue(liftedStore, cardId)

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

	const cardClassName = cn(
		k.card.base,
		interactive && k.card.draggable,
		lifted && k.card.lifted,
		className,
	)

	// A read-only or disabled card is the list item itself.
	if (!interactive) {
		return (
			<KanbanCardContext value={cardValue}>
				<li
					aria-label={ariaLabel}
					data-slot="kanban-card"
					data-card-id={cardId}
					data-disabled={dataAttr(disabled)}
					data-readonly={dataAttr(!disabled)}
					className={cardClassName}
				>
					{children}
				</li>
			</KanbanCardContext>
		)
	}

	// The list item carries the name, and the handle reads it. The dnd-kit node
	// takes only the pointer listeners: the drag attributes and the keys go on
	// the handle, so the card adds no role over its content.
	return (
		<KanbanCardContext value={cardValue}>
			<li id={itemId} aria-label={ariaLabel} data-slot="kanban-card-item">
				<div
					ref={setNodeRef}
					style={style}
					{...listeners}
					data-slot="kanban-card"
					data-card-id={cardId}
					data-dragging={dataAttr(dragging)}
					data-lifted={dataAttr(lifted)}
					className={cardClassName}
				>
					{children}
				</div>
			</li>
		</KanbanCardContext>
	)
}

/**
 * Draggable card within a {@link KanbanColumn}. See {@link KanbanCardImpl}.
 * Memoized so a card re-renders only when its own props or card-facing context
 * change, not on every pointer-drag move elsewhere on the board.
 */
export const KanbanCard = memo(KanbanCardImpl)
