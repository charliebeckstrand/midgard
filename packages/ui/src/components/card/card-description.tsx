import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type CardDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className'>

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
	return (
		<p data-slot="card-description" className={cn(k.description, className)} {...props}>
			{children}
		</p>
	)
}
