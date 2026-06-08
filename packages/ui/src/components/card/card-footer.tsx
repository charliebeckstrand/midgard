'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'

export type CardFooterProps = SlotProps<'div'>

const padding: Record<Step, string> = {
	sm: 'px-2 pb-2 pt-0',
	md: 'px-3 pb-3 pt-0',
	lg: 'px-4 pb-4 pt-0',
}

const gap: Record<Step, string> = {
	sm: 'gap-1',
	md: 'gap-2',
	lg: 'gap-3',
}

export function CardFooter({ className, ...props }: CardFooterProps) {
	const { space } = useDensity()

	return (
		<div
			data-slot="card-footer"
			className={cn(padding[space], 'flex items-center', gap[space], className)}
			{...props}
		/>
	)
}
