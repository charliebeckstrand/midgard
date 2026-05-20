import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

export type GridDividerProps = {
	soft?: boolean
	className?: string
} & Omit<ComponentPropsWithoutRef<'hr'>, 'className'>

export function GridDivider({ soft, className, ...props }: GridDividerProps) {
	return <hr data-slot="grid-divider" className={cn(k.divider({ soft }), className)} {...props} />
}
