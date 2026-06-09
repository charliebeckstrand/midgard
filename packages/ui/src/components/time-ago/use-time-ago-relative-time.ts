'use client'

import { useEffect, useMemo, useState } from 'react'
import { DAY, HOUR, MIN, MONTH, SEC, WEEK, YEAR } from './time-ago-constants'

type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

// `Intl.RelativeTimeFormat` construction is expensive. One instance is cached per locale.
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>()

function getRelativeTimeFormat(locale: string | undefined) {
	const key = locale ?? ''

	let formatter = relativeTimeFormatCache.get(key)

	if (formatter === undefined) {
		formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

		relativeTimeFormatCache.set(key, formatter)
	}

	return formatter
}

// Each unit's rollover is the rounded magnitude at which it becomes the next
// unit up. Bucketing on the *rounded* value (not the raw lower edge) keeps a
// value that rounds up from announcing "60 seconds"/"24 hours"/"7 days" ago.
const UNIT_STEPS: readonly { unit: Unit; ms: number; rollover: number }[] = [
	{ unit: 'second', ms: SEC, rollover: 60 },
	{ unit: 'minute', ms: MIN, rollover: 60 },
	{ unit: 'hour', ms: HOUR, rollover: 24 },
	{ unit: 'day', ms: DAY, rollover: 7 },
	{ unit: 'week', ms: WEEK, rollover: Math.round(MONTH / WEEK) },
	{ unit: 'month', ms: MONTH, rollover: 12 },
	{ unit: 'year', ms: YEAR, rollover: Number.POSITIVE_INFINITY },
]

function pickUnit(absMs: number): { unit: Unit; value: number } {
	for (const { unit, ms, rollover } of UNIT_STEPS) {
		const value = absMs / ms

		if (Math.round(value) < rollover) return { unit, value }
	}

	// Unreachable: the year step's rollover is Infinity, so the loop always
	// returns. Kept as an explicit fallback for the type checker.
	return { unit: 'year', value: absMs / YEAR }
}

function adaptiveInterval(absMs: number) {
	if (absMs < MIN) return 5 * SEC

	if (absMs < HOUR) return 30 * SEC

	if (absMs < DAY) return MIN

	if (absMs < WEEK) return HOUR

	return DAY
}

// Floor for an explicit numeric interval: `setInterval(fn, 0)` otherwise fires
// continuously, and relative text never needs sub-quarter-second refresh.
const MIN_REFRESH_MS = 250

type RelativeTimeOptions = {
	date: Date | string | number
	/** Override the default `Intl.RelativeTimeFormat` output. */
	format?: (diffMs: number, now: Date, then: Date) => string
	/** Locale for the default formatter. */
	locale?: string
	/** Refresh cadence in ms, or `'auto'` to step coarser as the timestamp ages. */
	interval?: number | 'auto'
}

type RelativeTimeResult = {
	then: Date
	valid: boolean
	text: string
}

export function useTimeAgoRelativeTime({
	date,
	format,
	locale,
	interval = 'auto',
}: RelativeTimeOptions): RelativeTimeResult {
	// Client-only clock: null until mount, so the first render (server and client)
	// produces no relative text, avoiding hydration mismatches at unit boundaries.
	const [now, setNow] = useState<Date | null>(null)

	const then = useMemo(() => (date instanceof Date ? date : new Date(date)), [date])

	const valid = !Number.isNaN(then.getTime())

	const diffMs = valid && now ? then.getTime() - now.getTime() : 0

	const absMs = Math.abs(diffMs)

	const adaptiveMs =
		interval === 'auto' ? adaptiveInterval(absMs) : Math.max(interval, MIN_REFRESH_MS)

	useEffect(() => {
		if (!valid) return

		// Establishes the clock after mount, then refreshes on the computed interval.
		setNow(new Date())

		const id = window.setInterval(() => setNow(new Date()), adaptiveMs)

		return () => window.clearInterval(id)
	}, [adaptiveMs, valid])

	if (!valid || now === null) return { then, valid, text: '' }

	let text: string

	if (format) {
		text = format(diffMs, now, then)
	} else {
		const formatter = getRelativeTimeFormat(locale)

		const { unit, value } = pickUnit(absMs)

		text = formatter.format(Math.round(diffMs > 0 ? value : -value), unit)
	}

	return { then, valid, text }
}
