'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './tooltip'

export type TooltipTriggerProps = {
	children: ReactNode
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
	const { setReference, getReferenceProps, enabled, className } = useTooltipContext()

	return (
		<div
			ref={setReference}
			data-slot="tooltip-trigger"
			className={cn(k.trigger, enabled && k.triggerEnabled, className)}
			{...(getReferenceProps() as HTMLAttributes<HTMLDivElement>)}
		>
			{children}
		</div>
	)
}
