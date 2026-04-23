import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type StatDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDescription({ className, children, ...props }: StatDescriptionProps) {
	return (
		<div data-slot="stat-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
