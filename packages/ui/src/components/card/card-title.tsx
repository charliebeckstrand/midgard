'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/concentric'
import { type JiSize, ji } from '../../recipes/ryu/ji'
import type { Step } from '../../recipes/ryu/sun'
import { Heading } from '../heading'
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
	const resolvedSize = useResolvedSize(size)

	return (
		<Heading
			level={3}
			data-slot="card-title"
			className={cn('font-semibold', ji.size[titleText[resolvedSize]], className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
