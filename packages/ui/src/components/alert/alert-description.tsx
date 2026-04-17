'use client'

import { cn } from '../../core'
import { k } from './variants'

export type AlertDescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function AlertDescription({ className, children, ...props }: AlertDescriptionProps) {
	return (
		<div className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
