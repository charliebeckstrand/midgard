import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { iro } from '../../recipes/iro'
import { ji } from '../../recipes/ji'

export type CardDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className'>

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
	return (
		<p
			data-slot="card-description"
			className={cn(ji.size.sm, iro.text.muted, className)}
			{...props}
		>
			{children}
		</p>
	)
}
