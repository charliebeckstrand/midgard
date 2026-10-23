'use client'

import type { ComponentProps } from 'react'
import { Card } from '../../components/card'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { partitionByType } from '../../utilities/children'
import { KanbanCardHandle } from './kanban-card-handle'

/** Props for {@link KanbanCardSurface}: the `<div>` attributes of the card. @internal */
export type KanbanCardSurfaceProps = ComponentProps<'div'>

/**
 * The box of a Kanban card: a `Card` with the `surface` fill. It holds each
 * {@link KanbanCardHandle} child at its start edge, and puts its other children
 * in one `content` column beside the handle. The card on the board and its
 * drag overlay both render it, so the overlay has the box of the card.
 *
 * @remarks Client component. A handle aligns as a child of the card, also
 * inside a Fragment. The surface writes the `kanban-card` anchor after the
 * spread, because the move announcements and the keyboard read it.
 *
 * @internal
 */
export function KanbanCardSurface({ children, className, ...props }: KanbanCardSurfaceProps) {
	const { matched: handles, rest } = partitionByType(children, KanbanCardHandle)

	// A `false` or `null` slot renders nothing, so it opens no content column.
	const content = rest.filter((node) => node != null)

	return (
		<Card {...props} bg="surface" data-slot="kanban-card" className={cn(k().card.base, className)}>
			{handles}
			{content.length > 0 ? (
				<div data-slot="kanban-card-content" className={k().card.content}>
					{content}
				</div>
			) : null}
		</Card>
	)
}
