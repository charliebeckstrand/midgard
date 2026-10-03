'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useLocale } from '../../providers/locale'
import { integerFormat } from '../../utilities'
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
	 * @defaultValue rounds to an integer and applies the grouping of the `<LocaleProvider>` locale
	 */
	format?: (value: number) => string
	className?: string
} & Omit<ComponentProps<'span'>, 'className' | 'children'>

/**
 * Numeric readout that tweens between values over `duration`; assistive tech
 * reads only the settled target, as text.
 *
 * @remarks
 * Client-only (`'use client'`): the tween runs in an effect, so server and first
 * client render show the raw `value` and animation begins after mount. The
 * tweened digits are `aria-hidden`, and a visually hidden copy holds the settled
 * target, so assistive tech reads the final figure as text, not every frame.
 * The root takes no role and is never a live region, and a consumer `role` does
 * not change that. The root has no role, so ARIA does not let it take an
 * `aria-label`: put a label in the text around the readout.
 * Honors reduced motion by snapping (see {@link useOdometerAnimatedValue}).
 * @see {@link useOdometerAnimatedValue}
 */
export function Odometer({
	value,
	duration = 800,
	format,
	className,
	// Dropped, so a consumer role cannot make the root a live region.
	role: _role,
	...props
}: OdometerProps) {
	const display = useOdometerAnimatedValue({ value, duration })

	const { locale } = useLocale()

	const integer = integerFormat(locale)

	// `|| 0` turns a negative zero into zero, so a value such as -0.3 prints `0`, not `-0`.
	const resolvedFormat = format ?? ((next: number) => integer(Math.round(next) || 0))

	return (
		// The settled target is text in a visually hidden copy, not a live region;
		// a live region announces each intermediate tween value.
		<span data-slot="odometer" className={cn('tabular-nums', className)} {...props}>
			<span data-slot="odometer-display" aria-hidden="true">
				{resolvedFormat(display)}
			</span>
			<span data-slot="odometer-value" className="sr-only">
				{resolvedFormat(value)}
			</span>
		</span>
	)
}
