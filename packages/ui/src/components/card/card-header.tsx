import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { iro } from '../../recipes/iro'
import { sun } from '../../recipes/ryu/sun'
import { useConcentric } from '../concentric'

export type CardHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
	const size = useConcentric()?.size ?? 'md'
	const space = sun[size].space

	return (
		<div
			data-slot="card-header"
			className={cn(`px-${space} pt-${space} pb-0`, iro.text.default, className)}
			{...props}
		>
			{children}
		</div>
	)
}
