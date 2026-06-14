'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { formatInteger } from '../../utilities'
import { useOdometerAnimatedValue } from './use-odometer-animated-value'

/** Props for {@link Odometer}: the target `value`, tween `duration`, and a display `format`, plus native `<span>` attributes. */
export type OdometerProps = {
	value: number
	/**
	 * Tween length in milliseconds.
	 * @defaultValue 800
	 */
	duration?: number
	/**
	 * Formats the numeric value for display.
	 * @defaultValue rounds to an integer and applies locale grouping
	 */
	format?: (value: number) => string
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'children'>

function defaultFormat(value: number) {
	return formatInteger(Math.round(value))
}

/**
 * Numeric readout that tweens between values over `duration`; announces only the
 * settled target via `aria-label`.
 *
 * @remarks
 * Client-only (`'use client'`): the tween runs in an effect, so server and first
 * client render show the raw `value` and animation begins after mount. Exposed as
 * `role="img"` with the settled target as `aria-label`, never a live region, so
 * assistive tech hears the final figure rather than every intermediate frame.
 * Honors reduced motion by snapping (see {@link useOdometerAnimatedValue}).
 * @see {@link useOdometerAnimatedValue}
 */
export function Odometer({
	value,
	duration = 800,
	format = defaultFormat,
	className,
	...props
}: OdometerProps) {
	const display = useOdometerAnimatedValue({ value, duration })

	return (
		// Exposes the settled target as `aria-label` rather than a live region;
		// a live region announces each intermediate tween value.
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
