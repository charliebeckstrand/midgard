'use client'

import { type ComponentPropsWithoutRef, useEffect, useState } from 'react'

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

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

export type TimeAgoProps = Omit<
	ComponentPropsWithoutRef<'time'>,
	'dateTime' | 'children' | 'title'
> & {
	date: Date | string | number
	/** Override the default `Intl.RelativeTimeFormat` output. */
	format?: (diffMs: number, now: Date, then: Date) => string
	/** Locale for the default formatter. */
	locale?: string
	/** Refresh cadence in ms, or `'auto'` to step coarser as the timestamp ages. */
	interval?: number | 'auto'
	/** `true` (default) shows the absolute time as a `title`; pass a string to override; `false` to omit. */
	title?: boolean | string
}

export function TimeAgo({
	date,
	format,
	locale,
	interval = 'auto',
	title = true,
	...props
}: TimeAgoProps) {
	const [now, setNow] = useState(() => new Date())

	const then = date instanceof Date ? date : new Date(date)

	const diffMs = then.getTime() - now.getTime()

	const absMs = Math.abs(diffMs)

	const adaptiveMs = interval === 'auto' ? adaptiveInterval(absMs) : interval

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), adaptiveMs)

		return () => window.clearInterval(id)
	}, [adaptiveMs])

	let text: string

	if (format) {
		text = format(diffMs, now, then)
	} else {
		const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

		const { unit, value } = pickUnit(absMs)

		text = formatter.format(Math.round(diffMs > 0 ? value : -value), unit)
	}

	const dateTime = Number.isNaN(then.getTime()) ? undefined : then.toISOString()

	const resolvedTitle =
		title === true ? then.toLocaleString(locale) : title === false ? undefined : title

	return (
		<time data-slot="time-ago" dateTime={dateTime} title={resolvedTitle} {...props}>
			{text}
		</time>
	)
}
