'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/card'

export type CardHeaderProps = SlotProps<'div'>

export function CardHeader({ className, ...props }: CardHeaderProps) {
	const { space } = useDensity()

	return (
		<div
			data-slot="card-header"
			className={cn(k.headerPadding[space], k.header, className)}
			{...props}
		/>
	)
}
