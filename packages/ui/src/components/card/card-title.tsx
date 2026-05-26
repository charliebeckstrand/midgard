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
} & Omit<ComponentPropsWithoutRef<'h3'>, 'className'>

export function CardTitle({ className, size, children, ...props }: CardTitleProps) {
	const inherited = useDensity()

	const resolvedSize: Step = size ?? inherited.size

	return (
		<Heading
			level={3}
			data-slot="card-title"
			className={cn(k.title({ size: resolvedSize }), className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
