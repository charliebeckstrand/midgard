'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useRelativeTime } from './use-relative-time'

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
	const { then, isValid, text } = useRelativeTime({ date, format, locale, interval })

	if (!isValid) return <time data-slot="time-ago" {...props} />

	const resolvedTitle =
		title === true ? then.toLocaleString(locale) : title === false ? undefined : title

	return (
		<time data-slot="time-ago" dateTime={then.toISOString()} title={resolvedTitle} {...props}>
			{text}
		</time>
	)
}
