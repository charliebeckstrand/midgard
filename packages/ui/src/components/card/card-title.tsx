import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type JiSize, ji } from '../../recipes/ryu/ji'
import type { Step } from '../../recipes/ryu/sun'
import { useConcentric } from '../concentric'

export type CardTitleProps = {
	className?: string
	size?: Step
} & Omit<ComponentPropsWithoutRef<'h3'>, 'className'>

const titleText: Record<Step, JiSize> = {
	sm: 'md',
	md: 'lg',
	lg: 'xl',
}

export function CardTitle({ className, size, children, ...props }: CardTitleProps) {
	const concentric = useConcentric()
	const resolvedSize = size ?? concentric?.size ?? 'md'

	return (
		<h3
			data-slot="card-title"
			className={cn('font-semibold', ji.size[titleText[resolvedSize]], className)}
			{...props}
		>
			{children}
		</h3>
	)
}
