import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

export type CardFooterProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardFooter({ className, children, ...props }: CardFooterProps) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				'px-(--ui-padding) pb-(--ui-padding) pt-0',
				'flex items-center',
				'gap-(--ui-gap)',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}
