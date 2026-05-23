'use client'

import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'

export type CardBodyProps = SlotProps<'div'>

const padding: Record<Step, string> = {
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-4',
}

export function CardBody({ className, ...props }: CardBodyProps) {
	const { density } = useDensity()

	return <div data-slot="card-body" className={cn(padding[density], className)} {...props} />
}
