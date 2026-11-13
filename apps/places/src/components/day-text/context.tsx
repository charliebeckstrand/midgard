'use client'

import type { ReactNode } from 'react'
import { createContext } from 'ui/core'
import { useDateFormat } from 'ui/providers/locale'
import { type DayTexts, spanKey } from '../../utilities/day-text'
import { DAY_FORMAT } from '../../utilities/places-filter'

const [DayTextsContext, useDayTexts] = createContext<DayTexts>('DayTexts', { default: {} })

/**
 * Gives the text of each day that the page read on the server (see `dayTexts`)
 * to the dates of the app.
 */
export function DayTextProvider({ texts, children }: { texts: DayTexts; children: ReactNode }) {
	return <DayTextsContext value={texts}>{children}</DayTextsContext>
}

/**
 * The text of a stored day, and of a span of days. A day that the page read on
 * the server keeps the text of the server for the life of the page, so a reload
 * paints it and the browser does not write it again. Another day gets the text
 * of the browser after hydration. Until then, each function gives `undefined`.
 */
export function useDayText(): {
	day: (value: string) => string | undefined
	span: (from: string, to: string) => string | undefined
} {
	const texts = useDayTexts()

	const format = useDateFormat(DAY_FORMAT)

	return {
		day: (value) => texts[value] ?? format?.format(new Date(value)),
		span: (from, to) =>
			texts[spanKey(from, to)] ?? format?.formatRange(new Date(from), new Date(to)),
	}
}
