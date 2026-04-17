'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useSortableItem } from '../../hooks'
import { useKanbanColumnContext, useKanbanContext } from './context'
import { k } from './variants'

export type KanbanCardProps = {
	/** Stable id matching an entry in the parent column's `items`. */
	cardId: string
	/** Accessible label announced by screen readers. */
	'aria-label'?: string
	children?: ReactNode
	className?: string
}

export function KanbanCard({
	cardId,
	'aria-label': ariaLabel = 'Drag to reorder',
	children,
	className,
}: KanbanCardProps) {
	const { interactive, overlayMap } = useKanbanContext()

	// Surface referenced for narrowing — column scope is maintained for future use.
	useKanbanColumnContext()

	const { setNodeRef, attributes, listeners, style, isDragging } = useSortableItem({
		id: cardId,
		disabled: !interactive,
	})

	// Keep the drag-overlay content in sync with the card's latest children.
	if (interactive) overlayMap.current.set(cardId, children)

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is provided by dnd-kit's spread attributes
		<div
			ref={interactive ? setNodeRef : undefined}
			style={interactive ? style : undefined}
			{...(interactive ? attributes : {})}
			{...(interactive ? listeners : {})}
			aria-label={interactive ? ariaLabel : undefined}
			data-slot="kanban-card"
			data-card-id={cardId}
			data-active={isDragging || undefined}
			data-disabled={!interactive || undefined}
			className={cn(
				k.card,
				interactive && k.cardDraggable,
				isDragging && k.cardDragging,
				className,
			)}
		>
			{children}
		</div>
	)
}
