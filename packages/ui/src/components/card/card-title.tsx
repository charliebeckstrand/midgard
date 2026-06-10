'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import { titleSize } from '../../recipes/kata/heading'
import { Heading } from '../heading'
export type CardTitleProps = {
	className?: string
	size?: Step
	/** Heading level of the rendered title. @default 3 */
	level?: 1 | 2 | 3 | 4 | 5 | 6
} & Omit<ComponentPropsWithoutRef<'h3'>, 'className'>

export function CardTitle({ className, size, level = 3, children, ...props }: CardTitleProps) {
	const inherited = useDensity()

	const step: Step = size ?? inherited.size

	return (
		<Heading
			level={level}
			data-slot="card-title"
			className={cn(titleSize(step), className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
