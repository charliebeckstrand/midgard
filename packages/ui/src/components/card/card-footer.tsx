import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type CardFooterProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardFooter({ className, children, ...props }: CardFooterProps) {
	return (
		<div data-slot="card-footer" className={cn(k.footer, className)} {...props}>
			{children}
		</div>
	)
}
