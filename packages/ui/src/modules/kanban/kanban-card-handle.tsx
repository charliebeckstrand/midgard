'use client'

import { GripVertical } from 'lucide-react'
import { type HTMLAttributes, type ReactNode, useEffect, useId } from 'react'
import { Icon } from '../../components/icon'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { SortableGrip } from '../../primitives/sortable-grip/sortable-grip'
import { k } from '../../recipes/kata/kanban'
import { useKanbanCardContext, useKanbanContext } from './context'

const messages = defineMessages({
	drag: {
		id: 'ui.kanban.drag',
		defaultMessage: 'Drag',
		description:
			'The first word of the name of the drag handle of a Kanban card. The name of the card follows it.',
	},
})

/**
 * Props for {@link KanbanCardHandle}: optional handle content and an accessible-name override.
 * The handle takes the rest: a `<button>` on an interactive board, or else a `<span>`.
 */
export type KanbanCardHandleProps = HTMLAttributes<HTMLElement> & {
	/**
	 * Replaces the accessible name of the handle. By default the name is "Drag",
	 * followed by the name of the card: the `aria-label` of the card, or else
	 * the text of the card.
	 * @defaultValue `'Drag'`, in the language of the reader.
	 */
	'aria-label'?: string
	/** Content of the handle. @defaultValue a grip icon. */
	children?: ReactNode
}

/**
 * Drag handle of a {@link KanbanCard}: the keyboard stop of the card. On an
 * interactive board it is a `<button>` that takes the dnd-kit activator, the
 * pointer listeners, the drag instructions, and the keyboard lift. It is the
 * only part of the card that starts a drag, and the rest of the card scrolls
 * under a finger. The card holds the handle at its start edge, centered on
 * the height of the card, beside its other children.
 *
 * @remarks
 * Client component. Put one handle in each card. The card itself has no role
 * and no tab stop, so a control or a link inside the card keeps its own role.
 * A card with no handle on an interactive board has no keyboard access, and it
 * warns in development. On a disabled board, and in the drag overlay, the
 * handle renders as a picture with no role. On a read-only board (no
 * `onReorder`) it renders nothing, because the cards have no order to change.
 */
export function KanbanCardHandle({
	'aria-label': ariaLabel,
	children,
	className,
	onKeyDown,
	onBlur,
	...props
}: KanbanCardHandleProps) {
	const intl = useIntl()

	const { interactive, disabled, onCardKeyDown, onCardBlur } = useKanbanContext()

	const card = useKanbanCardContext()

	const handleId = useId()

	const registerHandle = card?.registerHandle

	useEffect(() => registerHandle?.(), [registerHandle])

	const content = children ?? <Icon icon={<GripVertical />} size="sm" />

	// A board that cannot reorder shows no grip. A disabled board keeps a muted one.
	if (card && !interactive && !disabled) return null

	if (!card || !interactive) {
		return (
			<span
				onKeyDown={onKeyDown}
				onBlur={onBlur}
				{...props}
				aria-hidden="true"
				// The card selects the handle by this slot, so it comes after the spread.
				data-slot="kanban-card-handle"
				// The drag overlay has no card context, and it shows the held hand.
				data-dragging={dataAttr(!card)}
				data-disabled={dataAttr(!!card && disabled)}
				className={cn(k().card.handle, className)}
			>
				{content}
			</span>
		)
	}

	const { cardId, setActivatorNodeRef, attributes, listeners, dragging, lifted, itemId } = card

	return (
		<SortableGrip
			{...props}
			// The card and the keyboard select the handle by this slot, so it comes after the spread.
			data-slot="kanban-card-handle"
			sortable={{ setActivatorNodeRef, attributes, listeners, dragging }}
			id={handleId}
			// "Drag" and then the name of the card item. An explicit name replaces both.
			label={ariaLabel ?? intl.formatMessage(messages.drag)}
			aria-labelledby={
				props['aria-labelledby'] ?? (ariaLabel ? undefined : `${handleId} ${itemId}`)
			}
			onKeyDown={composeEventHandlers(onKeyDown, (event) => onCardKeyDown(cardId, event))}
			onBlur={composeEventHandlers(onBlur, onCardBlur)}
			data-card-id={cardId}
			className={cn(k({ lifted }).card.handle, className)}
		>
			{content}
		</SortableGrip>
	)
}
