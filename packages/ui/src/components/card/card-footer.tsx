'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes/ryu/sun'

export type CardFooterProps = SlotProps<'div'>

const padding: Record<Step, string> = {
	sm: 'px-sm pb-sm pt-0',
	md: 'px-md pb-md pt-0',
	lg: 'px-lg pb-lg pt-0',
}

const gap: Record<Step, string> = {
	sm: 'gap-1',
	md: 'gap-2',
	lg: 'gap-3',
}

export function CardFooter({ className, ...props }: CardFooterProps) {
	const { density } = useDensity()

	return (
		<div
			data-slot="card-footer"
			className={cn(padding[density], 'flex items-center', gap[density], className)}
			{...props}
		/>
	)
}
