'use client'

import { Children, type ComponentProps, isValidElement, type ReactNode } from 'react'
import { Card } from '../../components/card'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'
import { KanbanCardHandle } from './kanban-card-handle'

/** Props for {@link KanbanCardSurface}: the `<div>` attributes of the card. @internal */
export type KanbanCardSurfaceProps = ComponentProps<'div'>

/**
 * The box of a Kanban card: a `Card` with the `surface` fill. It holds each
 * {@link KanbanCardHandle} child at its start edge, and puts its other children
 * in one `content` column beside the handle. The card on the board and its
 * drag overlay both render it, so the overlay has the box of the card.
 *
 * @remarks Client component. A handle aligns only as a direct child of the
 * card. The surface writes the `kanban-card` anchor after the spread, because
 * the move announcements and the keyboard read it.
 *
 * @internal
 */
export function KanbanCardSurface({ children, className, ...props }: KanbanCardSurfaceProps) {
	const items = Children.toArray(children)

	const handles = items.filter(isHandle)

	const content = items.filter((item) => !isHandle(item))

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

/** Whether `node` is a handle element, which the card holds at its start edge. */
const isHandle = (node: ReactNode) => isValidElement(node) && node.type === KanbanCardHandle
