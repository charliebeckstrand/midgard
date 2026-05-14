'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useConcentric } from '../../primitives'
import { k } from '../../recipes/kata/fieldset'

export type LegendProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'legend'>, 'className'>

export function Legend({ className, ...props }: LegendProps) {
	const concentric = useConcentric()

	return (
		<legend
			data-slot="legend"
			className={cn(k.legend({ size: concentric?.size }), className)}
			{...props}
		/>
	)
}
