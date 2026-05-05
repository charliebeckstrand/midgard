import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { k, statPlaceholder } from './variants'

export type StatLabelProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatLabel({ className, children, ...props }: StatLabelProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(statPlaceholder.label, className)} />
	}

	return (
		<div data-slot="stat-label" className={cn(k.label, className)} {...props}>
			{children}
		</div>
	)
}
