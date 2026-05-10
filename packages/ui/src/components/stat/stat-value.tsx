import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import {
	type StatValueVariants,
	statValuePlaceholder,
	statValueVariants,
} from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type StatValueProps = StatValueVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatValue({ size, className, children, ...props }: StatValueProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(statValuePlaceholder({ size }), className)} />
	}

	return (
		<div data-slot="stat-value" className={cn(statValueVariants({ size }), className)} {...props}>
			{children}
		</div>
	)
}
