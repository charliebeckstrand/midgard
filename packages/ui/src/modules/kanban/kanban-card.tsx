'use client'

import { type ComponentProps, memo, useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { useSortableItem } from '../../hooks'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import { k } from '../../recipes/kata/kanban'
import { KanbanCardContext, useKanbanColumnContext, useKanbanContext } from './context'
import { KanbanCardSurface } from './kanban-card-surface'

/**
 * Props for {@link KanbanCard}: the `value` matching a parent-column item, with
 * an optional accessible-name override. The `<li>` of the card takes the rest.
 * The `className` goes on the card, the `Card` inside the `<li>`. The drag
 * overlay copies the `className` of the card.
 */
export type KanbanCardProps = Omit<ComponentProps<'li'>, 'value'> & {
	/** Stable key matching an entry in the parent column's `items`; the keyed-child `value` every compound in the library takes. */
	value: string
	/**
	 * Overrides the card's accessible name on each arm of the board. By default
	 * the card is named by its own content. The name goes on the `<li>` of the
	 * card, and on an interactive board the {@link KanbanCardHandle} reads it.
	 * Only set this when the content doesn't yield a usable name.
	 */
	'aria-label'?: string
}

/**
 * Draggable card within a {@link KanbanColumn}, keyed by `value`. Wires the
 * `@dnd-kit` sortable bindings when the board is interactive, gives the keyboard
 * bindings to its {@link KanbanCardHandle}, and mirrors its content into the
 * drag overlay. Renders inert when the board is read-only.
 *
 * @remarks
 * Client component. The card is a list item of the `<ul>` of its column body.
 * Each card is a `Card` with the `surface` fill inside its `<li>`, with no
 * role and no tab stop. A control or a link inside the card thus keeps its own
 * role. Only the {@link KanbanCardHandle} starts a drag: a mouse or a finger on
 * the rest of the card selects text and scrolls. The handle also takes the drag
 * instructions and the keyboard lift. The card holds a handle child at its
 * start edge, centered on its height, and puts its other children in one
 * column beside it. An interactive card with no handle warns in development. Set
 * `aria-label` only when the content yields no usable name. Memoized: the card
 * reads only the card-facing {@link KanbanContext}, so a pointer drag doesn't
 * re-render the whole board.
 */
function KanbanCardImpl({ value: cardId, id, children, className, ...props }: KanbanCardProps) {
	const { interactive, disabled, liftedStore, overlayMap } = useKanbanContext()

	// Surfaces the column context for use within this card.
	const { itemIds } = useKanbanColumnContext()

	// The board's other unjoined key. A card key its column's `items` does not
	// hold drags nowhere: `onReorder` computes the next columns from the data,
	// which never held it.
	useDevWarning(
		!itemIds.includes(cardId),
		`Kanban: <KanbanCard value="${cardId}"> names no item in its column's \`items\`. The card renders and never reorders.`,
	)

	const { setNodeRef, setActivatorNodeRef, attributes, listeners, style, dragging } =
		useSortableItem({
			id: cardId,
			disabled: !interactive,
		})

	const generatedId = useId()

	// The handle names itself through this id, so a consumer `id` takes its place.
	const itemId = id ?? generatedId

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
			`Kanban: <KanbanCard value="${cardId}"> holds no <KanbanCardHandle>. No pointer and no key can move the card.`,
		)
	}, [interactive, cardId])

	// The card reads its own lift, so a lift renders only the cards that lift and drop.
	const lifted = useKeyedValue(liftedStore, cardId)

	const cardValue = useMemo(
		() => ({
			cardId,
			setActivatorNodeRef,
			attributes,
			listeners,
			dragging,
			lifted,
			itemId,
			registerHandle,
		}),
		[cardId, setActivatorNodeRef, attributes, listeners, dragging, lifted, itemId, registerHandle],
	)

	// Keep the drag-overlay content and className in sync with the card's latest props.
	// Runs post-commit (not in render) so it stays pure under concurrent/StrictMode;
	// the map is populated at mount, well before any drag reads it.
	useEffect(() => {
		if (interactive) overlayMap.current.set(cardId, { children, className })

		// Drop the entry when the card unmounts (deleted, or moved off the board)
		// so the map can't grow unbounded across the board's lifetime. A card moved
		// across columns re-sets its own entry on remount within the same effect
		// flush (cleanup runs before setup), so the overlay never sees a gap.
		return () => {
			overlayMap.current.delete(cardId)
		}
	}, [interactive, cardId, children, className, overlayMap])

	// A read-only or disabled card takes no drag bindings. The list item carries
	// the name, and the handle reads it. The drag attributes, the pointer
	// listeners, and the keys go on the handle, so the card adds no role over its
	// content and keeps its touch scrolling.
	const surface = interactive ? (
		<KanbanCardSurface
			ref={setNodeRef}
			style={style}
			data-card-id={cardId}
			data-dragging={dataAttr(dragging)}
			data-lifted={dataAttr(lifted)}
			className={cn(lifted && k().card.lifted, className)}
		>
			{children}
		</KanbanCardSurface>
	) : (
		<KanbanCardSurface
			data-card-id={cardId}
			data-disabled={dataAttr(disabled)}
			data-readonly={dataAttr(!disabled)}
			className={className}
		>
			{children}
		</KanbanCardSurface>
	)

	return (
		<KanbanCardContext value={cardValue}>
			<li data-slot="kanban-card-item" {...props} id={itemId}>
				{surface}
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
