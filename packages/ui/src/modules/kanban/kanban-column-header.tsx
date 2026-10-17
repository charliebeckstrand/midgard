'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/kanban'

/** Props for {@link KanbanColumnHeader}. The `<div>` of the header row takes the rest. */
export type KanbanColumnHeaderProps = ComponentProps<'div'>

/**
 * Header row of a {@link KanbanColumn}; holds the column title and any per-column controls.
 *
 * @remarks The move announcements read the `kanban-column-header` anchor, so
 * it comes after the consumer props.
 */
export function KanbanColumnHeader({ children, className, ...props }: KanbanColumnHeaderProps) {
	return (
		<div {...props} data-slot="kanban-column-header" className={cn(k.column.header, className)}>
			{children}
		</div>
	)
}
