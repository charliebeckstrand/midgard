'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'

export type LegendProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'legend'>, 'className'>

export function Legend({ className, ...props }: LegendProps) {
	const { size } = useDensity()

	return <legend data-slot="legend" className={cn(k.legend({ size }), className)} {...props} />
}
