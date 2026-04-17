'use client'

import type React from 'react'
import { cn } from '../../core'
import { gridDividerVariants } from './variants'

export type GridDividerProps = {
	soft?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'hr'>, 'className'>

export function GridDivider({ soft, className, ...props }: GridDividerProps) {
	return (
		<hr
			data-slot="grid-divider"
			className={cn(gridDividerVariants({ soft }), className)}
			{...props}
		/>
	)
}
