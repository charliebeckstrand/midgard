'use client'

import { Odometer } from 'ui/odometer'
import { useIntl } from 'ui/primitives/intl'
import { percentText } from '../../utilities/race-math'

/** Props for {@link PercentOdometer}. */
export type PercentOdometerProps = {
	/** The share, from 0 to 100. */
	value: number
	/** The digits after the decimal point. */
	digits: number
	className?: string
}

/**
 * A share as text in the locale of the app (`en`), such as `59.0%`. When the
 * share changes, the number rolls to the new share. Under reduced motion, it
 * goes to the new share with no roll.
 */
export function PercentOdometer({ value, digits, className }: PercentOdometerProps) {
	const intl = useIntl()

	return (
		<Odometer
			value={value}
			format={(next) => percentText(intl.formatNumber, next, digits)}
			className={className}
		/>
	)
}
