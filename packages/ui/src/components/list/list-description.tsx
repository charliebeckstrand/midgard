import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/list'

// ── ListDescription ────────────────────────────────────

export type ListDescriptionProps = {
	children?: ReactNode
	className?: string
}

export function ListDescription({ children, className }: ListDescriptionProps) {
	return (
		<span data-slot="list-description" className={cn(k.description, className)}>
			{children}
		</span>
	)
}
