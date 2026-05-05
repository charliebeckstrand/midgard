import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { k, statPlaceholder } from './variants'

export type StatDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDescription({ className, children, ...props }: StatDescriptionProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(statPlaceholder.description, className)} />
	}

	return (
		<div data-slot="stat-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
