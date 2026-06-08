'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'

export type CardHeaderProps = SlotProps<'div'>

const padding: Record<Step, string> = {
	sm: 'px-2 pt-2 pb-0',
	md: 'px-3 pt-3 pb-0',
	lg: 'px-4 pt-4 pb-0',
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
	const { space } = useDensity()

	return (
		<div data-slot="card-header" className={cn(padding[space], k.header, className)} {...props} />
	)
}
