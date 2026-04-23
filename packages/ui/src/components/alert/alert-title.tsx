import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type AlertTitleProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function AlertTitle({ className, children, ...props }: AlertTitleProps) {
	return (
		<div data-slot="alert-title" className={cn(k.title, className)} {...props}>
			{children}
		</div>
	)
}
