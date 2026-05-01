import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ji } from '../../recipes/ji'
import { sun } from '../../recipes/ryu/sun'
import { useConcentric } from '../concentric'

export type CardTitleProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'h3'>, 'className'>

export function CardTitle({ className, children, ...props }: CardTitleProps) {
	const size = useConcentric()?.size ?? 'md'

	return (
		<h3
			data-slot="card-title"
			className={cn('font-semibold', ji.size[sun[size].text], className)}
			{...props}
		>
			{children}
		</h3>
	)
}
