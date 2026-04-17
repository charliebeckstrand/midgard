'use client'

import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Icon } from '../icon'
import { useListContext, useListItemContext } from './context'
import { k } from './variants'

// ── ListHandle ─────────────────────────────────────────

export type ListHandleProps = {
	/** Accessible label announced by screen readers. */
	'aria-label'?: string
	children?: ReactNode
	className?: string
}

export function ListHandle({
	'aria-label': ariaLabel = 'Drag to reorder',
	children,
	className,
}: ListHandleProps) {
	const { interactive } = useListContext()

	const { attributes, listeners, setActivatorNodeRef } = useListItemContext()

	return (
		<button
			ref={setActivatorNodeRef}
			type="button"
			disabled={!interactive}
			data-slot="list-handle"
			aria-label={ariaLabel}
			className={cn(k.handle, className)}
			{...attributes}
			{...listeners}
		>
			{children ?? <Icon icon={<GripVertical />} size="sm" />}
		</button>
	)
}
