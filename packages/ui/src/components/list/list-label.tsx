import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from './variants'

// ── ListLabel ──────────────────────────────────────────

export type ListLabelProps = {
	children?: ReactNode
	className?: string
}

export function ListLabel({ children, className }: ListLabelProps) {
	return (
		<span data-slot="list-label" className={cn(k.label, className)}>
			{children}
		</span>
	)
}
