'use client'

import { Columns2, EllipsisVertical } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Icon } from '../../components/icon'
import { MenuMoveButton, placeMoveItems } from '../../components/menu/menu-move'
import type { ReorderMove } from '../../hooks/use-keyboard-reorder'
import { Glyph } from '../../primitives/glyph'
import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { type KanbanCardMoves, useKanbanCardContext, useKanbanContext } from './context'

/** The values that each message of the menu takes. */
type KanbanMenuValues = {
	moveTo: { column: string }
	column: { position: number }
	noMove: Record<never, never>
}

const messages: MessageSet<KanbanMenuValues> = defineMessages<KanbanMenuValues>({
	moveTo: {
		id: 'ui.kanban.moveTo',
		defaultMessage: 'Move to “{column}”',
		description: 'The menu item that moves a Kanban card to the end of another column.',
	},
	column: {
		id: 'ui.kanban.column',
		defaultMessage: 'Column {position, number}',
		description:
			'The name of a Kanban column that has no name of its own, in the move menu of a card, such as "Column 2".',
	},
	noMove: {
		id: 'ui.kanban.noMove',
		defaultMessage: 'No move',
		description:
			'The disabled item of the move menu of a Kanban card when the card has no place to move to.',
	},
})

/** Props for {@link KanbanCardMenu}. The `<button>` that opens the menu takes the rest. */
export type KanbanCardMenuProps = Omit<ComponentProps<'button'>, 'type' | 'color'> & {
	/**
	 * Replaces the accessible name of the button. By default the name is "Move",
	 * followed by the name of the card.
	 * @defaultValue `'Move'`, in the language of the reader.
	 */
	'aria-label'?: string
	/** Content of the button. @defaultValue an ellipsis icon. */
	children?: ComponentProps<'button'>['children']
}

/**
 * The "Move to" menu of a {@link KanbanCard}: a path that moves the card with
 * one pointer and no drag (WCAG 2.2 SC 2.5.7). The menu offers "Move up" and
 * "Move down" in the column, and "Move to" for each other column, which puts
 * the card at the end of that column.
 *
 * @remarks
 * Client component. Put it in a card, beside the {@link KanbanCardHandle}. A
 * move from the menu goes through `onReorder`, and the live region announces it
 * as a keyboard step does. The focus then goes to the handle of the card. On a
 * board with no `onReorder`, the menu renders nothing. A disabled board keeps
 * an inert button with no menu, so the cards keep their size. A column with no name
 * takes its position in the menu, such as "Column 2". A card with no place to
 * move to shows one disabled "No move" item.
 */
export function KanbanCardMenu({
	'aria-label': ariaLabel,
	children,
	className,
	...props
}: KanbanCardMenuProps) {
	const intl = useIntl()

	const { interactive, disabled, cardMoves, moveCard } = useKanbanContext()

	const card = useKanbanCardContext()

	const content = children ?? <Icon icon={EllipsisVertical} size="sm" />

	// The drag overlay has no card context. It copies the button with no menu, so
	// the clone keeps the box of the card. A disabled board keeps the same inert
	// button, as it keeps a muted grip, so the cards do not change size.
	const still = !card || disabled

	if (!still && !interactive) return null

	const columnLabel = (column: KanbanCardMoves['columns'][number]) =>
		column.name || intl.formatMessage(messages.column, { position: column.position })

	// The menu reads the board when it opens, so a closed menu renders no item.
	const read = () => {
		if (!card) return []

		const { cardId } = card

		const moves = cardMoves(cardId)

		const places: ReorderMove[] = [
			...(moves.up ? (['previous'] as const) : []),
			...(moves.down ? (['next'] as const) : []),
		]

		const columns = moves.columns.map((column) => ({
			key: column.id,
			label: intl.formatMessage(messages.moveTo, { column: columnLabel(column) }),
			icon: <Glyph icon={Columns2} />,
			onAction: () => moveCard(cardId, { columnId: column.id }, moves.cardName),
		}))

		return [
			[
				...placeMoveItems(intl, places, { orientation: 'vertical', rtl: false }, (move) =>
					moveCard(cardId, { direction: move === 'previous' ? -1 : 1 }, moves.cardName),
				),
				...columns,
			],
		]
	}

	return (
		<MenuMoveButton
			{...props}
			slot="kanban-card-menu"
			// "Move" and then the name of the card item.
			nameId={card?.itemId}
			still={still}
			read={read}
			empty={intl.formatMessage(messages.noMove)}
			aria-label={ariaLabel}
			className={className}
		>
			{content}
		</MenuMoveButton>
	)
}
