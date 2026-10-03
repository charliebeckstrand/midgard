'use client'

import { memo, type ReactNode, useEffect } from 'react'
import { cn, dataAttr } from '../../core'
import { useSortableItem } from '../../hooks'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import { k } from '../../recipes/kata/kanban'
import { useKanbanColumnContext, useKanbanContext } from './context'

/** Props for {@link KanbanCard}: the `value` matching a parent-column item, with an optional accessible-name override. */
export type KanbanCardProps = {
	/** Stable key matching an entry in the parent column's `items`; the keyed-child `value` every compound in the library takes. */
	value: string
	/**
	 * Overrides the card's accessible name on each arm of the board. By default
	 * the card is named by its own content; dnd-kit already announces draggability
	 * (`aria-roledescription`) and keyboard instructions (`aria-describedby`).
	 * Only set this when the content doesn't yield a usable name.
	 */
	'aria-label'?: string
	children?: ReactNode
	className?: string
}

/**
 * Draggable card within a {@link KanbanColumn}, keyed by `value`. Wires
 * `@dnd-kit` sortable bindings and the board's keyboard handlers when the board
 * is interactive, and mirrors its content into the drag overlay. Renders inert
 * when the board is read-only.
 *
 * @remarks
 * Client component. Drag affordances (`role`, `aria-roledescription`,
 * keyboard instructions) come from dnd-kit; set `aria-label` only when the
 * content yields no usable name. A read-only or disabled card is an `<li>` in
 * the `<ul>` of its column body, so the name stays valid there too. ARIA
 * prohibits a name on an element with no role. An interactive card is a `<div>`
 * inside an `<li>`, because an `<li>` takes no `button` role. The card keys act
 * only on the card itself, so a control inside the card keeps Space and the
 * arrow keys. Memoized: the card reads only the card-facing
 * {@link KanbanContext}, so a pointer drag doesn't re-render the whole board.
 */
function KanbanCardImpl({
	value: cardId,
	'aria-label': ariaLabel,
	children,
	className,
}: KanbanCardProps) {
	const { interactive, disabled, liftedStore, overlayMap, onCardKeyDown, onCardBlur } =
		useKanbanContext()

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

	const { setNodeRef, attributes, listeners, style, dragging } = useSortableItem({
		id: cardId,
		disabled: !interactive,
	})

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
		dragging && k.card.dragging,
		lifted && k.card.lifted,
		className,
	)

	// A read-only or disabled card is the list item itself.
	if (!interactive) {
		return (
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
		)
	}

	// An `li` takes no `button` role, so the dnd-kit node is a `div` inside the list item.
	return (
		<li data-slot="kanban-card-item">
			{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is provided by dnd-kit's spread attributes */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: role="button" is provided by dnd-kit's spread attributes */}
			<div
				ref={setNodeRef}
				style={style}
				{...attributes}
				{...listeners}
				onKeyDown={(event) => onCardKeyDown(cardId, event)}
				onBlur={onCardBlur}
				aria-label={ariaLabel}
				data-slot="kanban-card"
				data-card-id={cardId}
				data-dragging={dataAttr(dragging)}
				data-lifted={dataAttr(lifted)}
				className={cardClassName}
			>
				{children}
			</div>
		</li>
	)
}

/**
 * Draggable card within a {@link KanbanColumn}. See {@link KanbanCardImpl}.
 * Memoized so a card re-renders only when its own props or card-facing context
 * change, not on every pointer-drag move elsewhere on the board.
 */
export const KanbanCard = memo(KanbanCardImpl)
