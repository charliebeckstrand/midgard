'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
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
	/** Reveal the absolute time in a tooltip on hover/focus. Defaults to `false`. */
	absolute?: boolean
}

/** Self-refreshing relative timestamp rendered in a `<time>` element. Formats via `Intl.RelativeTimeFormat`, falls back to a plain `<span>` for invalid dates, and steps its refresh `interval` coarser as the value ages. */
export function TimeAgo({
	date,
	format,
	locale,
	interval = 'auto',
	absolute = false,
	className,
	...props
}: TimeAgoProps) {
	const { then, valid, text } = useTimeAgoRelativeTime({ date, format, locale, interval })

	// An invalid date has no machine-readable timestamp; renders a plain <span>
	// rather than an empty <time> with no dateTime.
	if (!valid) return <span data-slot="time-ago" className={className} {...props} />

	const time = (
		<time
			data-slot="time-ago"
			dateTime={then.toISOString()}
			className={cn('inline-flex w-fit shrink-0', className)}
			{...props}
		>
			{text}
		</time>
	)

	if (absolute) {
		return (
			<Tooltip>
				<TooltipTrigger>{time}</TooltipTrigger>
				<TooltipContent>{then.toLocaleString(locale)}</TooltipContent>
			</Tooltip>
		)
	}

	return time
}
