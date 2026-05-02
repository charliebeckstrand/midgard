import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

export type CardBodyProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardBody({ className, children, ...props }: CardBodyProps) {
	return (
		<div data-slot="card-body" className={cn('p-(--ui-padding)', className)} {...props}>
			{children}
		</div>
	)
}
