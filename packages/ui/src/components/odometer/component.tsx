'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useAnimatedValue } from './use-animated-value'

export type OdometerProps = {
	value: number
	duration?: number
	format?: (value: number) => string
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'children'>

function defaultFormat(value: number) {
	return Math.round(value).toLocaleString()
}

export function Odometer({
	value,
	duration = 800,
	format = defaultFormat,
	className,
	...props
}: OdometerProps) {
	const display = useAnimatedValue({ value, duration })

	return (
		<span
			data-slot="odometer"
			aria-live="polite"
			className={cn('tabular-nums', className)}
			{...props}
		>
			{format(display)}
		</span>
	)
}
