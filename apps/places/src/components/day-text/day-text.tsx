'use client'

import { DateTime } from 'ui/date-time'
import { DAY_FORMAT } from '../../utilities/places-filter'
import { useDayText } from './context'

/**
 * A stored day in a `<time>`, such as `Oct 4, 2026` (see {@link useDayText}).
 * A day with no text yet shows the skeleton of a `DateTime` until hydration.
 */
export function DayText({ value }: { value: string }) {
	const text = useDayText().day(value)

	if (text === undefined) return <DateTime value={value} format={DAY_FORMAT} />

	return <time dateTime={value}>{text}</time>
}
