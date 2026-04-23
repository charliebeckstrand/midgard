import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type AlertDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function AlertDescription({ className, children, ...props }: AlertDescriptionProps) {
	return (
		<div data-slot="alert-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
