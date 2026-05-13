'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './tooltip'

export type TooltipTriggerProps = {
	children: ReactNode
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
	const { setReference, getReferenceProps } = useTooltipContext()

	return (
		<div
			ref={setReference}
			data-slot="tooltip-trigger"
			className={k.trigger}
			{...(getReferenceProps() as HTMLAttributes<HTMLDivElement>)}
		>
			{children}
		</div>
	)
}
