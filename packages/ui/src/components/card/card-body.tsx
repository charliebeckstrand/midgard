import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { sun } from '../../recipes/ryu/sun'
import { useConcentric } from '../concentric'

export type CardBodyProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardBody({ className, children, ...props }: CardBodyProps) {
	const size = useConcentric()?.size ?? 'md'

	return (
		<div data-slot="card-body" className={cn(`p-${sun[size].space}`, className)} {...props}>
			{children}
		</div>
	)
}
