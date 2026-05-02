import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { iro } from '../../recipes/ryu/iro'

export type CardHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
	return (
		<div
			data-slot="card-header"
			className={cn('px-(--ui-padding) pt-(--ui-padding) pb-0', iro.text.default, className)}
			{...props}
		>
			{children}
		</div>
	)
}
