'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useTimeAgoRelativeTime } from './use-time-ago-relative-time'

/** Props for {@link TimeAgo}: the `date` to age plus `format`/`locale`/`interval` overrides over the `<time>` surface. */
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
}

/**
 * Self-refreshing relative timestamp rendered in a `<time>` element. Formats via
 * `Intl.RelativeTimeFormat`, falls back to a plain `<span>` for invalid dates, and
 * steps its refresh `interval` coarser as the value ages. To reveal the absolute
 * time on hover, wrap it in a `<Tooltip>` with a `<TooltipContent>` of your own.
 *
 * @remarks
 * Client-only clock: the first render on both server and client emits an empty
 * `<time>` (no relative text), then the text appears after mount and refreshes on
 * the resolved interval. This keeps hydration deterministic and the markup
 * timezone-stable; lay out for the eventual text to avoid a shift on hydrate.
 */
export function TimeAgo({
	date,
	format,
	locale,
	interval = 'auto',
	className,
	...props
}: TimeAgoProps) {
	const { then, valid, text } = useTimeAgoRelativeTime({ date, format, locale, interval })

	// An invalid date has no machine-readable timestamp; renders a plain <span>
	// rather than an empty <time> with no dateTime.
	if (!valid) return <span data-slot="time-ago" className={className} {...props} />

	return (
		<time
			data-slot="time-ago"
			dateTime={then.toISOString()}
			className={cn('inline-flex w-fit shrink-0', className)}
			{...props}
		>
			{text}
		</time>
	)
}
