import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type StatValueVariants, statValuePlaceholder, statValueVariants } from './variants'

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
