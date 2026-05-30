'use client'

import { useEffect, useState } from 'react'
import { DAY, HOUR, MIN, MONTH, SEC, WEEK, YEAR } from './time-ago-constants'

type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

function pickUnit(absMs: number): { unit: Unit; value: number } {
	if (absMs < MIN) return { unit: 'second', value: absMs / SEC }

	if (absMs < HOUR) return { unit: 'minute', value: absMs / MIN }

	if (absMs < DAY) return { unit: 'hour', value: absMs / HOUR }

	if (absMs < WEEK) return { unit: 'day', value: absMs / DAY }

	if (absMs < MONTH) return { unit: 'week', value: absMs / WEEK }

	if (absMs < YEAR) return { unit: 'month', value: absMs / MONTH }

	return { unit: 'year', value: absMs / YEAR }
}

function adaptiveInterval(absMs: number) {
	if (absMs < MIN) return 5 * SEC

	if (absMs < HOUR) return 30 * SEC

	if (absMs < DAY) return MIN

	if (absMs < WEEK) return HOUR

	return DAY
}

type UseRelativeTimeOptions = {
	date: Date | string | number
	/** Override the default `Intl.RelativeTimeFormat` output. */
	format?: (diffMs: number, now: Date, then: Date) => string
	/** Locale for the default formatter. */
	locale?: string
	/** Refresh cadence in ms, or `'auto'` to step coarser as the timestamp ages. */
	interval?: number | 'auto'
}

type UseRelativeTimeResult = {
	then: Date
	valid: boolean
	text: string
}

export function useTimeAgoRelativeTime({
	date,
	format,
	locale,
	interval = 'auto',
}: UseRelativeTimeOptions): UseRelativeTimeResult {
	const [now, setNow] = useState(() => new Date())

	const then = date instanceof Date ? date : new Date(date)

	const valid = !Number.isNaN(then.getTime())

	const diffMs = valid ? then.getTime() - now.getTime() : 0

	const absMs = Math.abs(diffMs)

	const adaptiveMs = interval === 'auto' ? adaptiveInterval(absMs) : interval

	useEffect(() => {
		if (!valid) return

		const id = window.setInterval(() => setNow(new Date()), adaptiveMs)

		return () => window.clearInterval(id)
	}, [adaptiveMs, valid])

	if (!valid) return { then, valid, text: '' }

	let text: string

	if (format) {
		text = format(diffMs, now, then)
	} else {
		const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

		const { unit, value } = pickUnit(absMs)

		text = formatter.format(Math.round(diffMs > 0 ? value : -value), unit)
	}

	return { then, valid, text }
}
