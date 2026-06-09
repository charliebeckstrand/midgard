'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/card'

export type CardFooterProps = SlotProps<'div'>

export function CardFooter({ className, ...props }: CardFooterProps) {
	const { space } = useDensity()

	return (
		<div
			data-slot="card-footer"
			className={cn(k.footerPadding[space], 'flex items-center', k.footerGap[space], className)}
			{...props}
		/>
	)
}
