'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'

export type CardHeaderProps = SlotProps<'div'>

const padding: Record<Step, string> = {
	sm: 'px-sm pt-sm pb-0',
	md: 'px-md pt-md pb-0',
	lg: 'px-lg pt-lg pb-0',
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
	const { density } = useDensity()

	return (
		<div data-slot="card-header" className={cn(padding[density], k.header, className)} {...props} />
	)
}
