'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Heading } from '../heading'
export type CardTitleProps = {
	className?: string
	size?: Step
	/** Heading level, so the card title fits the document outline. @default 3 */
	level?: 1 | 2 | 3 | 4 | 5 | 6
} & Omit<ComponentPropsWithoutRef<'h3'>, 'className'>

export function CardTitle({ className, size, level = 3, children, ...props }: CardTitleProps) {
	const inherited = useDensity()

	const resolvedSize: Step = size ?? inherited.size

	return (
		<Heading
			level={level}
			data-slot="card-title"
			className={cn(k.title({ size: resolvedSize }), className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
