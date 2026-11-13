'use client'

import { DateTime } from 'ui/date-time'
import { DAY_FORMAT } from '../../utilities/places-filter'
import { useDayTexts } from './context'

/**
 * A stored day in a `<time>`, such as `Oct 4, 2026`. A day that the page read
 * shows the text of the server (see `dayTexts`). Another day shows the
 * skeleton of a `DateTime` until hydration.
 */
export function DayText({ value }: { value: string }) {
	return <DateTime value={useDayTexts()[value] ?? value} format={DAY_FORMAT} />
}
