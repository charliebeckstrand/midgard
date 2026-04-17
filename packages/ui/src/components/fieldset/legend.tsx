'use client'

import { cn } from '../../core'
import { k } from './variants'

export type LegendProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'legend'>, 'className'>

export function Legend({ className, ...props }: LegendProps) {
	return <legend data-slot="legend" className={cn(k.legend, className)} {...props} />
}
