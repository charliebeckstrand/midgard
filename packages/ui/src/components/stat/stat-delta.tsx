'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k, type StatDeltaVariants } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(k.skeleton.delta, className)} />
	}

	return (
		<div data-slot="stat-delta" className={cn(k.delta({ trend }), className)} {...props}>
			{children}
		</div>
	)
}
