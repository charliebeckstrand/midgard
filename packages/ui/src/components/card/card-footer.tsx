import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { sun } from '../../recipes/ryu/sun'
import { useConcentric } from '../concentric'

export type CardFooterProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardFooter({ className, children, ...props }: CardFooterProps) {
	const size = useConcentric()?.size ?? 'md'
	const step = sun[size]

	return (
		<div
			data-slot="card-footer"
			className={cn(
				`px-${step.space} pb-${step.space} pt-0`,
				'flex items-center',
				`gap-${step.gap}`,
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}
