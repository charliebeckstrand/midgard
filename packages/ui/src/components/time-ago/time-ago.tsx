'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useTimeAgoRelativeTime } from './use-time-ago-relative-time'

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

/** Self-refreshing relative timestamp rendered in a `<time>` element — formats via `Intl.RelativeTimeFormat`, falls back to a plain `<span>` for invalid dates, and steps its refresh `interval` coarser as the value ages. */
export function TimeAgo({
	date,
	format,
	locale,
	interval = 'auto',
	title = true,
	...props
}: TimeAgoProps) {
	const { then, valid, text } = useTimeAgoRelativeTime({ date, format, locale, interval })

	// An invalid date has no machine-readable timestamp, so render a plain
	// <span> rather than an empty <time> with no dateTime.
	if (!valid) return <span data-slot="time-ago" {...props} />

	const resolvedTitle =
		title === true ? then.toLocaleString(locale) : title === false ? undefined : title

	return (
		<time data-slot="time-ago" dateTime={then.toISOString()} title={resolvedTitle} {...props}>
			{text}
		</time>
	)
}
