import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type CardHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
	return (
		<div data-slot="card-header" className={cn(k.header, className)} {...props}>
			{children}
		</div>
	)
}
