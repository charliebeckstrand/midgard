'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/card'

export type CardBodyProps = SlotProps<'div'>

export function CardBody({ className, ...props }: CardBodyProps) {
	const { density } = useDensity()

	return <div data-slot="card-body" className={cn(k.bodyPadding[density], className)} {...props} />
}
