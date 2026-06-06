'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { formatInteger } from '../../utilities'
import { useOdometerAnimatedValue } from './use-odometer-animated-value'

export type OdometerProps = {
	value: number
	duration?: number
	format?: (value: number) => string
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'children'>

function defaultFormat(value: number) {
	return formatInteger(Math.round(value))
}

/** Numeric readout that tweens between values over `duration` — announces only the settled target via `aria-label`. */
export function Odometer({
	value,
	duration = 800,
	format = defaultFormat,
	className,
	...props
}: OdometerProps) {
	const display = useOdometerAnimatedValue({ value, duration })

	return (
		// The visible digits tween every frame, so expose the settled target as an
		// aria-label instead of announcing each intermediate value via a live region.
		<span
			data-slot="odometer"
			role="img"
			aria-label={format(value)}
			className={cn('tabular-nums', className)}
			{...props}
		>
			{format(display)}
		</span>
	)
}
